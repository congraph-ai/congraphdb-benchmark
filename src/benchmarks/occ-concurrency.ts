import { Database, Connection } from 'congraphdb';
import { DataScale, DATA_SCALES } from '../types.js';
import { unwrap, unwrapAsync } from '../utils/napi-helpers.js';

/**
 * OCC Concurrency Benchmark
 *
 * Tests Optimistic Concurrency Control performance under various contention scenarios.
 */
export class OccConcurrencyBenchmark {
  private db?: Database;
  private conn?: Connection;

  constructor(
    private scale: DataScale = 'medium',
    private workerCount: number = 10
  ) {}

  /**
   * Run the OCC concurrency benchmark
   */
  async run(): Promise<OccResult> {
    console.log('\n  🔄 OCC Concurrency Benchmark');
    console.log('  ' + '='.repeat(50));
    console.log(`  Scale: ${this.scale.toUpperCase()}`);
    console.log(`  Workers: ${this.workerCount}`);

    const dbPath = `./benchmark-occ-${Date.now()}.cgraph`;

    // Initialize database
    this.db = new Database(dbPath);
    unwrap(this.db.init(), 'Failed to initialize database');
    this.conn = unwrap(this.db.createConnection(), 'Failed to create connection');

    // Create schema
    await this.setupSchema();

    // Initialize test data
    const nodeCount = DATA_SCALES[this.scale].nodes;
    await this.initializeTestData(nodeCount);

    // Run benchmarks
    const lowContention = await this.benchmarkLowContention();
    const highContention = await this.benchmarkHighContention();
    const readOnly = await this.benchmarkReadOnly();
    const stats = await this.benchmarkStatistics();

    // Cleanup
    this.conn = undefined;
    this.db?.close();
    this.db = undefined;
    this.cleanupTestFile(dbPath);

    return {
      scale: this.scale,
      workerCount: this.workerCount,
      lowContention,
      highContention,
      readOnly,
      statistics: stats
    };
  }

  /**
   * Setup database schema
   */
  private async setupSchema(): Promise<void> {
    if (!this.conn) throw new Error('Not connected');

    await unwrapAsync(this.conn.query(`
      CREATE NODE TABLE Account(
        id STRING,
        balance FLOAT,
        version INT64,
        PRIMARY KEY(id)
      )
    `), 'Failed to create Account table');
  }

  /**
   * Initialize test data
   */
  private async initializeTestData(count: number): Promise<void> {
    if (!this.conn) throw new Error('Not connected');

    console.log(`  📊 Initializing ${count} accounts...`);

    const batchSize = 1000;
    for (let i = 0; i < count; i += batchSize) {
      const batch = Math.min(batchSize, count - i);
      for (let j = 0; j < batch; j++) {
        const id = `acc_${i + j}`;
        await unwrapAsync(this.conn!.query(`
          CREATE (:Account {id: '${id}', balance: 1000.0, version: 0})
        `), `Failed to create account ${id}`);
      }
    }

    console.log('  ✓ Accounts initialized');
  }

  /**
   * Benchmark low contention scenario
   * Many writers, disjoint data
   */
  private async benchmarkLowContention(): Promise<OccScenarioResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Testing low contention (disjoint writes)...');

    const transactionsPerWorker = 100;
    const startTime = performance.now();

    const workers = Array.from({ length: this.workerCount }, (_, workerId) =>
      this.runWorker(async () => {
        const conn = unwrap(this.db!.createConnection(), 'Worker failed to create connection');

        for (let i = 0; i < transactionsPerWorker; i++) {
          const nodeId = `acc_${workerId * transactionsPerWorker + i}`;

          conn.beginTransaction();
          try {
            await unwrapAsync(conn.query(`
              MATCH (a:Account {id: '${nodeId}'})
              SET a.balance = a.balance + 10
            `), `Worker failed to update account ${nodeId}`);
            unwrap(conn.commitWithOccSync(5), `Worker failed to commit transaction for ${nodeId}`);
          } catch (e) {
            conn.rollback();
          }
        }
      })
    );

    await Promise.all(workers);
    const elapsed = performance.now() - startTime;

    const totalTransactions = this.workerCount * transactionsPerWorker;
    const stats = unwrap(this.conn.getOccStatistics(), 'Failed to get OCC statistics');

    return {
      totalTransactions,
      successfulTransactions: stats.successfulTransactions,
      failedTransactions: stats.failedTransactions,
      conflictsDetected: stats.validationConflicts,
      totalRetries: stats.totalRetries,
      maxRetryCount: stats.maxRetryCount,
      conflictRate: stats.conflictRate,
      throughput: totalTransactions / (elapsed / 1000),
      averageLatencyMs: elapsed / totalTransactions
    };
  }

  /**
   * Benchmark high contention scenario
   * Many writers, same data
   */
  private async benchmarkHighContention(): Promise<OccScenarioResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Testing high contention (same account)...');

    const transactionsPerWorker = 50;
    const hotAccountId = 'hot_account';

    // Create hot account
    await unwrapAsync(this.conn.query(`
      CREATE (:Account {id: '${hotAccountId}', balance: 1000000.0, version: 0})
    `), 'Failed to create hot account');

    // Reset statistics
    unwrap(this.conn.resetOccStatistics(), 'Failed to reset OCC statistics');

    const startTime = performance.now();

    const workers = Array.from({ length: this.workerCount }, () =>
      this.runWorker(async () => {
        const conn = unwrap(this.db!.createConnection(), 'Worker failed to create connection');

        for (let i = 0; i < transactionsPerWorker; i++) {
          conn.beginTransaction();
          try {
            await unwrapAsync(conn.query(`
              MATCH (a:Account {id: '${hotAccountId}'})
              SET a.balance = a.balance - 1
            `), 'Worker failed to update hot account');
            unwrap(conn.commitWithOccSync(10), 'Worker failed to commit hot account transaction');
          } catch (e) {
            conn.rollback();
          }
        }
      })
    );

    await Promise.all(workers);
    const elapsed = performance.now() - startTime;

    const totalTransactions = this.workerCount * transactionsPerWorker;
    const stats = unwrap(this.conn.getOccStatistics(), 'Failed to get OCC statistics');

    return {
      totalTransactions,
      successfulTransactions: stats.successfulTransactions,
      failedTransactions: stats.failedTransactions,
      conflictsDetected: stats.validationConflicts,
      totalRetries: stats.totalRetries,
      maxRetryCount: stats.maxRetryCount,
      conflictRate: stats.conflictRate,
      throughput: totalTransactions / (elapsed / 1000),
      averageLatencyMs: elapsed / totalTransactions
    };
  }

  /**
   * Benchmark read-only transaction throughput
   */
  private async benchmarkReadOnly(): Promise<ReadOnlyResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Testing read-only throughput...');

    const readsPerWorker = 1000;
    const startTime = performance.now();

    const workers = Array.from({ length: this.workerCount }, () =>
      this.runWorker(async () => {
        const conn = unwrap(this.db!.createConnection(), 'Worker failed to create connection');

        for (let i = 0; i < readsPerWorker; i++) {
          const nodeId = `acc_${i % 1000}`;
          await unwrapAsync(conn.query(`
            MATCH (a:Account {id: '${nodeId}'})
            RETURN a.balance
          `), `Worker failed to read account ${nodeId}`);
        }
      })
    );

    await Promise.all(workers);
    const elapsed = performance.now() - startTime;

    const totalReads = this.workerCount * readsPerWorker;

    return {
      totalReads,
      throughput: totalReads / (elapsed / 1000),
      averageLatencyMs: elapsed / totalReads
    };
  }

  /**
   * Benchmark OCC statistics overhead
   */
  private async benchmarkStatistics(): Promise<StatisticsResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Testing statistics overhead...');

    const iterations = 1000;

    // Without statistics
    const startWithout = performance.now();
    for (let i = 0; i < iterations; i++) {
      await unwrapAsync(this.conn.query(`MATCH (a:Account) RETURN count(*)`), 'Failed to query accounts');
    }
    const withoutStats = performance.now() - startWithout;

    // With statistics (getOccStatistics)
    const startWith = performance.now();
    for (let i = 0; i < iterations; i++) {
      await unwrapAsync(this.conn.query(`MATCH (a:Account) RETURN count(*)`), 'Failed to query accounts');
      unwrap(this.conn.getOccStatistics(), 'Failed to get OCC statistics');
    }
    const withStats = performance.now() - startWith;

    const overhead = withStats - withoutStats;
    const overheadPercent = (overhead / withoutStats) * 100;

    return {
      iterations,
      timeWithoutStatsMs: withoutStats,
      timeWithStatsMs: withStats,
      overheadMs: overhead,
      overheadPercent
    };
  }

  /**
   * Run a worker function
   */
  private async runWorker(fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (e) {
      // Worker errors are logged but don't fail the benchmark
      console.error(`Worker error: ${(e as Error).message}`);
    }
  }

  /**
   * Clean up test database file
   */
  private cleanupTestFile(dbPath: string): void {
    const fs = require('fs');
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      if (fs.existsSync(dbPath + '.wal')) fs.unlinkSync(dbPath + '.wal');
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Create an OCC engine adapter for benchmarking
 */
export class OccEngineAdapter {
  name = 'congraph-occ' as const;
  private db?: Database;
  private conn?: Connection;

  async connect(): Promise<void> {
    this.db = new Database(`./bench-occ-${Date.now()}.cgraph`);
    unwrap(this.db.init(), 'Failed to initialize database');
    this.conn = unwrap(this.db.createConnection(), 'Failed to create connection');
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = undefined;
      this.conn = undefined;
    }
  }

  async clear(): Promise<void> {
    if (!this.conn) throw new Error('Not connected');
    try {
      await unwrapAsync(this.conn.query('MATCH (n) DETACH DELETE n'), 'Failed to clear nodes');
    } catch {
      // Ignore if schema doesn't exist
    }
  }

  async benchmarkConflictRate(workers: number, transactionsPerWorker: number): Promise<number> {
    if (!this.conn) throw new Error('Not connected');

    // Create test account
    await unwrapAsync(this.conn.query(`
      CREATE NODE TABLE Account(id STRING, balance FLOAT, PRIMARY KEY(id))
    `), 'Failed to create Account table');
    await unwrapAsync(this.conn.query(`CREATE (:Account {id: 'hot', balance: 1000})`), 'Failed to create hot account');

    unwrap(this.conn.resetOccStatistics(), 'Failed to reset OCC statistics');

    const tasks = Array.from({ length: workers }, () =>
      this.runTransaction(transactionsPerWorker)
    );

    await Promise.all(tasks);

    const stats = unwrap(this.conn.getOccStatistics(), 'Failed to get OCC statistics');
    return stats.conflictRate;
  }

  private async runTransaction(count: number): Promise<void> {
    const conn = unwrap(this.db!.createConnection(), 'Failed to create connection');

    for (let i = 0; i < count; i++) {
      conn.beginTransaction();
      try {
        await unwrapAsync(conn.query(`MATCH (a:Account {id: 'hot'}) SET a.balance = a.balance + 1`), 'Failed to update hot account');
        unwrap(conn.commitWithOccSync(5), 'Failed to commit transaction');
      } catch (e) {
        conn.rollback();
      }
    }
  }

  getStatistics() {
    if (!this.conn) throw new Error('Not connected');
    return unwrap(this.conn.getOccStatistics(), 'Failed to get OCC statistics');
  }
}

// Result types
export interface OccResult {
  scale: DataScale;
  workerCount: number;
  lowContention: OccScenarioResult;
  highContention: OccScenarioResult;
  readOnly: ReadOnlyResult;
  statistics: StatisticsResult;
}

export interface OccScenarioResult {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  conflictsDetected: number;
  totalRetries: number;
  maxRetryCount: number;
  conflictRate: number;
  throughput: number; // transactions per second
  averageLatencyMs: number;
}

export interface ReadOnlyResult {
  totalReads: number;
  throughput: number; // reads per second
  averageLatencyMs: number;
}

export interface StatisticsResult {
  iterations: number;
  timeWithoutStatsMs: number;
  timeWithStatsMs: number;
  overheadMs: number;
  overheadPercent: number;
}

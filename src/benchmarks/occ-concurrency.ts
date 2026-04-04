import { Database, Connection } from 'congraphdb';
import { DataScale, DATA_SCALES } from '../types.js';

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
    this.db.init();
    this.conn = this.db.createConnection();

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

    await this.conn.query(`
      CREATE NODE TABLE Account(
        id STRING,
        balance FLOAT,
        version INT64,
        PRIMARY KEY(id)
      )
    `);
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
        await this.conn!.query(`
          CREATE (:Account {id: '${id}', balance: 1000.0, version: 0})
        `);
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
        const conn = this.db!.createConnection();

        for (let i = 0; i < transactionsPerWorker; i++) {
          const nodeId = `acc_${workerId * transactionsPerWorker + i}`;

          conn.beginTransaction();
          try {
            await conn.query(`
              MATCH (a:Account {id: '${nodeId}'})
              SET a.balance = a.balance + 10
            `);
            await conn.commitWithOccSync(5);
          } catch (e) {
            conn.rollback();
          }
        }
      })
    );

    await Promise.all(workers);
    const elapsed = performance.now() - startTime;

    const totalTransactions = this.workerCount * transactionsPerWorker;
    const stats = await this.conn.getOccStatistics();

    return {
      totalTransactions,
      successfulTransactions: stats.successful_transactions,
      failedTransactions: stats.failed_transactions,
      conflictsDetected: stats.conflicts_detected,
      totalRetries: stats.total_retries,
      maxRetryCount: stats.max_retry_count,
      conflictRate: stats.conflict_rate,
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
    await this.conn.query(`
      CREATE (:Account {id: '${hotAccountId}', balance: 1000000.0, version: 0})
    `);

    // Reset statistics
    await this.conn.resetOccStatistics();

    const startTime = performance.now();

    const workers = Array.from({ length: this.workerCount }, () =>
      this.runWorker(async () => {
        const conn = this.db!.createConnection();

        for (let i = 0; i < transactionsPerWorker; i++) {
          conn.beginTransaction();
          try {
            await conn.query(`
              MATCH (a:Account {id: '${hotAccountId}'})
              SET a.balance = a.balance - 1
            `);
            await conn.commitWithOccSync(10);
          } catch (e) {
            conn.rollback();
          }
        }
      })
    );

    await Promise.all(workers);
    const elapsed = performance.now() - startTime;

    const totalTransactions = this.workerCount * transactionsPerWorker;
    const stats = await this.conn.getOccStatistics();

    return {
      totalTransactions,
      successfulTransactions: stats.successful_transactions,
      failedTransactions: stats.failed_transactions,
      conflictsDetected: stats.conflicts_detected,
      totalRetries: stats.total_retries,
      maxRetryCount: stats.max_retry_count,
      conflictRate: stats.conflict_rate,
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
        const conn = this.db!.createConnection();

        for (let i = 0; i < readsPerWorker; i++) {
          const nodeId = `acc_${i % 1000}`;
          await conn.query(`
            MATCH (a:Account {id: '${nodeId}'})
            RETURN a.balance
          `);
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
      await this.conn.query(`MATCH (a:Account) RETURN count(*)`);
    }
    const withoutStats = performance.now() - startWithout;

    // With statistics (getOccStatistics)
    const startWith = performance.now();
    for (let i = 0; i < iterations; i++) {
      await this.conn.query(`MATCH (a:Account) RETURN count(*)`);
      await this.conn.getOccStatistics();
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
    this.db.init();
    this.conn = this.db.createConnection();
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
      await this.conn.query('MATCH (n) DETACH DELETE n');
    } catch {
      // Ignore if schema doesn't exist
    }
  }

  async benchmarkConflictRate(workers: number, transactionsPerWorker: number): Promise<number> {
    if (!this.conn) throw new Error('Not connected');

    // Create test account
    await this.conn.query(`
      CREATE NODE TABLE Account(id STRING, balance FLOAT, PRIMARY KEY(id))
    `);
    await this.conn.query(`CREATE (:Account {id: 'hot', balance: 1000})`);

    await this.conn.resetOccStatistics();

    const tasks = Array.from({ length: workers }, () =>
      this.runTransaction(transactionsPerWorker)
    );

    await Promise.all(tasks);

    const stats = await this.conn.getOccStatistics();
    return stats.conflict_rate;
  }

  private async runTransaction(count: number): Promise<void> {
    const conn = this.db!.createConnection();

    for (let i = 0; i < count; i++) {
      conn.beginTransaction();
      try {
        await conn.query(`MATCH (a:Account {id: 'hot'}) SET a.balance = a.balance + 1`);
        await conn.commitWithOccSync(5);
      } catch (e) {
        conn.rollback();
      }
    }
  }

  getStatistics() {
    if (!this.conn) throw new Error('Not connected');
    return this.conn.getOccStatistics();
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

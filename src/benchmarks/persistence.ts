import { Database, Connection } from '@congraph-ai/congraphdb';
import { EngineAdapter, Node, Edge, StorageType, PersistenceResult } from '../types.js';

/**
 * Persistence Benchmark
 *
 * Compares in-memory vs file-based storage performance
 * Tests checkpoint and WAL recovery performance
 */
export class PersistenceBenchmark {
  private db?: Database;
  private conn?: Connection;

  constructor(
    private storageType: StorageType,
    private nodeCount: number = 10000,
    private edgeCount: number = 50000
  ) {}

  /**
   * Run the persistence benchmark
   */
  async run(): Promise<PersistenceResult> {
    console.log('\n  💾 Persistence Benchmark');
    console.log('  ' + '='.repeat(50));
    console.log(`  Storage Mode: ${this.storageType.toUpperCase()}`);

    const dbPath = this.storageType === 'file'
      ? `./benchmark-${Date.now()}.cgraph`
      : ':memory:';

    // Initialize database
    this.db = new Database(dbPath);
    this.db.init();
    this.conn = this.db.createConnection();

    // Create schema
    await this.setupSchema();

    // Benchmark I/O operations
    const ioOverhead = await this.benchmarkIOOverhead();

    // Benchmark checkpoint
    const checkpointTime = await this.benchmarkCheckpoint();

    // Benchmark recovery (only for file-based)
    let recoveryTime = undefined;
    if (this.storageType === 'file') {
      recoveryTime = await this.benchmarkRecovery(dbPath);
    }

    // Cleanup
    this.conn = undefined;
    this.db?.close();
    this.db = undefined;

    // Clean up test file
    if (this.storageType === 'file') {
      this.cleanupTestFile(dbPath);
    }

    return {
      mode: this.storageType,
      ioOverheadPercent: ioOverhead,
      checkpointTimeMs: checkpointTime,
      recoveryTimeMs: recoveryTime,
    };
  }

  /**
   * Setup database schema
   */
  private async setupSchema(): Promise<void> {
    if (!this.conn) throw new Error('Not connected');

    await this.conn.query(`
      CREATE NODE TABLE IF NOT EXISTS Paper(
        id STRING,
        title STRING,
        category STRING,
        year INT64,
        PRIMARY KEY(id)
      )
    `);

    await this.conn.query(`
      CREATE REL TABLE IF NOT EXISTS CITES(FROM Paper TO Paper)
    `);
  }

  /**
   * Benchmark I/O overhead by comparing write performance
   */
  private async benchmarkIOOverhead(): Promise<number> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Measuring I/O overhead...');

    // Batch write test
    const batchSize = 1000;
    const iterations = 10;

    // First, measure in-memory baseline (if we're in file mode, we simulate)
    // For file mode, measure first write (cold) vs subsequent (warm)
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      for (let j = 0; j < batchSize; j++) {
        await this.conn!.query(`
          CREATE (:Paper {
            id: 'io_test_${i}_${j}',
            title: 'IO Test Paper',
            category: 'TEST',
            year: 2024
          })
        `);
      }

      times.push(performance.now() - start);
    }

    // Calculate overhead as (cold_time - warm_avg_time) / cold_avg_time
    const coldTime = times[0];
    const warmAvgTime = times.slice(1).reduce((a, b) => a + b, 0) / (times.length - 1);

    if (this.storageType === 'memory') {
      return 0; // No I/O overhead for in-memory
    }

    const overhead = ((coldTime - warmAvgTime) / coldTime) * 100;
    return Math.max(0, Math.round(overhead * 100) / 100);
  }

  /**
   * Benchmark checkpoint performance
   */
  private async benchmarkCheckpoint(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    console.log('  💾 Testing checkpoint performance...');

    if (this.storageType === 'memory') {
      console.log('  (Skipped for in-memory database)');
      return 0;
    }

    // Write some data first
    await this.writeTestData(1000, 5000);

    // Measure checkpoint time
    const start = performance.now();
    this.db.checkpoint();
    const elapsed = performance.now() - start;

    return Math.round(elapsed);
  }

  /**
   * Benchmark WAL recovery performance
   */
  private async benchmarkRecovery(dbPath: string): Promise<number> {
    console.log('  🔄 Testing WAL recovery performance...');

    // Write some data and ensure it's in WAL
    await this.writeTestData(5000, 20000);

    // Close database
    this.conn = undefined;
    this.db?.close();
    this.db = undefined;

    // Re-open and measure recovery time
    const start = performance.now();
    this.db = new Database(dbPath);
    this.db.init();
    this.conn = this.db.createConnection();
    const recoveryTime = performance.now() - start;

    // Verify data was recovered
    const result = await this.conn!.query('MATCH (p:Paper) RETURN count(*) AS count');
    const rows = result.getAll() as Array<{ count: number }>;
    const count = rows[0]?.count || 0;

    console.log(`  ✓ Recovered ${count} nodes in ${recoveryTime.toFixed(2)}ms`);

    return Math.round(recoveryTime);
  }

  /**
   * Write test data
   */
  private async writeTestData(nodeCount: number, edgeCount: number): Promise<void> {
    if (!this.conn) throw new Error('Not connected');

    // Write nodes
    const nodeBatchSize = 1000;
    for (let i = 0; i < nodeCount; i += nodeBatchSize) {
      const batch = Math.min(nodeBatchSize, nodeCount - i);
      for (let j = 0; j < batch; j++) {
        const id = `recovery_test_${i + j}`;
        const title = `Recovery Test ${i + j}`;
        await this.conn.query(`
          CREATE (:Paper {id: '${id}', title: '${title}', category: 'TEST', year: 2024})
        `);
      }
    }

    // Write edges
    const edgeBatchSize = 1000;
    for (let i = 0; i < edgeCount; i += edgeBatchSize) {
      const batch = Math.min(edgeBatchSize, edgeCount - i);
      for (let j = 0; j < batch; j++) {
        const source = `recovery_test_${(i + j) % nodeCount}`;
        const target = `recovery_test_${(i + j + 1) % nodeCount}`;
        await this.conn.query(`
          MATCH (s:Paper {id: '${source}'}), (t:Paper {id: '${target}'})
          CREATE (s)-[:CITES]->(t)
        `);
      }
    }
  }

  /**
   * Clean up test database file
   */
  private cleanupTestFile(dbPath: string): void {
    const fs = require('fs');
    const path = require('path');

    try {
      // Remove main database file
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }

      // Remove WAL file
      const walPath = dbPath + '.wal';
      if (fs.existsSync(walPath)) {
        fs.unlinkSync(walPath);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Create a persistence engine adapter for benchmarking
 */
export class PersistenceEngineAdapter implements EngineAdapter {
  name = 'congraph-persistence' as const;
  private db?: Database;
  private conn?: Connection;

  constructor(private storageType: StorageType) {}

  async connect(): Promise<void> {
    const dbPath = this.storageType === 'file'
      ? `./bench-${Date.now()}.cgraph`
      : ':memory:';

    this.db = new Database(dbPath);
    this.db.init();
    this.conn = this.db.createConnection();
  }

  async disconnect(): Promise<void> {
    if (this.conn) {
      // Connection is closed by db.close()
      this.conn = undefined;
    }
    if (this.db) {
      this.db.close();
      this.db = undefined;
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

  async ingestNodes(nodes: Node[]): Promise<number> {
    if (!this.conn) throw new Error('Not connected');

    // Create schema if needed
    await this.conn.query(`
      CREATE NODE TABLE IF NOT EXISTS Paper(
        id STRING,
        title STRING,
        category STRING,
        year INT64,
        PRIMARY KEY(id)
      )
    `);

    const batchSize = 1000;
    for (let i = 0; i < nodes.length; i += batchSize) {
      const batch = nodes.slice(i, i + batchSize);
      for (const n of batch) {
        const title = (n.properties.title || '').replace(/'/g, "\\'");
        const category = (n.properties.category || '').replace(/'/g, "\\'");
        const year = n.properties.year || 2024;
        await this.conn.query(`
          MERGE (p:Paper {id: '${n.id}'})
          SET p.title = '${title}', p.category = '${category}', p.year = ${year}
        `);
      }
    }

    return nodes.length;
  }

  async ingestEdges(edges: Edge[]): Promise<number> {
    if (!this.conn) throw new Error('Not connected');

    await this.conn.query(`
      CREATE REL TABLE IF NOT EXISTS CITES(FROM Paper TO Paper)
    `);

    const batchSize = 1000;
    for (let i = 0; i < edges.length; i += batchSize) {
      const batch = edges.slice(i, i + batchSize);
      for (const e of batch) {
        await this.conn.query(`
          MATCH (s:Paper {id: '${e.source}'}), (t:Paper {id: '${e.target}'})
          MERGE (s)-[r:CITES]->(t)
        `);
      }
    }

    return edges.length;
  }

  async traverse(sourceId: string, hops: number): Promise<number> {
    if (!this.conn) throw new Error('Not connected');

    const result = await this.conn.query(`
      MATCH path = (start:Paper {id: '${sourceId}'})-[:CITES*1..${hops}]->(end:Paper)
      RETURN DISTINCT end.id
      LIMIT 100000
    `);

    return result.getAll().length;
  }

  async runPageRank(iterations: number): Promise<number> {
    if (!this.conn) throw new Error('Not connected');

    const start = performance.now();

    try {
      await this.conn.query('CALL set_node_property(Paper, pagerank, 0.0)');
    } catch {
      // Property may already exist
    }

    await this.conn.query('MATCH (p:Paper) SET p.pagerank = 1.0');

    for (let i = 0; i < iterations; i++) {
      await this.conn.query(`
        MATCH (p:Paper)
        SET p.pagerank = 0.15 + 0.85 * COALESCE(
          (
            MATCH (p)<-[:CITES]-(prev:Paper)
            WITH prev, count {(prev)-[:CITES]->()} AS degree
            RETURN sum(prev.pagerank / degree)
          ),
          1.0
        )
      `);
    }

    return Math.round(performance.now() - start);
  }

  getMemoryUsage(): number {
    return process.memoryUsage().rss;
  }

  async checkpoint(): Promise<number> {
    if (!this.db) throw new Error('Not connected');

    const start = performance.now();
    this.db.checkpoint();
    return Math.round(performance.now() - start);
  }
}

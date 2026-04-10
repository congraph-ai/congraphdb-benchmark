import { Database, Connection } from 'congraphdb';
import { DataScale, DATA_SCALES } from '../../types.js';
import { unwrap, unwrapAsync } from '../../utils/napi-helpers.js';

/**
 * Centrality Algorithm Benchmarks
 *
 * Tests PageRank, Betweenness, Closeness, and Degree centrality algorithms.
 */
export class CentralityBenchmark {
  private db?: Database;
  private conn?: Connection;

  constructor(private scale: DataScale = 'medium') {}

  /**
   * Run centrality benchmarks
   */
  async run(): Promise<CentralityResult> {
    console.log('\n  📊 Centrality Algorithm Benchmarks');
    console.log('  ' + '='.repeat(50));
    console.log(`  Scale: ${this.scale.toUpperCase()}`);

    const dbPath = `./benchmark-centrality-${Date.now()}.cgraph`;

    // Initialize database
    this.db = new Database(dbPath);
    unwrap(this.db.init(), 'Failed to initialize database');
    this.conn = unwrap(this.db.createConnection(), 'Failed to create connection');

    // Create test graph
    await this.setupTestGraph();

    // Run benchmarks
    const pageRank = await this.benchmarkPageRank();
    const betweenness = await this.benchmarkBetweenness();
    const closeness = await this.benchmarkCloseness();
    const degree = await this.benchmarkDegree();

    // Cleanup
    this.conn = undefined;
    this.db?.close();
    this.db = undefined;
    this.cleanupTestFile(dbPath);

    return {
      scale: this.scale,
      pageRank,
      betweenness,
      closeness,
      degree
    };
  }

  /**
   * Setup test graph (social network pattern)
   */
  private async setupTestGraph(): Promise<void> {
    if (!this.conn) throw new Error('Not connected');

    const nodeCount = Math.min(DATA_SCALES[this.scale].nodes, 10000);
    const edgeCount = Math.min(DATA_SCALES[this.scale].edges, 50000);

    console.log(`  📊 Creating test graph (${nodeCount} nodes, ${edgeCount} edges)...`);

    await unwrapAsync(this.conn.query(`
      CREATE NODE TABLE Person(id STRING, name STRING, PRIMARY KEY(id))
    `), 'Failed to create Person table');

    await unwrapAsync(this.conn.query(`
      CREATE REL TABLE Knows(FROM Person TO Person, strength FLOAT)
    `), 'Failed to create Knows table');

    // Create nodes
    const batchSize = 1000;
    for (let i = 0; i < nodeCount; i += batchSize) {
      const batch = Math.min(batchSize, nodeCount - i);
      for (let j = 0; j < batch; j++) {
        await unwrapAsync(this.conn.query(`CREATE (:Person {id: 'p_${i + j}', name: 'Person ${i + j}'})`), `Failed to create person p_${i + j}`);
      }
    }

    // Create edges (random but with some structure)
    for (let i = 0; i < edgeCount; i++) {
      const from = `p_${Math.floor(Math.random() * nodeCount)}`;
      const to = `p_${Math.floor(Math.random() * nodeCount)}`;
      const strength = Math.random();

      await unwrapAsync(this.conn.query(`
        MATCH (f:Person {id: '${from}'}), (t:Person {id: '${to}'})
        CREATE (f)-[:Knows {strength: ${strength}}]->(t)
      `), `Failed to create Knows edge`);
    }

    console.log('  ✓ Test graph created');
  }

  /**
   * Benchmark PageRank algorithm
   */
  private async benchmarkPageRank(): Promise<PageRankResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Benchmarking PageRank...');

    const configs = [
      { dampingFactor: 0.85, maxIterations: 10 },
      { dampingFactor: 0.85, maxIterations: 20 },
      { dampingFactor: 0.9, maxIterations: 20 }
    ];

    const results: Array<{ config: any; timeMs: number; iterations: number }> = [];

    for (const config of configs) {
      const start = performance.now();
      const resultJson = unwrap(this.conn.runAlgorithmSync('pagerank', JSON.stringify(config)), 'PageRank failed');
      const result = JSON.parse(resultJson);
      const elapsed = performance.now() - start;

      results.push({
        config,
        timeMs: Math.round(elapsed),
        iterations: result.length || 0
      });
    }

    return {
      configs: results,
      bestTimeMs: Math.min(...results.map(r => r.timeMs))
    };
  }

  /**
   * Benchmark Betweenness Centrality algorithm
   */
  private async benchmarkBetweenness(): Promise<BetweennessResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Benchmarking Betweenness Centrality...');

    const directions = ['Out', 'In', 'Both'];
    const results: Array<{ direction: string; timeMs: number }> = [];

    for (const direction of directions) {
      const start = performance.now();
      const resultJson = unwrap(this.conn.runAlgorithmSync('betweenness', JSON.stringify({ direction })), 'Betweenness failed');
      JSON.parse(resultJson);
      const elapsed = performance.now() - start;

      results.push({
        direction,
        timeMs: Math.round(elapsed)
      });
    }

    return {
      directions: results,
      bestTimeMs: Math.min(...results.map(r => r.timeMs))
    };
  }

  /**
   * Benchmark Closeness Centrality algorithm
   */
  private async benchmarkCloseness(): Promise<ClosenessResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Benchmarking Closeness Centrality...');

    const directions = ['Out', 'In', 'Both'];
    const results: Array<{ direction: string; timeMs: number }> = [];

    for (const direction of directions) {
      const start = performance.now();
      const resultJson = unwrap(this.conn.runAlgorithmSync('closeness', JSON.stringify({ direction })), 'Closeness failed');
      JSON.parse(resultJson);
      const elapsed = performance.now() - start;

      results.push({
        direction,
        timeMs: Math.round(elapsed)
      });
    }

    return {
      directions: results,
      bestTimeMs: Math.min(...results.map(r => r.timeMs))
    };
  }

  /**
   * Benchmark Degree Centrality algorithm
   */
  private async benchmarkDegree(): Promise<DegreeResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Benchmarking Degree Centrality...');

    const configs = [
      { direction: 'Out', normalized: false },
      { direction: 'In', normalized: false },
      { direction: 'Both', normalized: false },
      { direction: 'Both', normalized: true }
    ];

    const results: Array<{ config: any; timeMs: number }> = [];

    for (const config of configs) {
      const start = performance.now();
      const resultJson = unwrap(this.conn.runAlgorithmSync('degree', JSON.stringify(config)), 'Degree failed');
      JSON.parse(resultJson);
      const elapsed = performance.now() - start;

      results.push({
        config,
        timeMs: Math.round(elapsed)
      });
    }

    return {
      configs: results,
      bestTimeMs: Math.min(...results.map(r => r.timeMs))
    };
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

// Result types
export interface CentralityResult {
  scale: DataScale;
  pageRank: PageRankResult;
  betweenness: BetweennessResult;
  closeness: ClosenessResult;
  degree: DegreeResult;
}

export interface PageRankResult {
  configs: Array<{ config: any; timeMs: number; iterations: number }>;
  bestTimeMs: number;
}

export interface BetweennessResult {
  directions: Array<{ direction: string; timeMs: number }>;
  bestTimeMs: number;
}

export interface ClosenessResult {
  directions: Array<{ direction: string; timeMs: number }>;
  bestTimeMs: number;
}

export interface DegreeResult {
  configs: Array<{ config: any; timeMs: number }>;
  bestTimeMs: number;
}

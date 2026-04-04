import { Database, Connection } from 'congraphdb';
import { DataScale, DATA_SCALES } from '../../types.js';

/**
 * Analytics Algorithm Benchmarks
 *
 * Tests Triangle Count and other graph analytics algorithms.
 */
export class AnalyticsBenchmark {
  private db?: Database;
  private conn?: Connection;

  constructor(private scale: DataScale = 'medium') {}

  /**
   * Run analytics benchmarks
   */
  async run(): Promise<AnalyticsResult> {
    console.log('\n  📈 Analytics Algorithm Benchmarks');
    console.log('  ' + '='.repeat(50));
    console.log(`  Scale: ${this.scale.toUpperCase()}`);

    const dbPath = `./benchmark-analytics-${Date.now()}.cgraph`;

    // Initialize database
    this.db = new Database(dbPath);
    this.db.init();
    this.conn = this.db.createConnection();

    // Create test graph (social network with triangles)
    await this.setupTestGraph();

    // Run benchmarks
    const triangleCount = await this.benchmarkTriangleCount();
    const connectedComponents = await this.benchmarkConnectedComponents();
    const scc = await this.benchmarkSCC();

    // Cleanup
    this.conn = undefined;
    this.db?.close();
    this.db = undefined;
    this.cleanupTestFile(dbPath);

    return {
      scale: this.scale,
      triangleCount,
      connectedComponents,
      scc
    };
  }

  /**
   * Setup test graph (social network with triangles)
   */
  private async setupTestGraph(): Promise<void> {
    if (!this.conn) throw new Error('Not connected');

    const nodeCount = Math.min(DATA_SCALES[this.scale].nodes, 3000);
    const edgeCount = Math.min(DATA_SCALES[this.scale].edges, 15000);

    console.log(`  📊 Creating social network (${nodeCount} nodes, ${edgeCount} edges)...`);

    await this.conn.query(`
      CREATE NODE TABLE Person(id STRING, name STRING, PRIMARY KEY(id))
    `);

    await this.conn.query(`
      CREATE REL TABLE Friends(FROM Person TO Person)
    `);

    // Create people
    for (let i = 0; i < nodeCount; i++) {
      await this.conn.query(`CREATE (:Person {id: 'p_${i}', name: 'Person ${i}'})`);
    }

    // Create friendships (with bias towards creating triangles)
    for (let i = 0; i < edgeCount; i++) {
      const fromId = Math.floor(Math.random() * nodeCount);
      let toId = Math.floor(Math.random() * nodeCount);

      // Sometimes create a triangle (friend of a friend)
      if (Math.random() < 0.3 && fromId > 0) {
        toId = Math.floor(Math.random() * fromId);
      }

      if (fromId !== toId) {
        await this.conn.query(`
          MATCH (f:Person {id: 'p_${fromId}'}), (t:Person {id: 'p_${toId}'})
          CREATE (f)-[:Friends]->(t)
        `);
      }
    }

    console.log('  ✓ Social network created');
  }

  /**
   * Benchmark Triangle Count algorithm
   */
  private async benchmarkTriangleCount(): Promise<TriangleCountResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Benchmarking Triangle Count...');

    const iterations = 5;
    const results: Array<{ iteration: number; timeMs: number; totalTriangles: number }> = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const resultJson = this.conn.runAlgorithmSync('triangleCount', '{}');
      const result = JSON.parse(resultJson);
      const elapsed = performance.now() - start;

      results.push({
        iteration: i + 1,
        timeMs: Math.round(elapsed),
        totalTriangles: result.totalTriangles || 0
      });
    }

    const avgTimeMs = results.reduce((sum, r) => sum + r.timeMs, 0) / iterations;

    return {
      results,
      avgTimeMs: Math.round(avgTimeMs),
      bestTimeMs: Math.min(...results.map(r => r.timeMs)),
      totalTriangles: results[0].totalTriangles
    };
  }

  /**
   * Benchmark Connected Components algorithm
   */
  private async benchmarkConnectedComponents(): Promise<ComponentsResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Benchmarking Connected Components...');

    const directions = ['Out', 'Both'];
    const results: Array<{ direction: string; timeMs: number; componentCount: number }> = [];

    for (const direction of directions) {
      const start = performance.now();
      const resultJson = this.conn.runAlgorithmSync('connectedComponents', JSON.stringify({
        direction
      }));
      const result = JSON.parse(resultJson);
      const elapsed = performance.now() - start;

      const components = new Set(result.map((r: any) => r.componentId));
      results.push({
        direction,
        timeMs: Math.round(elapsed),
        componentCount: components.size
      });
    }

    return {
      results,
      bestTimeMs: Math.min(...results.map(r => r.timeMs))
    };
  }

  /**
   * Benchmark Strongly Connected Components algorithm
   */
  private async benchmarkSCC(): Promise<SCCResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Benchmarking SCC...');

    const start = performance.now();
    const resultJson = this.conn.runAlgorithmSync('scc', '{}');
    const result = JSON.parse(resultJson);
    const elapsed = performance.now() - start;

    const components = new Set(result.map((r: any) => r.componentId));

    // Get size distribution
    const componentSizes: Record<number, number> = {};
    for (const r of result) {
      const id = r.componentId;
      componentSizes[id] = (componentSizes[id] || 0) + 1;
    }

    const sizeDistribution = Object.values(componentSizes).sort((a, b) => b - a).slice(0, 10);

    return {
      timeMs: Math.round(elapsed),
      componentCount: components.size,
      sizeDistribution
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
export interface AnalyticsResult {
  scale: DataScale;
  triangleCount: TriangleCountResult;
  connectedComponents: ComponentsResult;
  scc: SCCResult;
}

export interface TriangleCountResult {
  results: Array<{ iteration: number; timeMs: number; totalTriangles: number }>;
  avgTimeMs: number;
  bestTimeMs: number;
  totalTriangles: number;
}

export interface ComponentsResult {
  results: Array<{ direction: string; timeMs: number; componentCount: number }>;
  bestTimeMs: number;
}

export interface SCCResult {
  timeMs: number;
  componentCount: number;
  sizeDistribution: number[];
}

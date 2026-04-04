import { Database, Connection } from 'congraphdb';
import { DataScale, DATA_SCALES } from '../../types.js';

/**
 * Traversal and Path Algorithm Benchmarks
 *
 * Tests BFS, DFS, and Dijkstra algorithms.
 */
export class TraversalBenchmark {
  private db?: Database;
  private conn?: Connection;

  constructor(private scale: DataScale = 'medium') {}

  /**
   * Run traversal benchmarks
   */
  async run(): Promise<TraversalResult> {
    console.log('\n  🔍 Traversal Algorithm Benchmarks');
    console.log('  ' + '='.repeat(50));
    console.log(`  Scale: ${this.scale.toUpperCase()}`);

    const dbPath = `./benchmark-traversal-${Date.now()}.cgraph`;

    // Initialize database
    this.db = new Database(dbPath);
    this.db.init();
    this.conn = this.db.createConnection();

    // Create test graph (road network pattern)
    await this.setupTestGraph();

    // Run benchmarks
    const bfs = await this.benchmarkBFS();
    const dfs = await this.benchmarkDFS();
    const dijkstra = await this.benchmarkDijkstra();

    // Cleanup
    this.conn = undefined;
    this.db?.close();
    this.db = undefined;
    this.cleanupTestFile(dbPath);

    return {
      scale: this.scale,
      bfs,
      dfs,
      dijkstra
    };
  }

  /**
   * Setup test graph (road network with weighted edges)
   */
  private async setupTestGraph(): Promise<void> {
    if (!this.conn) throw new Error('Not connected');

    const nodeCount = Math.min(DATA_SCALES[this.scale].nodes, 5000);
    const edgeCount = Math.min(DATA_SCALES[this.scale].edges, 20000);

    console.log(`  📊 Creating road network (${nodeCount} nodes, ${edgeCount} edges)...`);

    await this.conn.query(`
      CREATE NODE TABLE City(id STRING, name STRING, x INT64, y INT64, PRIMARY KEY(id))
    `);

    await this.conn.query(`
      CREATE REL TABLE Road(FROM City TO City, distance INT64)
    `);

    // Create cities in a grid pattern
    const gridSize = Math.ceil(Math.sqrt(nodeCount));
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const id = x * gridSize + y;
        if (id < nodeCount) {
          await this.conn.query(`
            CREATE (:City {id: 'c_${id}', name: 'City ${id}', x: ${x}, y: ${y}})
          `);
        }
      }
    }

    // Create roads (edges) with distances
    for (let i = 0; i < edgeCount; i++) {
      const fromId = Math.floor(Math.random() * nodeCount);
      const toId = Math.floor(Math.random() * nodeCount);

      if (fromId !== toId) {
        // Calculate distance based on grid position
        const fromX = fromId % gridSize;
        const fromY = Math.floor(fromId / gridSize);
        const toX = toId % gridSize;
        const toY = Math.floor(toId / gridSize);
        const distance = Math.abs(toX - fromX) + Math.abs(toY - fromY) + 1;

        await this.conn.query(`
          MATCH (f:City {id: 'c_${fromId}'}), (t:City {id: 'c_${toId}'})
          CREATE (f)-[:Road {distance: ${distance}}]->(t)
        `);
      }
    }

    console.log('  ✓ Road network created');
  }

  /**
   * Benchmark BFS algorithm
   */
  private async benchmarkBFS(): Promise<BFSResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Benchmarking BFS...');

    const depths = [1, 3, 5];
    const directions = ['Out', 'In', 'Both'];
    const results: Array<{ depth: number; direction: string; timeMs: number; nodesVisited: number }> = [];

    for (const depth of depths) {
      for (const direction of directions) {
        const start = performance.now();
        const resultJson = this.conn.runAlgorithmSync('bfs', JSON.stringify({
          maxDepth: depth,
          direction
        }));
        const result = JSON.parse(resultJson);
        const elapsed = performance.now() - start;

        results.push({
          depth,
          direction,
          timeMs: Math.round(elapsed),
          nodesVisited: result.length
        });
      }
    }

    return {
      results,
      bestTimeMs: Math.min(...results.map(r => r.timeMs))
    };
  }

  /**
   * Benchmark DFS algorithm
   */
  private async benchmarkDFS(): Promise<DFSResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Benchmarking DFS...');

    const depths = [1, 3, 5];
    const directions = ['Out', 'In', 'Both'];
    const results: Array<{ depth: number; direction: string; timeMs: number; nodesVisited: number }> = [];

    for (const depth of depths) {
      for (const direction of directions) {
        const start = performance.now();
        const resultJson = this.conn.runAlgorithmSync('dfs', JSON.stringify({
          maxDepth: depth,
          direction
        }));
        const result = JSON.parse(resultJson);
        const elapsed = performance.now() - start;

        results.push({
          depth,
          direction,
          timeMs: Math.round(elapsed),
          nodesVisited: result.length
        });
      }
    }

    return {
      results,
      bestTimeMs: Math.min(...results.map(r => r.timeMs))
    };
  }

  /**
   * Benchmark Dijkstra algorithm (shortest path with weights)
   */
  private async benchmarkDijkstra(): Promise<DijkstraResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Benchmarking Dijkstra...');

    const directions = ['Out', 'In', 'Both'];
    const results: Array<{ direction: string; timeMs: number; pathCount: number }> = [];

    for (const direction of directions) {
      const start = performance.now();
      const resultJson = this.conn.runAlgorithmSync('dijkstra', JSON.stringify({
        weightProperty: 'distance',
        direction
      }));
      const result = JSON.parse(resultJson);
      const elapsed = performance.now() - start;

      results.push({
        direction,
        timeMs: Math.round(elapsed),
        pathCount: result.length
      });
    }

    return {
      results,
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
export interface TraversalResult {
  scale: DataScale;
  bfs: BFSResult;
  dfs: DFSResult;
  dijkstra: DijkstraResult;
}

export interface BFSResult {
  results: Array<{ depth: number; direction: string; timeMs: number; nodesVisited: number }>;
  bestTimeMs: number;
}

export interface DFSResult {
  results: Array<{ depth: number; direction: string; timeMs: number; nodesVisited: number }>;
  bestTimeMs: number;
}

export interface DijkstraResult {
  results: Array<{ direction: string; timeMs: number; pathCount: number }>;
  bestTimeMs: number;
}

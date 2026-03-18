import { EngineAdapter, Node, Edge, APIType, APIComparisonResult, APITestResult } from '../types.js';

/**
 * API Comparison Benchmark Results
 *
 * Compares Cypher query performance vs JavaScript-Native API performance
 */

export interface APIComparisonConfig {
  nodeCount: number;
  edgeCount: number;
  iterations: number;
}

/**
 * API Comparison Benchmark
 *
 * Tests the performance difference between Cypher queries and JavaScript API calls
 */
export class APIComparisonBenchmark {
  constructor(
    private cypherEngine: EngineAdapter,
    private javascriptEngine: EngineAdapter | null,
    private config: APIComparisonConfig
  ) {}

  /**
   * Run the complete API comparison benchmark
   */
  async run(): Promise<APIComparisonResult | null> {
    if (!this.javascriptEngine) {
      console.log('  ⚠️  JavaScript API not available, skipping API comparison');
      return null;
    }

    console.log('\n  📊 API Comparison Benchmark');
    console.log('  ' + '='.repeat(50));

    // Generate test data
    const nodes = this.generateNodes(this.config.nodeCount);
    const edges = this.generateEdges(this.config.edgeCount);

    // Run Cypher benchmarks
    console.log('  🔷 Testing Cypher API...');
    const cypherResults = await this.testEngine(this.cypherEngine, nodes, edges, 'cypher');

    // Run JavaScript benchmarks
    console.log('  🔶 Testing JavaScript API...');
    const jsResults = await this.testEngine(this.javascriptEngine, nodes, edges, 'javascript');

    // Calculate ratio (JS/Cypher)
    const ratio = this.calculateRatio(cypherResults, jsResults);

    console.log(`  📈 Performance Ratio: ${ratio.toFixed(2)}x (${ratio < 1 ? 'Cypher' : 'JS'} faster)`);

    return { cypher: cypherResults, javascript: jsResults, ratio };
  }

  /**
   * Test a single engine
   */
  private async testEngine(
    engine: EngineAdapter,
    nodes: Node[],
    edges: Edge[],
    apiType: APIType
  ): Promise<APITestResult> {
    await engine.connect();
    await engine.clear();

    const startTime = performance.now();

    // Node CRUD operations
    const nodeCreateOps = await this.benchmarkNodeCreate(engine, nodes);
    const nodeReadOps = await this.benchmarkNodeRead(engine, nodes);
    const nodeUpdateOps = await this.benchmarkNodeUpdate(engine, nodes);
    const nodeDeleteOps = await this.benchmarkNodeDelete(engine, nodes);

    // Re-populate for edge tests
    await engine.ingestNodes(nodes);

    // Edge CRUD operations
    const edgeCreateOps = await this.benchmarkEdgeCreate(engine, edges);
    const edgeReadOps = await this.benchmarkEdgeRead(engine, edges);

    // Pattern matching
    const patternMatchMs = await this.benchmarkPatternMatching(engine);

    // Traversal
    const traversalMs = await this.benchmarkTraversal(engine);

    const totalTimeMs = performance.now() - startTime;

    await engine.disconnect();

    return {
      nodeCreateOps,
      nodeReadOps,
      nodeUpdateOps,
      nodeDeleteOps,
      edgeCreateOps,
      edgeReadOps,
      patternMatchMs,
      traversalMs,
      totalTimeMs,
    };
  }

  /**
   * Benchmark node creation
   */
  private async benchmarkNodeCreate(engine: EngineAdapter, nodes: Node[]): Promise<number> {
    const iterations = this.config.iterations;
    const batch = nodes.slice(0, Math.min(1000, nodes.length));

    let totalOps = 0;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      await engine.clear();
      const count = await engine.ingestNodes(batch);
      totalOps += count;
    }

    const elapsed = performance.now() - start;
    return Math.round((totalOps / elapsed) * 1000); // ops per second
  }

  /**
   * Benchmark node reading
   */
  private async benchmarkNodeRead(engine: EngineAdapter, nodes: Node[]): Promise<number> {
    await engine.ingestNodes(nodes);
    await engine.ingestEdges(this.generateEdges(Math.min(1000, nodes.length * 5)));

    const iterations = this.config.iterations;
    const sampleSize = Math.min(100, nodes.length);

    let totalOps = 0;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      for (let j = 0; j < sampleSize; j++) {
        await engine.traverse(nodes[j].id, 1);
        totalOps++;
      }
    }

    const elapsed = performance.now() - start;
    return Math.round((totalOps / elapsed) * 1000);
  }

  /**
   * Benchmark node updates (via SET operations)
   */
  private async benchmarkNodeUpdate(engine: EngineAdapter, nodes: Node[]): Promise<number> {
    if (!engine.dmlSet) {
      return 0; // Not supported
    }

    const iterations = this.config.iterations;
    const batch = nodes.slice(0, Math.min(100, nodes.length));

    let totalOps = 0;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      for (const node of batch) {
        await engine.dmlSet(node.id, { updated: true, counter: i });
        totalOps++;
      }
    }

    const elapsed = performance.now() - start;
    return Math.round((totalOps / elapsed) * 1000);
  }

  /**
   * Benchmark node deletion
   */
  private async benchmarkNodeDelete(engine: EngineAdapter, nodes: Node[]): Promise<number> {
    if (!engine.dmlDelete) {
      return 0; // Not supported
    }

    const iterations = this.config.iterations;
    const batch = nodes.slice(0, Math.min(100, nodes.length));

    let totalOps = 0;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      // Re-populate before each iteration
      await engine.ingestNodes(batch);

      for (const node of batch) {
        await engine.dmlDelete(node.id, true);
        totalOps++;
      }
    }

    const elapsed = performance.now() - start;
    return Math.round((totalOps / elapsed) * 1000);
  }

  /**
   * Benchmark edge creation
   */
  private async benchmarkEdgeCreate(engine: EngineAdapter, edges: Edge[]): Promise<number> {
    await engine.ingestNodes(this.generateNodes(Math.min(1000, edges.length)));

    const iterations = this.config.iterations;
    const batch = edges.slice(0, Math.min(1000, edges.length));

    let totalOps = 0;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      await engine.clear();
      await engine.ingestNodes(this.generateNodes(Math.min(1000, edges.length)));
      const count = await engine.ingestEdges(batch);
      totalOps += count;
    }

    const elapsed = performance.now() - start;
    return Math.round((totalOps / elapsed) * 1000);
  }

  /**
   * Benchmark edge reading
   */
  private async benchmarkEdgeRead(engine: EngineAdapter, edges: Edge[]): Promise<number> {
    const nodes = this.generateNodes(Math.min(1000, edges.length));
    await engine.ingestNodes(nodes);
    await engine.ingestEdges(edges.slice(0, Math.min(5000, edges.length)));

    const iterations = this.config.iterations;
    const sampleSize = Math.min(100, nodes.length);

    let totalOps = 0;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      for (let j = 0; j < sampleSize; j++) {
        await engine.traverse(nodes[j].id, 2);
        totalOps++;
      }
    }

    const elapsed = performance.now() - start;
    return Math.round((totalOps / elapsed) * 1000);
  }

  /**
   * Benchmark pattern matching
   */
  private async benchmarkPatternMatching(engine: EngineAdapter): Promise<number> {
    // This is tested via traverse which uses pattern matching
    const iterations = 10;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await engine.traverse('paper_0', 3);
      times.push(performance.now() - start);
    }

    return Math.round(times.reduce((a, b) => a + b, 0) / iterations);
  }

  /**
   * Benchmark traversal
   */
  private async benchmarkTraversal(engine: EngineAdapter): Promise<number> {
    const iterations = 10;
    const hops = [1, 2, 3, 4, 5];
    const times: number[] = [];

    for (const hop of hops) {
      const start = performance.now();
      await engine.traverse('paper_0', hop);
      times.push(performance.now() - start);
    }

    return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  }

  /**
   * Calculate the ratio between JavaScript and Cypher results
   */
  private calculateRatio(cypher: APITestResult, js: APITestResult): number {
    const metrics = [
      cypher.nodeCreateOps / js.nodeCreateOps,
      cypher.nodeReadOps / js.nodeReadOps,
      cypher.nodeUpdateOps / js.nodeUpdateOps,
      cypher.edgeCreateOps / js.edgeCreateOps,
      js.patternMatchMs / cypher.patternMatchMs,
      js.traversalMs / cypher.traversalMs,
    ].filter(r => r > 0 && isFinite(r));

    return metrics.reduce((a, b) => a + b, 0) / metrics.length;
  }

  /**
   * Generate test nodes
   */
  private generateNodes(count: number): Node[] {
    const nodes: Node[] = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        id: `paper_${i}`,
        label: 'Paper',
        properties: {
          title: `Paper ${i}`,
          category: ['AI', 'ML', 'DB', 'IR'][i % 4],
          year: 2020 + (i % 5),
          citationCount: i * 10,
        },
      });
    }
    return nodes;
  }

  /**
   * Generate test edges
   */
  private generateEdges(count: number): Edge[] {
    const edges: Edge[] = [];
    for (let i = 0; i < count; i++) {
      edges.push({
        id: `edge_${i}`,
        source: `paper_${i % 1000}`,
        target: `paper_${(i + 1) % 1000}`,
        label: 'CITES',
        properties: { timestamp: Date.now() - i * 1000 },
      });
    }
    return edges;
  }
}

/**
 * Test if JavaScript API is available
 */
export function isJavaScriptAPIAvailable(): boolean {
  try {
    // Try to import CongraphDBAPI from the npm package
    // Note: This is a heuristic - actual availability depends on build
    return false; // Default to false until JS API is published
  } catch {
    return false;
  }
}

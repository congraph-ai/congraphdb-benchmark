import { EngineAdapter, Node, Edge, BenchmarkResult, DataScale, TraversalResult } from '../types.js';
import { MetricsRecorder } from './recorder.js';

export interface SuiteConfig {
  scale: DataScale;
  traversalIterations: number;
  pagerankIterations: number;
}

export class BenchmarkSuite {
  private startMemory: number = 0;
  private peakMemory: number = 0;

  constructor(
    private engine: EngineAdapter,
    private recorder: MetricsRecorder,
    private config: SuiteConfig
  ) {}

  /**
   * Run the complete benchmark suite
   */
  async run(nodes: Node[], edges: Edge[]): Promise<void> {
    console.log(`\n🚀 Starting ${this.engine.name} benchmark (${this.config.scale} scale)`);
    console.log(`   Nodes: ${nodes.length.toLocaleString()}, Edges: ${edges.length.toLocaleString()}`);

    // Connect to engine
    await this.engine.connect();
    this.trackMemory();

    // Clear any existing data
    await this.engine.clear();

    // Run ingestion test
    const ingestionResult = await this.benchmarkIngestion(nodes, edges);
    console.log(`   ✓ Ingestion: ${ingestionResult.nodesPerSecond.toFixed(0)} nodes/s`);

    // Run traversal tests
    const traversalResults = await this.benchmarkTraversals();
    console.log(`   ✓ Traversals: 1-hop=${traversalResults[0].averageTimeMs.toFixed(2)}ms, ` +
                `3-hop=${traversalResults[2].averageTimeMs.toFixed(2)}ms, ` +
                `5-hop=${traversalResults[4].averageTimeMs.toFixed(2)}ms`);

    // Run algorithm test
    const algorithmResult = await this.benchmarkAlgorithms();
    console.log(`   ✓ PageRank (${this.config.pagerankIterations} iters): ${algorithmResult.pagerankTimeMs}ms`);

    // Get memory usage
    const memoryResult = this.getMemoryResult();
    console.log(`   ✓ Peak Memory: ${memoryResult.peakRssMb.toFixed(2)} MB`);

    // Record results
    this.recorder.record({
      engine: this.engine.name,
      scale: this.config.scale,
      timestamp: Date.now(),
      results: {
        ingestion: ingestionResult,
        traversals: traversalResults,
        algorithms: algorithmResult,
        memory: memoryResult,
      },
    });

    // Cleanup
    await this.engine.disconnect();
    console.log(`✅ ${this.engine.name} benchmark complete\n`);
  }

  /**
   * Benchmark data ingestion
   */
  private async benchmarkIngestion(nodes: Node[], edges: Edge[]) {
    const startTime = performance.now();

    const nodeCount = await this.engine.ingestNodes(nodes);
    this.trackMemory();

    const edgeCount = await this.engine.ingestEdges(edges);
    this.trackMemory();

    const totalTime = performance.now() - startTime;

    return {
      nodesPerSecond: (nodeCount / totalTime) * 1000,
      edgesPerSecond: (edgeCount / totalTime) * 1000,
      totalTimeMs: totalTime,
      nodeCount,
      edgeCount,
    };
  }

  /**
   * Benchmark k-hop traversals
   */
  private async benchmarkTraversals(): Promise<TraversalResult[]> {
    const results: TraversalResult[] = [];
    const hops = [1, 2, 3, 4, 5];

    for (const hop of hops) {
      const times: number[] = [];

      // Cold start (first query)
      const coldStart = performance.now();
      await this.engine.traverse('paper_0', hop);
      const coldTime = performance.now() - coldStart;
      times.push(coldTime);

      // Warm starts (subsequent queries)
      for (let i = 0; i < this.config.traversalIterations - 1; i++) {
        const start = performance.now();
        await this.engine.traverse(`paper_${i % 100}`, hop);
        times.push(performance.now() - start);
      }

      const averageTime = times.reduce((a, b) => a + b, 0) / times.length;

      results.push({
        hops: hop,
        coldStartMs: coldTime,
        warmStartMs: times.slice(1).reduce((a, b) => a + b, 0) / (times.length - 1),
        averageTimeMs: averageTime,
        iterations: times.length,
      });
    }

    return results;
  }

  /**
   * Benchmark graph algorithms
   */
  private async benchmarkAlgorithms() {
    const startTime = performance.now();
    const iterations = await this.engine.runPageRank(this.config.pagerankIterations);
    const totalTime = performance.now() - startTime;

    return {
      pagerankTimeMs: Math.round(totalTime),
      iterations,
    };
  }

  /**
   * Get memory usage result
   */
  private getMemoryResult() {
    const peakRssBytes = this.peakMemory;
    return {
      peakRssBytes,
      peakRssMb: peakRssBytes / (1024 * 1024),
    };
  }

  /**
   * Track memory usage
   */
  private trackMemory(): void {
    const currentMemory = this.engine.getMemoryUsage();
    if (currentMemory > this.peakMemory) {
      this.peakMemory = currentMemory;
    }
  }
}

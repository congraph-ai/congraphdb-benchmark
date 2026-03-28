import { EngineAdapter, Node, Edge, BenchmarkResult, DataScale, TraversalResult, BenchmarkConfig, ExtendedTestResults, APIType, StorageType } from '../types.js';
import { MetricsRecorder } from './recorder.js';

// Import v0.1.6 benchmark modules
import { APIComparisonBenchmark } from '../benchmarks/api-comparison.js';
import { DMLOperationsBenchmark } from '../benchmarks/dml-operations.js';
import { PersistenceBenchmark, PersistenceEngineAdapter } from '../benchmarks/persistence.js';
import { StatisticsBenchmark, StatisticsEngineAdapter } from '../benchmarks/statistics.js';
import { VectorSearchBenchmark } from '../benchmarks/vector-search.js';
import { OptimizerBenchmark } from '../benchmarks/optimizer.js';

export interface SuiteConfig extends Omit<BenchmarkConfig, 'api' | 'storage' | 'warmup'> {
  // Keep old fields for backward compatibility
  scale: DataScale;
  traversalIterations: number;
  pagerankIterations: number;

  // v0.1.6 new fields - override with optional versions
  api?: APIType;
  storage?: StorageType;
  warmup?: boolean;

  // Enable/disable v0.1.6 benchmarks
  enableAPIComparison?: boolean;
  enableDML?: boolean;
  enablePersistence?: boolean;
  enableStatistics?: boolean;
  enableVector?: boolean;
  enableOptimizer?: boolean;
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

  // ==================== v0.1.5 New Benchmark Methods ====================

  /**
   * Run API Comparison benchmark (Cypher vs JavaScript)
   */
  async runAPIComparison(javascriptEngine: EngineAdapter | null): Promise<void> {
    if (!this.config.enableAPIComparison) {
      return;
    }

    const apiBench = new APIComparisonBenchmark(
      this.engine,
      javascriptEngine,
      { nodeCount: 10000, edgeCount: 50000, iterations: 10 }
    );

    const result = await apiBench.run();
    if (result) {
      this.recorder.recordAPIComparison(this.engine.name, this.config.scale, result);
    }
  }

  /**
   * Run DML Operations benchmark
   */
  async runDMLBenchmark(): Promise<void> {
    if (!this.config.enableDML) {
      return;
    }

    const dmlBench = new DMLOperationsBenchmark(this.engine);
    const result = await dmlBench.run();
    if (result) {
      this.recorder.recordDML(this.engine.name, this.config.scale, result);
    }
  }

  /**
   * Run Persistence benchmark
   */
  async runPersistenceBenchmark(): Promise<void> {
    if (!this.config.enablePersistence) {
      return;
    }

    const storage = this.config.storage || 'memory';
    const persistBench = new PersistenceBenchmark(storage);
    const result = await persistBench.run();
    this.recorder.recordPersistence(this.engine.name, this.config.scale, result);
  }

  /**
   * Run Statistics benchmark
   */
  async runStatisticsBenchmark(): Promise<void> {
    if (!this.config.enableStatistics) {
      return;
    }

    const statsBench = new StatisticsBenchmark();
    const result = await statsBench.run();
    if (result) {
      this.recorder.recordStatistics(this.engine.name, this.config.scale, result);
    }
  }

  /**
   * Run all v0.1.6 benchmarks
   */
  async runV016Benchmarks(javascriptEngine?: EngineAdapter | null): Promise<void> {
    console.log('\n🎯 Running v0.1.6 Benchmark Suite');
    console.log('='.repeat(60));

    await this.runAPIComparison(javascriptEngine || null);
    await this.runDMLBenchmark();
    await this.runPersistenceBenchmark();
    await this.runStatisticsBenchmark();
    await this.runVectorBenchmark();
    await this.runOptimizerBenchmark();

    console.log('\n✅ v0.1.6 benchmarks complete');
  }

  /**
   * Run Vector Search benchmark
   */
  async runVectorBenchmark(): Promise<void> {
    if (!this.config.enableVector) {
      return;
    }

    const vectorBench = new VectorSearchBenchmark({
      dimension: 128,
      numVectors: 10000,
      numQueries: 100,
      searchK: 10
    });
    const result = await vectorBench.run(this.engine);
    if (result) {
      this.recorder.recordVectorSearch(this.engine.name, this.config.scale, result);
    }
  }

  /**
   * Run Optimizer benchmark
   */
  async runOptimizerBenchmark(): Promise<void> {
    if (!this.config.enableOptimizer) {
      return;
    }

    const optimizerBench = new OptimizerBenchmark({ iterations: 10 });
    const result = await optimizerBench.run(this.engine);
    if (result) {
      this.recorder.recordOptimizer(this.engine.name, this.config.scale, result);
    }

    const logicalResult = await optimizerBench.runLogical(this.engine);
    if (logicalResult) {
      this.recorder.recordLogicalOptimizer(this.engine.name, this.config.scale, logicalResult);
    }
  }

  /**
   * Run all v0.1.5 benchmarks (deprecated - use runV016Benchmarks)
   */
  async runV015Benchmarks(javascriptEngine?: EngineAdapter | null): Promise<void> {
    await this.runV016Benchmarks(javascriptEngine);
  }
}

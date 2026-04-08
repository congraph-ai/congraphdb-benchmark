import fs from 'fs/promises';
import path from 'path';
import { BenchmarkResult, EngineType, DataScale, APIComparisonResult, DMLTestResult, PersistenceResult, StatisticsResult, VectorSearchResult, OptimizerResult, LogicalOptimizerResult } from '../types.js';

// Type for v0.1.6 extended benchmark results
interface V016Result {
  benchmarkType: string;
  engine: EngineType;
  scale: DataScale;
  timestamp: number;
  result: APIComparisonResult | DMLTestResult | PersistenceResult | StatisticsResult | VectorSearchResult | OptimizerResult | LogicalOptimizerResult;
}

export class MetricsRecorder {
  private results: Map<string, BenchmarkResult[]> = new Map();
  private v016Results: Map<string, V016Result[]> = new Map();

  constructor(private resultsDir: string = './results') {}

  /**
   * Record a benchmark result
   */
  record(result: BenchmarkResult): void {
    const key = `${result.engine}-${result.scale}`;
    const existing = this.results.get(key) || [];
    this.results.set(key, [...existing, result]);
  }

  /**
   * Get all recorded results
   */
  getAllResults(): BenchmarkResult[] {
    return Array.from(this.results.values()).flat();
  }

  /**
   * Get results filtered by engine and/or scale
   */
  getResults(engine?: EngineType, scale?: DataScale): BenchmarkResult[] {
    let results = this.getAllResults();

    if (engine) {
      results = results.filter(r => r.engine === engine);
    }

    if (scale) {
      results = results.filter(r => r.scale === scale);
    }

    return results;
  }

  /**
   * Export results to CSV format
   */
  async exportToCSV(filename?: string): Promise<string> {
    const results = this.getAllResults();
    if (results.length === 0) {
      throw new Error('No results to export');
    }

    const filepath = filename || path.join(
      this.resultsDir,
      `benchmark-${Date.now()}.csv`
    );

    // Ensure results directory exists
    await fs.mkdir(this.resultsDir, { recursive: true });

    // Build CSV header
    const headers = [
      'timestamp',
      'engine',
      'scale',
      'ingestion_nodes_per_sec',
      'ingestion_edges_per_sec',
      'ingestion_total_time_ms',
      'traversal_1hop_avg_ms',
      'traversal_2hop_avg_ms',
      'traversal_3hop_avg_ms',
      'traversal_4hop_avg_ms',
      'traversal_5hop_avg_ms',
      'pagerank_time_ms',
      'memory_peak_mb',
    ];

    // Build CSV rows
    const rows = results.map(r => [
      r.timestamp,
      r.engine,
      r.scale,
      r.results.ingestion.nodesPerSecond.toFixed(2),
      r.results.ingestion.edgesPerSecond.toFixed(2),
      r.results.ingestion.totalTimeMs,
      r.results.traversals[0]?.averageTimeMs.toFixed(2) || 'N/A',
      r.results.traversals[1]?.averageTimeMs.toFixed(2) || 'N/A',
      r.results.traversals[2]?.averageTimeMs.toFixed(2) || 'N/A',
      r.results.traversals[3]?.averageTimeMs.toFixed(2) || 'N/A',
      r.results.traversals[4]?.averageTimeMs.toFixed(2) || 'N/A',
      r.results.algorithms.pagerankTimeMs,
      r.results.memory.peakRssMb.toFixed(2),
    ]);

    // Write CSV file
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    await fs.writeFile(filepath, csvContent);
    return filepath;
  }

  /**
   * Export results to JSON format
   */
  async exportToJSON(filename?: string): Promise<string> {
    const results = this.getAllResults();
    if (results.length === 0) {
      throw new Error('No results to export');
    }

    const filepath = filename || path.join(
      this.resultsDir,
      `benchmark-${Date.now()}.json`
    );

    await fs.mkdir(this.resultsDir, { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(results, null, 2));
    return filepath;
  }

  /**
   * Generate a summary comparison table
   */
  generateSummary(): string {
    const results = this.getAllResults();
    if (results.length === 0) {
      return 'No results to summarize.';
    }

    // Group by scale
    const byScale = new Map<DataScale, BenchmarkResult[]>();
    for (const r of results) {
      const existing = byScale.get(r.scale) || [];
      byScale.set(r.scale, [...existing, r]);
    }

    let summary = '# CongraphDB Benchmark Results Summary\n\n';

    for (const [scale, scaleResults] of byScale) {
      summary += `## ${scale.toUpperCase()} Scale\n\n`;
      summary += '| Engine | Ingestion (nodes/s) | 1-hop (ms) | 3-hop (ms) | 5-hop (ms) | PageRank (ms) | Memory (MB) |\n';
      summary += '|--------|---------------------|------------|------------|------------|---------------|-------------|\n';

      for (const r of scaleResults) {
        summary += `| ${r.engine} | ${r.results.ingestion.nodesPerSecond.toFixed(0)} | `;
        summary += `${r.results.traversals[0]?.averageTimeMs.toFixed(2) || 'N/A'} | `;
        summary += `${r.results.traversals[2]?.averageTimeMs.toFixed(2) || 'N/A'} | `;
        summary += `${r.results.traversals[4]?.averageTimeMs.toFixed(2) || 'N/A'} | `;
        summary += `${r.results.algorithms.pagerankTimeMs} | `;
        summary += `${r.results.memory.peakRssMb.toFixed(2)} |\n`;
      }
      summary += '\n';
    }

    return summary;
  }

  /**
   * Clear all recorded results
   */
  clear(): void {
    this.results.clear();
  }

  // ==================== v0.1.6 New Recording Methods ====================

  /**
   * Record API comparison results
   */
  recordAPIComparison(engine: EngineType, scale: DataScale, result: APIComparisonResult): void {
    this.recordV016Result('api-comparison', engine, scale, result);
  }

  /**
   * Record DML operation results
   */
  recordDML(engine: EngineType, scale: DataScale, result: DMLTestResult): void {
    this.recordV016Result('dml', engine, scale, result);
  }

  /**
   * Record persistence benchmark results
   */
  recordPersistence(engine: EngineType, scale: DataScale, result: PersistenceResult): void {
    this.recordV016Result('persistence', engine, scale, result);
  }

  /**
   * Record statistics benchmark results
   */
  recordStatistics(engine: EngineType, scale: DataScale, result: StatisticsResult): void {
    this.recordV016Result('statistics', engine, scale, result);
  }

  /**
   * Record vector search benchmark results
   */
  recordVectorSearch(engine: EngineType, scale: DataScale, result: VectorSearchResult): void {
    this.recordV016Result('vector-search', engine, scale, result);
  }

  /**
   * Record optimizer benchmark results
   */
  recordOptimizer(engine: EngineType, scale: DataScale, result: OptimizerResult): void {
    this.recordV016Result('optimizer', engine, scale, result);
  }

  /**
   * Record logical optimizer benchmark results
   */
  recordLogicalOptimizer(engine: EngineType, scale: DataScale, result: LogicalOptimizerResult): void {
    this.recordV016Result('logical-optimizer', engine, scale, result);
  }

  /**
   * Generic method to record v0.1.6 benchmark results
   */
  private recordV016Result(
    benchmarkType: string,
    engine: EngineType,
    scale: DataScale,
    result: APIComparisonResult | DMLTestResult | PersistenceResult | StatisticsResult | VectorSearchResult | OptimizerResult | LogicalOptimizerResult
  ): void {
    const key = `${engine}-${scale}-${benchmarkType}`;
    const timestampedResult: V016Result = {
      benchmarkType,
      engine,
      scale,
      timestamp: Date.now(),
      result,
    };

    // Store in separate v0.1.6 results map
    const existing = this.v016Results.get(key) || [];
    this.v016Results.set(key, [...existing, timestampedResult]);
  }

  /**
   * Generate extended summary with v0.1.6 benchmarks
   */
  generateExtendedSummary(): string {
    const baseSummary = this.generateSummary();
    let v016Summary = '\n## v0.1.6 Extended Benchmarks\n\n';

    // Get all v0.1.6 results
    const v016Results = Array.from(this.v016Results.values())
      .flat();

    if (v016Results.length === 0) {
      return baseSummary;
    }

    // Group by benchmark type
    const byType = new Map<string, V016Result[]>();
    for (const r of v016Results) {
      const existing = byType.get(r.benchmarkType) || [];
      byType.set(r.benchmarkType, [...existing, r]);
    }

    // API Comparison
    if (byType.has('api-comparison')) {
      v016Summary += '### API Comparison (Cypher vs JavaScript)\n\n';
      v016Summary += '| Engine | Cypher Ops/s | JS Ops/s | Ratio |\n';
      v016Summary += '|--------|--------------|----------|-------|\n';

      for (const r of byType.get('api-comparison')!) {
        const apiResult = r.result as APIComparisonResult;
        v016Summary += `| ${r.engine} | ${apiResult.cypher.nodeCreateOps} | ${apiResult.javascript.nodeCreateOps} | ${apiResult.ratio.toFixed(2)}x |\n`;
      }
      v016Summary += '\n';
    }

    // DML Operations
    if (byType.has('dml')) {
      v016Summary += '### DML Operations\n\n';
      v016Summary += '| Engine | SET (ops/s) | DELETE (ops/s) | MERGE (ops/s) | REMOVE (ops/s) |\n';
      v016Summary += '|--------|------------|---------------|---------------|----------------|\n';

      for (const r of byType.get('dml')!) {
        const dml = r.result as DMLTestResult;
        v016Summary += `| ${r.engine} | ${dml.set.opsPerSecond} | ${dml.delete.opsPerSecond} | `;
        v016Summary += `${dml.merge.opsPerSecond} | ${dml.remove.opsPerSecond} |\n`;
      }
      v016Summary += '\n';
    }

    // Persistence
    if (byType.has('persistence')) {
      v016Summary += '### Persistence & Storage\n\n';
      v016Summary += '| Engine | Mode | I/O Overhead | Checkpoint (ms) | Recovery (ms) |\n';
      v016Summary += '|--------|------|--------------|----------------|---------------|\n';

      for (const r of byType.get('persistence')!) {
        const p = r.result as PersistenceResult;
        v016Summary += `| ${r.engine} | ${p.mode} | ${p.ioOverheadPercent}% | ${p.checkpointTimeMs} | `;
        v016Summary += `${p.recoveryTimeMs || 'N/A'} |\n`;
      }
      v016Summary += '\n';
    }

    // Statistics
    if (byType.has('statistics')) {
      v016Summary += '### Query Statistics Overhead\n\n';
      v016Summary += '| Engine | Stats Enabled (ms) | Stats Disabled (ms) | Overhead % |\n';
      v016Summary += '|--------|-------------------|--------------------|------------|\n';

      for (const r of byType.get('statistics')!) {
        const s = r.result as StatisticsResult;
        v016Summary += `| ${r.engine} | ${s.statsEnabledTimeMs} | ${s.statsDisabledTimeMs} | ${s.overheadPercent}% |\n`;
      }
      v016Summary += '\n';
    }

    // Vector Search (NEW in v0.1.6)
    if (byType.has('vector-search')) {
      v016Summary += '### Vector Search (HNSW Index)\n\n';
      v016Summary += '| Engine | Dimension | Index Type | Build Time (ms) | QPS | Recall | Index Size (KB) |\n';
      v016Summary += '|--------|-----------|------------|-----------------|-----|--------|----------------|\n';

      for (const r of byType.get('vector-search')!) {
        const v = r.result as VectorSearchResult;
        v016Summary += `| ${r.engine} | ${v.vectorDimension} | ${v.indexType} | ${v.buildTimeMs} | `;
        v016Summary += `${v.queriesPerSecond} | ${v.recall.toFixed(3)} | ${(v.indexSizeBytes / 1024).toFixed(2)} |\n`;
      }
      v016Summary += '\n';
    }

    // Optimizer (NEW in v0.1.6)
    if (byType.has('optimizer')) {
      v016Summary += '### Query Optimizer (CBO vs RBO)\n\n';
      v016Summary += '| Engine | Type | Query Time (ms) | Planning (ms) | Execution (ms) | Improvement % |\n';
      v016Summary += '|--------|------|-----------------|---------------|-----------------|---------------|\n';

      for (const r of byType.get('optimizer')!) {
        const o = r.result as OptimizerResult;
        v016Summary += `| ${r.engine} | ${o.optimizerType} | ${o.queryTimeMs} | `;
        v016Summary += `${o.planningTimeMs} | ${o.executionTimeMs} | ${o.improvementPercent > 0 ? '+' : ''}${o.improvementPercent}% |\n`;
      }
      v016Summary += '\n';
    }

    // Logical Optimizer (NEW in v0.1.6)
    if (byType.has('logical-optimizer')) {
      v016Summary += '### Logical Optimizer Features\n\n';
      v016Summary += '| Engine | Predicate Pushdown (ms) | Projection Pruning (ms) | Constant Folding (ms) | Total (ms) |\n';
      v016Summary += '|--------|------------------------|------------------------|----------------------|------------|\n';

      for (const r of byType.get('logical-optimizer')!) {
        const lo = r.result as LogicalOptimizerResult;
        v016Summary += `| ${r.engine} | ${lo.predicatePushdownTimeMs} | ${lo.projectionPruningTimeMs} | `;
        v016Summary += `${lo.constantFoldingTimeMs} | ${lo.totalTimeMs} |\n`;
      }
      v016Summary += '\n';
    }

    return baseSummary + v016Summary;
  }

  /**
   * Export v0.1.6 results to separate JSON file
   */
  async exportV016ToJSON(filename?: string): Promise<string> {
    const v016Results = Array.from(this.v016Results.values())
      .flat();

    if (v016Results.length === 0) {
      throw new Error('No v0.1.6 results to export');
    }

    const filepath = filename || path.join(
      this.resultsDir,
      `benchmark-v016-${Date.now()}.json`
    );

    await fs.mkdir(this.resultsDir, { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(v016Results, null, 2));
    return filepath;
  }

  /**
   * Export v0.1.5 results to separate JSON file (deprecated - use exportV016ToJSON)
   */
  async exportV015ToJSON(filename?: string): Promise<string> {
    return this.exportV016ToJSON(filename);
  }

  /**
   * Export v0.1.8 results to separate JSON file
   */
  async exportV018ToJSON(filename?: string): Promise<string> {
    const v016Results = Array.from(this.v016Results.values())
      .flat()
      .filter(r => ['occ', 'schema', 'algorithms'].includes(r.benchmarkType));

    const filepath = filename || path.join(
      this.resultsDir,
      `benchmark-v018-${Date.now()}.json`
    );

    await fs.mkdir(this.resultsDir, { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(v016Results, null, 2));
    return filepath;
  }

  /**
   * Export v0.1.10 results to separate JSON file
   */
  async exportV0110ToJSON(filename?: string): Promise<string> {
    const v016Results = Array.from(this.v016Results.values())
      .flat()
      .filter(r => ['document', 'sql'].includes(r.benchmarkType));

    const filepath = filename || path.join(
      this.resultsDir,
      `benchmark-v0110-${Date.now()}.json`
    );

    await fs.mkdir(this.resultsDir, { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(v016Results, null, 2));
    return filepath;
  }
}

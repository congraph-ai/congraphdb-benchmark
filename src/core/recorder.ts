import fs from 'fs/promises';
import path from 'path';
import { BenchmarkResult, EngineType, DataScale } from '../types.js';

export class MetricsRecorder {
  private results: Map<string, BenchmarkResult[]> = new Map();

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
}

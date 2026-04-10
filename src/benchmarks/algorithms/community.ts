import { Database, Connection } from 'congraphdb';
import { DataScale, DATA_SCALES } from '../../types.js';
import { unwrap, unwrapAsync } from '../../utils/napi-helpers.js';

/**
 * Community Detection Algorithm Benchmarks
 *
 * Tests Louvain, Leiden, Spectral, SLPA, Infomap, and Label Propagation algorithms.
 */
export class CommunityDetectionBenchmark {
  private db?: Database;
  private conn?: Connection;

  constructor(private scale: DataScale = 'medium') {}

  /**
   * Run community detection benchmarks
   */
  async run(): Promise<CommunityDetectionResult> {
    console.log('\n  👥 Community Detection Algorithm Benchmarks');
    console.log('  ' + '='.repeat(50));
    console.log(`  Scale: ${this.scale.toUpperCase()}`);

    const dbPath = `./benchmark-community-${Date.now()}.cgraph`;

    // Initialize database
    this.db = new Database(dbPath);
    unwrap(this.db.init(), 'Failed to initialize database');
    this.conn = unwrap(this.db.createConnection(), 'Failed to create connection');

    // Create test graph (citation network pattern)
    await this.setupTestGraph();

    // Run benchmarks
    const louvain = await this.benchmarkLouvain();
    const leiden = await this.benchmarkLeiden();
    const spectral = await this.benchmarkSpectral();
    const slpa = await this.benchmarkSLPA();
    const infomap = await this.benchmarkInfomap();
    const labelPropagation = await this.benchmarkLabelPropagation();

    // Cleanup
    this.conn = undefined;
    this.db?.close();
    this.db = undefined;
    this.cleanupTestFile(dbPath);

    return {
      scale: this.scale,
      louvain,
      leiden,
      spectral,
      slpa,
      infomap,
      labelPropagation
    };
  }

  /**
   * Setup test graph (citation network with community structure)
   */
  private async setupTestGraph(): Promise<void> {
    if (!this.conn) throw new Error('Not connected');

    const nodeCount = Math.min(DATA_SCALES[this.scale].nodes, 5000);
    const communityCount = 20;
    const nodesPerCommunity = Math.floor(nodeCount / communityCount);

    console.log(`  📊 Creating citation network (${nodeCount} nodes, ${communityCount} communities)...`);

    await unwrapAsync(this.conn.query(`
      CREATE NODE TABLE Paper(id STRING, title STRING, community INT64, PRIMARY KEY(id))
    `), 'Failed to create Paper table');

    await unwrapAsync(this.conn.query(`
      CREATE REL TABLE Cites(FROM Paper TO Paper)
    `), 'Failed to create Cites table');

    // Create papers in communities
    for (let c = 0; c < communityCount; c++) {
      for (let i = 0; i < nodesPerCommunity; i++) {
        const id = `p_${c}_${i}`;
        await unwrapAsync(this.conn.query(`
          CREATE (:Paper {id: '${id}', title: 'Paper ${c}-${i}', community: ${c}})
        `), `Failed to create paper ${id}`);
      }
    }

    // Create citations (mostly within communities, some cross-community)
    const edgeCount = Math.min(DATA_SCALES[this.scale].edges, 20000);
    for (let i = 0; i < edgeCount; i++) {
      const fromComm = Math.floor(Math.random() * communityCount);
      const toComm = Math.random() < 0.8 ? fromComm : Math.floor(Math.random() * communityCount);

      const fromNode = `p_${fromComm}_${Math.floor(Math.random() * nodesPerCommunity)}`;
      const toNode = `p_${toComm}_${Math.floor(Math.random() * nodesPerCommunity)}`;

      if (fromNode !== toNode) {
        await unwrapAsync(this.conn.query(`
          MATCH (f:Paper {id: '${fromNode}'}), (t:Paper {id: '${toNode}'})
          CREATE (f)-[:Cites]->(t)
        `), `Failed to create citation from ${fromNode} to ${toNode}`);
      }
    }

    console.log('  ✓ Citation network created');
  }

  /**
   * Benchmark Louvain algorithm
   */
  private async benchmarkLouvain(): Promise<CommunityAlgorithmResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Benchmarking Louvain...');

    const resolutions = [0.5, 1.0, 2.0];
    const results: Array<{ resolution: number; timeMs: number; communityCount: number }> = [];

    for (const resolution of resolutions) {
      const start = performance.now();
      const resultJson = unwrap(this.conn.runAlgorithmSync('louvain', JSON.stringify({
        resolution,
        maxIterations: 20
      })), 'Louvain failed');
      const result = JSON.parse(resultJson);
      const elapsed = performance.now() - start;

      const communities = new Set(result.map((r: any) => r.communityId));
      results.push({
        resolution,
        timeMs: Math.round(elapsed),
        communityCount: communities.size
      });
    }

    return {
      results,
      bestTimeMs: Math.min(...results.map(r => r.timeMs))
    };
  }

  /**
   * Benchmark Leiden algorithm
   */
  private async benchmarkLeiden(): Promise<CommunityAlgorithmResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Benchmarking Leiden...');

    const resolutions = [0.5, 1.0, 2.0];
    const results: Array<{ resolution: number; timeMs: number; communityCount: number }> = [];

    for (const resolution of resolutions) {
      const start = performance.now();
      const resultJson = unwrap(this.conn.runAlgorithmSync('leiden', JSON.stringify({
        resolution,
        maxIterations: 20
      })), 'Leiden failed');
      const result = JSON.parse(resultJson);
      const elapsed = performance.now() - start;

      const communities = new Set(result.map((r: any) => r.communityId));
      results.push({
        resolution,
        timeMs: Math.round(elapsed),
        communityCount: communities.size
      });
    }

    return {
      results,
      bestTimeMs: Math.min(...results.map(r => r.timeMs))
    };
  }

  /**
   * Benchmark Spectral Clustering algorithm
   */
  private async benchmarkSpectral(): Promise<SpectralResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Benchmarking Spectral Clustering...');

    const clusterCounts = [10, 20, 50];
    const results: Array<{ numClusters: number; timeMs: number; communityCount: number }> = [];

    for (const numClusters of clusterCounts) {
      const start = performance.now();
      const resultJson = unwrap(this.conn.runAlgorithmSync('spectral', JSON.stringify({
        maxIterations: 20,
        numClusters
      })), 'Spectral failed');
      const result = JSON.parse(resultJson);
      const elapsed = performance.now() - start;

      const communities = new Set(result.map((r: any) => r.clusterId));
      results.push({
        numClusters,
        timeMs: Math.round(elapsed),
        communityCount: communities.size
      });
    }

    return {
      results,
      bestTimeMs: Math.min(...results.map(r => r.timeMs))
    };
  }

  /**
   * Benchmark SLPA algorithm (overlapping communities)
   */
  private async benchmarkSLPA(): Promise<SLPAResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Benchmarking SLPA...');

    const thresholds = [0.05, 0.1, 0.2];
    const results: Array<{ threshold: number; timeMs: number; avgCommunitiesPerNode: number }> = [];

    for (const threshold of thresholds) {
      const start = performance.now();
      const resultJson = unwrap(this.conn.runAlgorithmSync('slpa', JSON.stringify({
        threshold,
        maxIterations: 20
      })), 'SLPA failed');
      const result = JSON.parse(resultJson);
      const elapsed = performance.now() - start;

      const avgCommunities = result.reduce((sum: number, r: any) =>
        sum + (r.communities?.length || 1), 0) / result.length;

      results.push({
        threshold,
        timeMs: Math.round(elapsed),
        avgCommunitiesPerNode: Math.round(avgCommunities * 100) / 100
      });
    }

    return {
      results,
      bestTimeMs: Math.min(...results.map(r => r.timeMs))
    };
  }

  /**
   * Benchmark Infomap algorithm
   */
  private async benchmarkInfomap(): Promise<CommunityAlgorithmResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Benchmarking Infomap...');

    const iterations = [10, 20, 30];
    const results: Array<{ resolution: number; timeMs: number; communityCount: number }> = [];

    for (const maxIterations of iterations) {
      const start = performance.now();
      const resultJson = unwrap(this.conn.runAlgorithmSync('infomap', JSON.stringify({
        maxIterations
      })), 'Infomap failed');
      const result = JSON.parse(resultJson);
      const elapsed = performance.now() - start;

      const communities = new Set(result.map((r: any) => r.communityId));
      results.push({
        resolution: maxIterations,
        timeMs: Math.round(elapsed),
        communityCount: communities.size
      });
    }

    return {
      results,
      bestTimeMs: Math.min(...results.map(r => r.timeMs))
    };
  }

  /**
   * Benchmark Label Propagation algorithm
   */
  private async benchmarkLabelPropagation(): Promise<LabelPropagationResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Benchmarking Label Propagation...');

    const iterations = [10, 20, 50];
    const results: Array<{ maxIterations: number; timeMs: number; communityCount: number }> = [];

    for (const maxIterations of iterations) {
      const start = performance.now();
      const resultJson = unwrap(this.conn.runAlgorithmSync('labelPropagation', JSON.stringify({
        maxIterations
      })), 'Label propagation failed');
      const result = JSON.parse(resultJson);
      const elapsed = performance.now() - start;

      const communities = new Set(result.map((r: any) => r.label));
      results.push({
        maxIterations,
        timeMs: Math.round(elapsed),
        communityCount: communities.size
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
export interface CommunityDetectionResult {
  scale: DataScale;
  louvain: CommunityAlgorithmResult;
  leiden: CommunityAlgorithmResult;
  spectral: SpectralResult;
  slpa: SLPAResult;
  infomap: CommunityAlgorithmResult;
  labelPropagation: LabelPropagationResult;
}

export interface CommunityAlgorithmResult {
  results: Array<{ resolution: number; timeMs: number; communityCount: number }>;
  bestTimeMs: number;
}

export interface SpectralResult {
  results: Array<{ numClusters: number; timeMs: number; communityCount: number }>;
  bestTimeMs: number;
}

export interface SLPAResult {
  results: Array<{ threshold: number; timeMs: number; avgCommunitiesPerNode: number }>;
  bestTimeMs: number;
}

export interface LabelPropagationResult {
  results: Array<{ maxIterations: number; timeMs: number; communityCount: number }>;
  bestTimeMs: number;
}

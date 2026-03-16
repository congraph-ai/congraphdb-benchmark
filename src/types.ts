// Benchmark type definitions

export type DataScale = 'small' | 'medium' | 'large';

export type EngineType = 'congraph' | 'neo4j' | 'kuzu' | 'sqlite' | 'graphology' | 'levelgraph';

export interface DataScaleConfig {
  name: DataScale;
  nodes: number;
  edges: number;
}

export const DATA_SCALES: Record<DataScale, DataScaleConfig> = {
  small: { name: 'small', nodes: 10_000, edges: 50_000 },
  medium: { name: 'medium', nodes: 100_000, edges: 1_000_000 },
  large: { name: 'large', nodes: 1_000_000, edges: 10_000_000 },
};

export interface Node {
  id: string;
  label: string;
  properties: Record<string, any>;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  label: string;
  properties?: Record<string, any>;
}

export interface BenchmarkResult {
  engine: EngineType;
  scale: DataScale;
  timestamp: number;
  results: TestResults;
}

export interface TestResults {
  ingestion: IngestionResult;
  traversals: TraversalResult[];
  algorithms: AlgorithmResult;
  memory: MemoryResult;
}

export interface IngestionResult {
  nodesPerSecond: number;
  edgesPerSecond: number;
  totalTimeMs: number;
  nodeCount: number;
  edgeCount: number;
}

export interface TraversalResult {
  hops: number;
  coldStartMs: number;
  warmStartMs: number;
  averageTimeMs: number;
  iterations: number;
}

export interface AlgorithmResult {
  pagerankTimeMs: number;
  iterations: number;
}

export interface MemoryResult {
  peakRssBytes: number;
  peakRssMb: number;
}

export interface EngineAdapter {
  name: EngineType;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  clear(): Promise<void>;
  ingestNodes(nodes: Node[]): Promise<number>;
  ingestEdges(edges: Edge[]): Promise<number>;
  traverse(sourceId: string, hops: number): Promise<number>;
  runPageRank(iterations: number): Promise<number>;
  getMemoryUsage(): number;
}

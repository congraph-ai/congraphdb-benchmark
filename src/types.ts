// Benchmark type definitions

export type DataScale = 'small' | 'medium' | 'large';

export type EngineType = 'congraph' | 'neo4j' | 'kuzu' | 'sqlite' | 'graphology' | 'levelgraph' | 'congraph-persistence' | 'congraph-stats';

export type APIType = 'cypher' | 'javascript' | 'both';

export type StorageType = 'memory' | 'file';

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

// v0.1.5 New result types

export interface APITestResult {
  nodeCreateOps: number;
  nodeReadOps: number;
  nodeUpdateOps: number;
  nodeDeleteOps: number;
  edgeCreateOps: number;
  edgeReadOps: number;
  patternMatchMs: number;
  traversalMs: number;
  totalTimeMs: number;
}

export interface APIComparisonResult {
  cypher: APITestResult;
  javascript: APITestResult;
  ratio: number; // javascript/cypher
}

export interface DMLResult {
  operation: 'SET' | 'DELETE' | 'MERGE' | 'REMOVE';
  opsPerSecond: number;
  totalTimeMs: number;
  affectedRows: number;
}

export interface DMLTestResult {
  set: DMLResult;
  delete: DMLResult;
  merge: DMLResult;
  remove: DMLResult;
}

export interface PersistenceResult {
  mode: StorageType;
  ioOverheadPercent: number;
  checkpointTimeMs: number;
  recoveryTimeMs?: number;
}

export interface StatisticsResult {
  statsEnabledTimeMs: number;
  statsDisabledTimeMs: number;
  overheadPercent: number;
}

// Extended test results with v0.1.5 additions
export interface ExtendedTestResults extends TestResults {
  // Optional new benchmark categories
  dml?: DMLTestResult;
  persistence?: PersistenceResult;
  statistics?: StatisticsResult;
  apiComparison?: APIComparisonResult;
}

export interface BenchmarkConfig {
  scale: DataScale;
  api: APIType;
  storage: StorageType;
  traversalIterations: number;
  pagerankIterations: number;
  warmup: boolean;
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

  // v0.1.5 optional methods (with default implementations)
  dmlSet?(nodeId: string, properties: Record<string, any>): Promise<number>;
  dmlDelete?(nodeId: string, detach?: boolean): Promise<number>;
  dmlMerge?(nodeId: string, label: string, properties: Record<string, any>): Promise<number>;
  dmlRemove?(nodeId: string, property: string): Promise<number>;
  checkpoint?(): Promise<number>;
  withStatistics?(enabled: boolean): void;
}

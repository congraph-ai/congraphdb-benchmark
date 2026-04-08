#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import { MetricsRecorder } from './core/recorder.js';
import { BenchmarkSuite, SuiteConfig } from './core/suite.js';
import { AcademicNetworkGenerator } from './data/academic.js';
import { DataScale, EngineType, EngineAdapter } from './types.js';

// Import engines
import { CongraphEngine } from './engines/congraph.js';
import { Neo4jEngine } from './engines/neo4j.js';
import { KuzuEngine } from './engines/kuzu.js';
import { SQLiteEngine } from './engines/sqlite.js';
import { GraphologyEngine } from './engines/graphology.js';
import { LevelGraphEngine } from './engines/levelgraph.js';

// Import v0.1.5 engine adapters (available but not directly used in CLI)
// import { PersistenceEngineAdapter } from './benchmarks/persistence.js';
// import { StatisticsBenchmark, StatisticsEngineAdapter } from './benchmarks/statistics.js';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('congraphdb-benchmark')
  .description('Performance benchmark suite for CongraphDB')
  .version('1.0.0');

program
  .command('run')
  .description('Run benchmark suite')
  .option('-e, --engines <engines>', 'Comma-separated list of engines to benchmark', 'congraph,sqlite,levelgraph,graphology')
  .option('-s, --scale <scale>', 'Data scale: small, medium, or large', 'medium')
  .option('-o, --output <format>', 'Output format: json, csv, or both', 'both')
  .option('-v, --verbose', 'Verbose output', false)
  // v0.1.6 options
  .option('--api <apiType>', 'API type to benchmark: cypher, javascript, or both', 'cypher')
  .option('--storage <storageType>', 'Storage type: memory or file', 'memory')
  .option('--v016', 'Enable v0.1.6 extended benchmarks (API comparison, DML, persistence, statistics, vector, optimizer)', false)
  .option('--benchmarks <benchmarks>', 'Comma-separated list of v0.1.6 benchmarks: api,dml,persistence,statistics,vector,optimizer', 'all')
  // v0.1.8 options
  .option('--v018', 'Enable v0.1.8 benchmarks (OCC, Schema API, Algorithms)', false)
  .option('--v018-benchmarks <benchmarks>', 'Comma-separated list of v0.1.8 benchmarks: occ,schema,algorithms', 'all')
  // v0.1.10 options
  .option('--v0110', 'Enable v0.1.10 benchmarks (Document API, SQL DDL)', false)
  .option('--v0110-benchmarks <benchmarks>', 'Comma-separated list of v0.1.10 benchmarks: document,sql', 'all')
  .action(async (options) => {
    await runBenchmarks(options);
  });

program
  .command('compare')
  .description('Compare existing benchmark results')
  .option('-s, --scale <scale>', 'Filter by scale')
  .action(async (options) => {
    await compareResults(options);
  });

async function runBenchmarks(options: any) {
  const {
    engines: enginesList,
    scale: scaleStr,
    output,
    verbose,
    api: apiType,
    storage: storageType,
    v016: enableV016,
    benchmarks: v016Benchmarks,
    v018: enableV018,
    'v018-benchmarks': v018Benchmarks,
    v0110: enableV0110,
    'v0110-benchmarks': v0110Benchmarks
  } = options;

  // Validate scale
  const scale = validateScale(scaleStr);
  if (!scale) {
    console.error(`❌ Invalid scale: ${scaleStr}. Must be 'small', 'medium', or 'large'.`);
    process.exit(1);
  }

  // Validate API type
  const api = validateAPIType(apiType);
  if (!api) {
    console.error(`❌ Invalid API type: ${apiType}. Must be 'cypher', 'javascript', or 'both'.`);
    process.exit(1);
  }

  // Validate storage type
  const storage = validateStorageType(storageType);
  if (!storage) {
    console.error(`❌ Invalid storage type: ${storageType}. Must be 'memory' or 'file'.`);
    process.exit(1);
  }

  // Parse engines
  const engines = parseEngines(enginesList);

  // Parse v0.1.6 benchmarks
  const enabledV016Benchmarks = parseV016Benchmarks(v016Benchmarks, enableV016);

  // Parse v0.1.8 benchmarks
  const enabledV018Benchmarks = parseV018Benchmarks(v018Benchmarks, enableV018);

  // Parse v0.1.10 benchmarks
  const enabledV0110Benchmarks = parseV0110Benchmarks(v0110Benchmarks, enableV0110);

  console.log('🔬 CongraphDB Benchmark Suite v0.1.8');
  console.log('='.repeat(50));
  console.log(`Scale: ${scale.toUpperCase()}`);
  console.log(`API: ${api.toUpperCase()}`);
  console.log(`Storage: ${storage.toUpperCase()}`);
  console.log(`Engines: ${engines.join(', ')}`);

  if (enableV016) {
    console.log(`\n🎯 v0.1.6 Benchmarks: ${enabledV016Benchmarks.join(', ')}`);
  }
  if (enableV018) {
    console.log(`\n🎯 v0.1.8 Benchmarks: ${enabledV018Benchmarks.join(', ')}`);
  }
  if (enableV0110) {
    console.log(`\n🎯 v0.1.10 Benchmarks: ${enabledV0110Benchmarks.join(', ')}`);
  }
  console.log('');

  const recorder = new MetricsRecorder();
  const generator = new AcademicNetworkGenerator();

  // Generate dataset
  console.log('📊 Generating dataset...');
  // Flush to ensure message appears
  if (process.stdout.write) process.stdout.write('\n');

  const startTime = Date.now();
  const { nodes, edges } = generator.generateDataset(scale);
  const elapsed = Date.now() - startTime;

  console.log(`\n   Generated ${nodes.length.toLocaleString()} nodes, ${edges.length.toLocaleString()} edges in ${(elapsed / 1000).toFixed(2)}s\n`);

  const config: SuiteConfig = {
    scale,
    traversalIterations: 10,
    pagerankIterations: 10,
    api,
    storage,
    warmup: false,
    enableAPIComparison: enabledV016Benchmarks.includes('api'),
    enableDML: enabledV016Benchmarks.includes('dml'),
    enablePersistence: enabledV016Benchmarks.includes('persistence'),
    enableStatistics: enabledV016Benchmarks.includes('statistics'),
    enableVector: enabledV016Benchmarks.includes('vector'),
    enableOptimizer: enabledV016Benchmarks.includes('optimizer'),
    // v0.1.8 benchmarks
    enableOCC: enabledV018Benchmarks.includes('occ'),
    enableSchemaAPI: enabledV018Benchmarks.includes('schema'),
    enableAlgorithms: enabledV018Benchmarks.includes('algorithms'),
    // v0.1.10 benchmarks
    enableDocument: enabledV0110Benchmarks.includes('document'),
    enableSQL: enabledV0110Benchmarks.includes('sql'),
  };

  // Run benchmarks for each engine
  for (const engineName of engines) {
    try {
      const engine = createEngine(engineName, storage);
      const suite = new BenchmarkSuite(engine, recorder, config);

      // Run standard benchmarks
      await suite.run(nodes, edges);

      // Run v0.1.6 benchmarks if enabled
      if (enableV016) {
        await suite.runV016Benchmarks();
      }

      // Run v0.1.8 benchmarks if enabled
      if (enableV018) {
        await suite.runV018Benchmarks();
      }

      // Run v0.1.10 benchmarks if enabled
      if (enableV0110) {
        await suite.runV0110Benchmarks();
      }
    } catch (error: any) {
      if (error?.code === 'ERR_MODULE_NOT_FOUND' || error?.message?.includes('bindings')) {
        console.warn(`⚠️  Skipping ${engineName}: Missing native bindings`);
        console.warn(`   (Install with: npm install better-sqlite3 --build-from-source)\n`);
      } else if (error?.message?.includes('ECONNREFUSED') || error?.message?.includes('connect ECONNREFUSED')) {
        console.warn(`⚠️  Skipping ${engineName}: Connection refused`);
        console.warn(`   (Ensure ${engineName.toUpperCase()} is running or use --engines to skip)\n`);
      } else if (error?.message?.includes('unauthorized') || error?.message?.includes('authentication')) {
        console.warn(`⚠️  Skipping ${engineName}: Authentication failed`);
        console.warn(`   (Check .env file credentials or use --engines to skip)\n`);
      } else {
        console.error(`❌ Error running ${engineName}:`, error?.message || error);
      }
    }
  }

  // Export results
  console.log('📈 Exporting results...');
  try {
    if (output === 'json' || output === 'both') {
      const jsonPath = await recorder.exportToJSON();
      console.log(`   JSON: ${jsonPath}`);
    }
    if (output === 'csv' || output === 'both') {
      const csvPath = await recorder.exportToCSV();
      console.log(`   CSV: ${csvPath}`);
    }

    // Export v0.1.6 results if enabled
    if (enableV016) {
      const v016JsonPath = await recorder.exportV016ToJSON();
      console.log(`   v0.1.6 JSON: ${v016JsonPath}`);
    }

    // Export v0.1.8 results if enabled
    if (enableV018) {
      const v018JsonPath = await recorder.exportV018ToJSON();
      console.log(`   v0.1.8 JSON: ${v018JsonPath}`);
    }

    // Export v0.1.10 results if enabled
    if (enableV0110) {
      const v0110JsonPath = await recorder.exportV0110ToJSON();
      console.log(`   v0.1.10 JSON: ${v0110JsonPath}`);
    }

    console.log('\n' + (enableV016 || enableV018 || enableV0110 ? recorder.generateExtendedSummary() : recorder.generateSummary()));
  } catch (error) {
    console.error('❌ Error exporting results:', error);
  }
}

async function compareResults(options: any) {
  const recorder = new MetricsRecorder();

  try {
    // TODO: Load existing results from files
    console.log('📊 Comparison feature - loading existing results...');
    console.log('(To be implemented: load and compare previous benchmark runs)');
  } catch (error) {
    console.error('❌ Error loading results:', error);
  }
}

function validateScale(scale: string): DataScale | null {
  if (scale === 'small' || scale === 'medium' || scale === 'large') {
    return scale;
  }
  return null;
}

function validateAPIType(api: string): 'cypher' | 'javascript' | 'both' | null {
  if (api === 'cypher' || api === 'javascript' || api === 'both') {
    return api;
  }
  return null;
}

function validateStorageType(storage: string): 'memory' | 'file' | null {
  if (storage === 'memory' || storage === 'file') {
    return storage;
  }
  return null;
}

function parseV016Benchmarks(benchmarks: string, enableV016: boolean): string[] {
  if (!enableV016) return [];

  const validBenchmarks = ['api', 'dml', 'persistence', 'statistics', 'vector', 'optimizer'];

  if (benchmarks === 'all') {
    return validBenchmarks;
  }

  const requested = benchmarks.split(',').map((b: string) => b.trim().toLowerCase());
  return requested.filter((b: string) => validBenchmarks.includes(b));
}

function parseV018Benchmarks(benchmarks: string, enableV018: boolean): string[] {
  if (!enableV018) return [];

  const validBenchmarks = ['occ', 'schema', 'algorithms'];

  if (benchmarks === 'all') {
    return validBenchmarks;
  }

  const requested = benchmarks.split(',').map((b: string) => b.trim().toLowerCase());
  return requested.filter((b: string) => validBenchmarks.includes(b));
}

function parseV0110Benchmarks(benchmarks: string, enableV0110: boolean): string[] {
  if (!enableV0110) return [];

  const validBenchmarks = ['document', 'sql'];

  if (benchmarks === 'all') {
    return validBenchmarks;
  }

  const requested = benchmarks.split(',').map((b: string) => b.trim().toLowerCase());
  return requested.filter((b: string) => validBenchmarks.includes(b));
}

function parseEngines(enginesStr: string): EngineType[] {
  const validEngines: EngineType[] = ['congraph', 'neo4j', 'kuzu', 'sqlite', 'graphology', 'levelgraph'];
  const requested = enginesStr.split(',').map((e: string) => e.trim().toLowerCase());

  return requested.filter(e => validEngines.includes(e as EngineType)) as EngineType[];
}

function createEngine(engineName: EngineType, storage: 'memory' | 'file' = 'memory'): EngineAdapter {
  switch (engineName) {
    case 'congraph':
      // For persistence benchmarks, use the special adapter
      return new CongraphEngine();
    case 'neo4j':
      return new Neo4jEngine();
    case 'kuzu':
      return new KuzuEngine();
    case 'sqlite':
      return new SQLiteEngine();
    case 'graphology':
      return new GraphologyEngine();
    case 'levelgraph':
      return new LevelGraphEngine();
    default:
      throw new Error(`Unknown engine: ${engineName}`);
  }
}

// Show help if no command provided
if (process.argv.length === 2) {
  program.help();
}

// Parse and execute (wrapped to avoid top-level await warning)
(async () => {
  await program.parseAsync(process.argv);
})();

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
  const { engines: enginesList, scale: scaleStr, output, verbose } = options;

  // Validate scale
  const scale = validateScale(scaleStr);
  if (!scale) {
    console.error(`❌ Invalid scale: ${scaleStr}. Must be 'small', 'medium', or 'large'.`);
    process.exit(1);
  }

  // Parse engines
  const engines = parseEngines(enginesList);

  console.log('🔬 CongraphDB Benchmark Suite');
  console.log('='.repeat(50));
  console.log(`Scale: ${scale.toUpperCase()}`);
  console.log(`Engines: ${engines.join(', ')}`);
  console.log('');

  const recorder = new MetricsRecorder();
  const generator = new AcademicNetworkGenerator();

  // Generate dataset
  console.log('📊 Generating dataset...');
  const { nodes, edges } = generator.generateDataset(scale);
  console.log(`   Generated ${nodes.length.toLocaleString()} nodes, ${edges.length.toLocaleString()} edges\n`);

  const config: SuiteConfig = {
    scale,
    traversalIterations: 10,
    pagerankIterations: 10,
  };

  // Run benchmarks for each engine
  for (const engineName of engines) {
    try {
      const engine = createEngine(engineName);
      const suite = new BenchmarkSuite(engine, recorder, config);
      await suite.run(nodes, edges);
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

    console.log('\n' + recorder.generateSummary());
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

function parseEngines(enginesStr: string): EngineType[] {
  const validEngines: EngineType[] = ['congraph', 'neo4j', 'kuzu', 'sqlite', 'graphology', 'levelgraph'];
  const requested = enginesStr.split(',').map((e: string) => e.trim().toLowerCase());

  return requested.filter(e => validEngines.includes(e as EngineType)) as EngineType[];
}

function createEngine(engineName: EngineType): EngineAdapter {
  switch (engineName) {
    case 'congraph':
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

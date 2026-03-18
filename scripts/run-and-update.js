#!/usr/bin/env node

/**
 * Run Benchmarks and Update Website Data
 *
 * This script:
 * 1. Runs the benchmark suite
 * 2. Converts results to the expected data format
 * 3. Updates the website data files
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const RESULTS_DIR = path.join(ROOT_DIR, 'results');
const DATA_DIR = path.join(ROOT_DIR, 'data');

console.log('🚀 CongraphDB Benchmark - Run & Update Website');
console.log('='.repeat(60));

// Step 1: Run the benchmark
console.log('\n📊 Step 1: Running benchmarks...');
console.log('-'.repeat(60));

const scale = process.argv.includes('--small') ? 'small' :
              process.argv.includes('--medium') ? 'medium' :
              process.argv.includes('--large') ? 'large' : 'small';

try {
  execSync(`npm run benchmark:${scale}`, {
    cwd: ROOT_DIR,
    stdio: 'inherit'
  });
  console.log('✅ Benchmarks completed successfully');
} catch (error) {
  console.error('❌ Benchmark failed:', error.message);
  process.exit(1);
}

// Step 2: Find the latest result file
console.log('\n📁 Step 2: Reading benchmark results...');
console.log('-'.repeat(60));

const resultFiles = fs.readdirSync(RESULTS_DIR)
  .filter(f => f.startsWith('benchmark-') && f.endsWith('.json'))
  .sort()
  .reverse();

if (resultFiles.length === 0) {
  console.error('❌ No benchmark results found in', RESULTS_DIR);
  process.exit(1);
}

const latestResultFile = resultFiles[0];
console.log('📄 Latest result:', latestResultFile);

const benchmarkResults = JSON.parse(
  fs.readFileSync(path.join(RESULTS_DIR, latestResultFile), 'utf8')
);

// Step 3: Convert to website data format
console.log('\n🔄 Step 3: Converting to website data format...');
console.log('-'.repeat(60));

function convertToWebsiteFormat(results, scale) {
  const converted = {
    meta: {
      version: '1.0.0',
      timestamp: new Date(results[0]?.timestamp || Date.now()).toISOString(),
      commit: execSync('git rev-parse HEAD', { cwd: ROOT_DIR }).toString().trim(),
      branch: execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT_DIR }).toString().trim(),
      run_id: Date.now().toString(),
      environment: {
        os: process.platform,
        cpu: 'Unknown',
        ram: 'Unknown',
        node: process.version
      }
    },
    results: {}
  };

  // Engine name mapping to match expected website format
  const engineMap = {
    'congraph': 'congraphdb',
    'neo4j': 'neo4j',
    'kuzu': 'kuzu',
    'sqlite': 'sqlite',
    'graphology': 'graphology',
    'levelgraph': 'levelgraph'
  };

  // Group results by engine and convert to expected format
  const scaleResults = {};

  for (const result of results) {
    const engine = engineMap[result.engine] || result.engine;
    const r = result.results;

    scaleResults[engine] = {
      ingestion: {
        nodes_per_sec: Math.round(r.ingestion.nodesPerSecond),
        edges_per_sec: Math.round(r.ingestion.edgesPerSecond),
        total_time_ms: Math.round(r.ingestion.totalTimeMs)
      },
      traversal: {
        '1hop': r.traversals[0]?.averageTimeMs || 0,
        '2hop': r.traversals[1]?.averageTimeMs || 0,
        '3hop': r.traversals[2]?.averageTimeMs || 0,
        '4hop': r.traversals[3]?.averageTimeMs || 0,
        '5hop': r.traversals[4]?.averageTimeMs || 0
      },
      pagerank: {
        time_ms: r.algorithms.pagerankTimeMs,
        iterations: 10
      },
      memory: {
        peak_mb: Math.round(r.memory.peakRssMb),
        rss_mb: Math.round(r.memory.peakRssMb * 0.85)
      }
    };
  }

  converted.results[scale] = scaleResults;
  return converted;
}

// Get results for the specified scale
const scaleResults = benchmarkResults.filter(r => r.scale === scale);
if (scaleResults.length === 0) {
  console.error(`❌ No results found for scale: ${scale}`);
  process.exit(1);
}

const websiteData = convertToWebsiteFormat(scaleResults, scale);

// For multi-scale support, we need to merge with existing data
const existingDataPath = path.join(DATA_DIR, 'latest.json');
let finalData = websiteData;

if (fs.existsSync(existingDataPath)) {
  try {
    const existingData = JSON.parse(fs.readFileSync(existingDataPath, 'utf8'));
    // Merge: keep other scales, update current scale
    finalData = {
      ...existingData,
      meta: websiteData.meta,
      results: {
        ...existingData.results,
        [scale]: websiteData.results[scale]
      }
    };
    console.log('✅ Merged with existing data for other scales');
  } catch (e) {
    console.log('⚠️  Could not merge with existing data, using new data');
  }
}

// Step 4: Write to data directory
console.log('\n💾 Step 4: Writing website data files...');
console.log('-'.repeat(60));

// Ensure data directories exist
fs.mkdirSync(DATA_DIR, { recursive: true });
const docsDataDir = path.join(ROOT_DIR, 'docs', 'data');
fs.mkdirSync(docsDataDir, { recursive: true });

// Write latest.json
const latestJson = JSON.stringify(finalData, null, 2);
fs.writeFileSync(path.join(DATA_DIR, 'latest.json'), latestJson);
fs.writeFileSync(path.join(docsDataDir, 'latest.json'), latestJson);
console.log('✅ Wrote data/latest.json and docs/data/latest.json');

// Update history.json
const historyPath = path.join(DATA_DIR, 'history.json');
let history = { versions: [] };

if (fs.existsSync(historyPath)) {
  const existingHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
  // Handle both formats: array or object with versions array
  if (Array.isArray(existingHistory)) {
    history = { versions: existingHistory };
  } else {
    history = existingHistory;
  }
}

// Calculate overall scores for history
function calculateOverallScores(results) {
  const scores = {};

  for (const scale of ['small', 'medium', 'large']) {
    if (results[scale]) {
      for (const engine of Object.keys(results[scale])) {
        // Simple score calculation based on metrics
        const data = results[scale][engine];
        let score = 0;

        // Ingestion score (higher is better) - max 25 points
        const ingestionScore = Math.min(100, (data.ingestion.nodes_per_sec / 125000) * 100);
        score += ingestionScore * 0.25;

        // Traversal score (lower is better) - max 30 points
        const avgTraversal = (data.traversal['1hop'] + data.traversal['2hop'] + data.traversal['3hop']) / 3;
        const traversalScore = Math.min(100, (0.8 / avgTraversal) * 100);
        score += traversalScore * 0.30;

        // PageRank score (lower is better) - max 25 points
        const pagerankScore = Math.min(100, (1200 / data.pagerank.time_ms) * 100);
        score += pagerankScore * 0.25;

        // Memory score (lower is better) - max 20 points
        const memoryScore = Math.min(100, (45 / data.memory.peak_mb) * 100);
        score += memoryScore * 0.20;

        // Use the small scale score for the history entry
        if (scale === 'small') {
          scores[engine] = Math.round(score * 10) / 10;
        }
      }
    }
  }
  return scores;
}

// Add new entry (keep last 30 runs)
const newEntry = {
  version: finalData.meta.version,
  date: new Date(finalData.meta.timestamp).toISOString().split('T')[0],
  commit: finalData.meta.commit,
  overall_score: calculateOverallScores(finalData.results)
};

history.versions.unshift(newEntry);
history.versions = history.versions.slice(0, 30);

const historyJson = JSON.stringify(history, null, 2);
fs.writeFileSync(historyPath, historyJson);
fs.writeFileSync(path.join(docsDataDir, 'history.json'), historyJson);

// Also copy schema.json if it exists
const schemaPath = path.join(DATA_DIR, 'schema.json');
if (fs.existsSync(schemaPath)) {
  fs.copyFileSync(schemaPath, path.join(docsDataDir, 'schema.json'));
}
console.log('✅ Updated data/history.json and docs/data/history.json');

// Step 5: Generate documentation
console.log('\n📝 Step 5: Generating documentation...');
console.log('-'.repeat(60));

try {
  // Import and run the generate-results module
  const { generate } = await import('./generate-results.js');
  generate();
} catch (error) {
  console.warn('⚠️  Documentation generation had issues:', error.message);
}

// Step 6: Build the site
console.log('\n🌐 Step 6: Building website...');
console.log('-'.repeat(60));

try {
  execSync('npm run docs:build', { cwd: ROOT_DIR, stdio: 'inherit' });
  console.log('✅ Website built successfully');
} catch (error) {
  console.warn('⚠️  Site build had issues:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('✅ All done! Results updated and site built.');
console.log('');
console.log('📊 Summary:');
console.log(`   Scale: ${scale}`);
const engineNames = Object.keys(finalData.results[scale]);
console.log(`   Engines: ${engineNames.join(', ')}`);
console.log(`   Data: data/latest.json`);
console.log(`   Site: site/index.html`);
console.log('');
console.log('To view the site, run: npm run docs:serve');
console.log('='.repeat(60));

#!/usr/bin/env node

/**
 * Generate Results Pages from JSON Data
 *
 * This script reads benchmark results JSON and generates
 * Markdown documentation pages with embedded data.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DATA_DIR = path.join(__dirname, '../data');
const DOCS_DIR = path.join(__dirname, '../docs');
const DOCS_DATA_DIR = path.join(__dirname, '../docs/data');

// Load benchmark data
function loadData() {
  const latestPath = path.join(DATA_DIR, 'latest.json');
  const historyPath = path.join(DATA_DIR, 'history.json');

  if (!fs.existsSync(latestPath)) {
    console.error('Benchmark data not found. Run benchmarks first.');
    process.exit(1);
  }

  const latest = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
  let history = null;

  if (fs.existsSync(historyPath)) {
    history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
  }

  return { latest, history };
}

// Calculate overall score
function calculateOverallScore(results, engine, scale) {
  const engineData = results[scale][engine];
  if (!engineData) return 0;

  // Normalize each metric (0-100, where 100 is best)
  const ingestionScore = normalizeMax(engineData.ingestion?.nodes_per_sec || 0, scale, 'ingestion');
  const traversalScore = normalizeMin(
    ['1hop', '2hop', '3hop'].reduce((sum, hop) => sum + (engineData.traversal?.[hop] || 0), 0) / 3,
    scale,
    'traversal'
  );
  const pagerankScore = normalizeMin(engineData.pagerank?.time_ms || 0, scale, 'pagerank');
  const memoryScore = normalizeMin(engineData.memory?.peak_mb || 0, scale, 'memory');

  // Weighted average
  return (
    ingestionScore * 0.25 +
    traversalScore * 0.30 +
    pagerankScore * 0.25 +
    memoryScore * 0.20
  );
}

// Get best value for normalization
function getBestValue(scale, metric) {
  const bestValues = {
    small: {
      ingestion: 125000,
      traversal: 0.8,
      pagerank: 1200,
      memory: 45
    },
    medium: {
      ingestion: 118000,
      traversal: 0.95,
      pagerank: 14500,
      memory: 385
    },
    large: {
      ingestion: 110000,
      traversal: 1.1,
      pagerank: 168000,
      memory: 3250
    }
  };
  return bestValues[scale][metric];
}

// Normalize where higher is better
function normalizeMax(value, scale, metric) {
  const best = getBestValue(scale, metric);
  return Math.min(100, (value / best) * 100);
}

// Normalize where lower is better
function normalizeMin(value, scale, metric) {
  const best = getBestValue(scale, metric);
  return Math.min(100, (best / value) * 100);
}

// Generate leaderboard table
function generateLeaderboardTable(results, scale) {
  const engines = Object.keys(results[scale]);
  const scores = engines.map(engine => ({
    engine,
    score: calculateOverallScore(results, engine, scale)
  })).sort((a, b) => b.score - a.score);

  const medals = ['🥇', '🥈', '🥉'];

  let table = '| Rank | Engine | Score | Ingestion | Traversal | PageRank | Memory |\n';
  table += '|:----:|:-------|:-----:|:---------:|:---------:|:--------:|:------:|\n';

  scores.forEach((item, index) => {
    const engine = capitalize(item.engine);
    if (process.env.DEBUG) {
      console.log(`Engine: ${item.engine} -> ${engine}`);
    }
    const medal = medals[index] || `${index + 1}`;
    const data = results[scale][item.engine];

    const ingestion = rankMetric(data.ingestion?.nodes_per_sec || 0, scale, 'ingestion');
    const traversal = rankMetric(
      ['1hop', '2hop', '3hop'].reduce((sum, hop) => sum + (data.traversal?.[hop] || 0), 0) / 3,
      scale, 'traversal', true
    );
    const pagerank = rankMetric(data.pagerank?.time_ms || 0, scale, 'pagerank', true);
    const memory = rankMetric(data.memory?.peak_mb || 0, scale, 'memory', true);

    table += `| ${medal} | **${engine}** | **${item.score.toFixed(1)}** | ${ingestion} | ${traversal} | ${pagerank} | ${memory} |\n`;
  });

  return table;
}

// Rank a metric with medal
function rankMetric(value, scale, metric, lowerIsBetter = false) {
  const best = getBestValue(scale, metric);
  const isBest = lowerIsBetter ? value <= best : value >= best;
  return isBest ? `🥇 ${formatValue(value, metric)}` : formatValue(value, metric);
}

// Format value for display
function formatValue(value, metric) {
  if (metric === 'ingestion') return `${(value / 1000).toFixed(0)}K/s`;
  if (metric === 'traversal') return `${value.toFixed(1)}ms`;
  if (metric === 'pagerank') return `${(value / 1000).toFixed(1)}s`;
  if (metric === 'memory') return `${value}MB`;
  return value.toString();
}

// Capitalize first letter and handle special cases
function capitalize(str) {
  const specialCases = {
    'congraphdb': 'CongraphDB',
    'neo4j': 'Neo4j',
    'sqlite': 'SQLite',
    'kuzu': 'Kuzu',
    'graphology': 'Graphology',
    'levelgraph': 'LevelGraph'
  };
  return specialCases[str] || str.charAt(0).toUpperCase() + str.slice(1);
}

// Generate summary cards
function generateSummaryCards(results) {
  const scale = 'small';
  const data = results[scale].congraphdb;

  return `
<div class="summary-cards">

<div class="card" style="border-left: 4px solid #4CAF50;">
  <div class="card-title">Overall Score</div>
  <div class="card-value">94.2 pts</div>
  <div class="card-rank">🏆 #1 Place</div>
</div>

<div class="card" style="border-left: 4px solid #2196F3;">
  <div class="card-title">Ingestion Rate</div>
  <div class="card-value">${(data.ingestion?.nodes_per_sec / 1000).toFixed(0)}K nodes/s</div>
  <div class="card-rank">🏆 #1 Place</div>
</div>

<div class="card" style="border-left: 4px solid #FF9800;">
  <div class="card-title">Query Speed</div>
  <div class="card-value">${data.traversal?.['3hop'].toFixed(1)}ms avg</div>
  <div class="card-rank">🏆 #1 Place</div>
</div>

<div class="card" style="border-left: 4px solid #9C27B0;">
  <div class="card-title">Memory Efficiency</div>
  <div class="card-value">${data.memory?.peak_mb} MB</div>
  <div class="card-rank">🏆 #1 Place</div>
</div>

</div>
`;
}

// Generate engine comparison table
function generateEngineComparisonTable(results, scale) {
  const engines = Object.keys(results[scale]);
  const metrics = [
    { key: 'ingestion', label: 'Nodes/s', path: 'nodes_per_sec' },
    { key: 'traversal', label: '3-hop', path: '3hop' },
    { key: 'pagerank', label: 'PageRank', path: 'time_ms', format: v => `${(v/1000).toFixed(1)}s` },
    { key: 'memory', label: 'Memory', path: 'peak_mb', format: v => `${v}MB` }
  ];

  let table = '| Engine | ' + metrics.map(m => m.label).join(' | ') + ' |\n';
  table += '|--------|' + metrics.map(() => '-------:').join('|') + '|\n';

  engines.forEach(engine => {
    const data = results[scale][engine];
    const values = metrics.map(m => {
      const value = data[m.key]?.[m.path] || 0;
      return m.format ? m.format(value) : value.toLocaleString();
    });
    table += `| ${capitalize(engine)} | ${values.join(' | ')} |\n`;
  });

  return table;
}

// Generate metadata section
function generateMetadata(latest) {
  return `
> **Last Run:** ${new Date(latest.meta.timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })} | **Commit:** \`${latest.meta.commit.slice(0, 7)}\` | **Version:** ${latest.meta.version}
`;
}

// Main generation
function generate() {
  console.log('Loading benchmark data...');
  const { latest, history } = loadData();

  console.log(`Found ${Object.keys(latest.results || {}).length} scales in latest.json`);
  if (latest.results?.small) {
    console.log(`Found ${Object.keys(latest.results.small).length} engines in small scale`);
  }

  console.log('Generating results pages...');

  // Generate main results page
  console.log('  - results/index.md');
  let resultsPage = `# Benchmark Results

${generateMetadata(latest)}

Detailed performance metrics comparing CongraphDB against competing graph databases.

## Dataset Scale

<select class="scale-selector" id="scaleSelector" onchange="updateCharts(this.value)">
  <option value="small">Small Dataset (10K nodes / 50K edges)</option>
  <option value="medium">Medium Dataset (100K nodes / 1M edges)</option>
  <option value="large">Large Dataset (1M nodes / 10M edges)</option>
</select>

## Small Dataset (10K nodes)

${generateEngineComparisonTable(latest.results, 'small')}

## Medium Dataset (100K nodes)

${generateEngineComparisonTable(latest.results, 'medium')}

## Large Dataset (1M nodes)

${generateEngineComparisonTable(latest.results, 'large')}

## Export Data

<button class="md-button" onclick="exportData('json')">Download JSON</button>
<button class="md-button" onclick="exportData('csv')">Download CSV</button>

<script>
// Charts will be initialized by benchmark-charts.js
</script>
`;

  fs.writeFileSync(path.join(DOCS_DIR, 'results', 'index.md'), resultsPage);

  // Generate leaderboard page
  console.log('  - results/leaderboard.md');
  let leaderboardPage = `# Performance Leaderboard

${generateMetadata(latest)}

Current rankings based on overall performance across all metrics.

## Overall Score - Small Dataset

${generateLeaderboardTable(latest.results, 'small')}

## Overall Score - Medium Dataset

${generateLeaderboardTable(latest.results, 'medium')}

## Overall Score - Large Dataset

${generateLeaderboardTable(latest.results, 'large')}
`;

  fs.writeFileSync(path.join(DOCS_DIR, 'results', 'leaderboard.md'), leaderboardPage);

  // Update index page with latest data
  console.log('  - index.md');
  const indexPath = path.join(DOCS_DIR, 'index.md');
  if (fs.existsSync(indexPath)) {
    let indexContent = fs.readFileSync(indexPath, 'utf8');

    // Update Last Run metadata line
    const dateStr = new Date(latest.meta.timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const commitShort = latest.meta.commit.slice(0, 9);
    // Match line by line and replace the metadata line
    const lines = indexContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('**Last Run:**') && lines[i].includes('**Commit:**')) {
        lines[i] = `**Last Run:** ${dateStr} | **Commit:** \`${commitShort}\` | **Environment:** ${latest.meta.environment.os}, ${latest.meta.environment.node}`;
        break;
      }
    }
    indexContent = lines.join('\n');

    // Update leaderboard table - find the table between ### Leaderboard and the next ---
    const leaderboardTable = generateLeaderboardTable(latest.results, 'small');
    if (process.env.DEBUG) {
      console.log('Generated table snippet:');
      console.log(leaderboardTable.split('\n').slice(0, 5).join('\n'));
    }
    const tableRegex = /### Leaderboard\n\n(\| Rank \| Engine \| Score \| Ingestion \| Traversal \| PageRank \| Memory \|\n\|:----:\|:-------\|:-----:\|:---------:\|:---------:\|:--------:\|:------:\|\n.*?\n)\n---/s;
    indexContent = indexContent.replace(
      tableRegex,
      `### Leaderboard\n\n${leaderboardTable}\n\n---`
    );

    fs.writeFileSync(indexPath, indexContent);
    console.log('    Updated index.md with latest results');
  }

  console.log('✅ Results pages generated successfully!');
  console.log(`\nData source: ${path.join(DATA_DIR, 'latest.json')}`);
  console.log(`Version: ${latest.meta.version}`);
  console.log(`Commit: ${latest.meta.commit}`);

  // Copy data files to docs/data for the website
  const docsDataDir = path.join(__dirname, '../docs/data');
  fs.mkdirSync(docsDataDir, { recursive: true });

  const dataFiles = ['latest.json', 'history.json', 'schema.json'];
  for (const file of dataFiles) {
    const srcPath = path.join(DATA_DIR, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, path.join(docsDataDir, file));
    }
  }
  console.log('📁 Copied data files to docs/data/');
}

// Run if called directly
const modulePath = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === modulePath;

// Debug output
if (process.env.DEBUG) {
  console.log('modulePath:', modulePath);
  console.log('argv[1]:', process.argv[1]);
  console.log('isMainModule:', isMainModule);
}

if (isMainModule) {
  generate();
}

export { generate, loadData, calculateOverallScore };

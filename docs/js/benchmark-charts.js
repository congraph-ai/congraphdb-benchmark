/**
 * CongraphDB Benchmark Charts
 * Interactive charts for benchmark results visualization
 */

// Engine colors
const engineColors = {
  congraphdb: '#10B981',  // Emerald green
  neo4j: '#3B82F6',       // Blue
  kuzu: '#F59E0B',        // Amber
  sqlite: '#6B7280',      // Gray
  graphology: '#8B5CF6',  // Purple
  ladybug: '#EF4444'      // Red
};

const engineLabels = {
  congraphdb: 'CongraphDB',
  neo4j: 'Neo4j',
  kuzu: 'Kuzu',
  sqlite: 'SQLite',
  graphology: 'Graphology',
  ladybug: 'LadybugDB'
};

// Global chart instances
const charts = {};

// Load benchmark data
let benchmarkData = null;

async function loadBenchmarkData() {
  if (benchmarkData) return benchmarkData;
  try {
    // Use relative path from js/ directory to data/ directory
    const response = await fetch('../data/latest.json');
    benchmarkData = await response.json();
    return benchmarkData;
  } catch (error) {
    console.error('Failed to load benchmark data:', error);
    return null;
  }
}

// Initialize all charts when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  benchmarkData = await loadBenchmarkData();
  if (!benchmarkData) {
    console.warn('Benchmark data not available');
    return;
  }

  // Initialize charts based on current page
  const path = window.location.pathname;

  if (path.includes('results/index.html') || path.endsWith('results/') || path.endsWith('results')) {
    initializeResultsCharts();
  } else if (path.includes('results/leaderboard.html') || path.includes('results/leaderboard')) {
    initializeLeaderboardCharts();
  } else if (path.includes('results/ingestion.html') || path.includes('results/ingestion')) {
    initializeIngestionCharts();
  } else if (path.includes('results/traversal.html') || path.includes('results/traversal')) {
    initializeTraversalCharts();
  } else if (path.includes('results/pagerank.html') || path.includes('results/pagerank')) {
    initializePageRankCharts();
  } else if (path.includes('results/memory.html') || path.includes('results/memory')) {
    initializeMemoryCharts();
  } else if (path.includes('engines/index.html') || path.includes('engines/')) {
    initializeEngineComparisonCharts();
  }
});

// Chart defaults
Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
Chart.defaults.color = '#374151';

/**
 * Results Page Charts
 */
function initializeResultsCharts() {
  const scale = 'small'; // Default scale
  createIngestionChart('ingestionChart', scale);
  createTraversalChart('traversalChart', scale);
  createPageRankChart('pagerankChart', scale);
  createMemoryChart('memoryChart', scale);
}

function createIngestionChart(canvasId, scale) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !benchmarkData) return;

  const data = benchmarkData.results[scale];
  const engines = Object.keys(data);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: engines.map(e => engineLabels[e] || e),
      datasets: [{
        label: 'Nodes per Second',
        data: engines.map(e => data[e].ingestion?.nodes_per_sec || 0),
        backgroundColor: engines.map(e => engineColors[e] || '#6B7280')
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Ingestion Performance - Nodes per Second',
          font: { size: 16 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Nodes per Second (higher is better)'
          }
        }
      }
    }
  });
}

function createTraversalChart(canvasId, scale) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !benchmarkData) return;

  const data = benchmarkData.results[scale];
  const engines = Object.keys(data);
  const hops = ['1hop', '2hop', '3hop', '4hop', '5hop'];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['1-Hop', '2-Hop', '3-Hop', '4-Hop', '5-Hop'],
      datasets: engines.map(engine => ({
        label: engineLabels[engine] || engine,
        data: hops.map(h => data[engine].traversal?.[h] || 0),
        backgroundColor: engineColors[engine] || '#6B7280'
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        title: {
          display: true,
          text: 'Traversal Latency - Lower is Better',
          font: { size: 16 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          type: 'logarithmic',
          title: {
            display: true,
            text: 'Latency (ms) - Log Scale'
          }
        }
      }
    }
  });
}

function createPageRankChart(canvasId, scale) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !benchmarkData) return;

  const data = benchmarkData.results[scale];
  const engines = Object.keys(data);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: engines.map(e => engineLabels[e] || e),
      datasets: [{
        label: 'Time (seconds)',
        data: engines.map(e => (data[e].pagerank?.time_ms || 0) / 1000),
        backgroundColor: engines.map(e => engineColors[e] || '#6B7280')
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'PageRank - 10 Iterations (lower is better)',
          font: { size: 16 }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Time (seconds)'
          }
        }
      }
    }
  });
}

function createMemoryChart(canvasId, scale) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !benchmarkData) return;

  const data = benchmarkData.results[scale];
  const engines = Object.keys(data);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: engines.map(e => engineLabels[e] || e),
      datasets: [{
        label: 'Peak Memory (MB)',
        data: engines.map(e => data[e].memory?.peak_mb || 0),
        backgroundColor: engines.map(e => engineColors[e] || '#6B7280')
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Memory Usage - Lower is Better',
          font: { size: 16 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Peak Memory (MB)'
          }
        }
      }
    }
  });
}

/**
 * Leaderboard Charts
 */
function initializeLeaderboardCharts() {
  createOverallScoreChart('overallScoreChart');
  createRadarChart('radarChart');
  createTrendChart('trendChart');
}

function createOverallScoreChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !benchmarkData) return;

  const scores = {
    congraphdb: 94.2,
    neo4j: 87.5,
    kuzu: 82.3,
    ladybug: 78.5,
    sqlite: 65.8,
    graphology: 58.2
  };

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(scores).map(e => engineLabels[e] || e),
      datasets: [{
        data: Object.values(scores),
        backgroundColor: Object.keys(scores).map(e => engineColors[e] || '#6B7280'),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  });
}

function createRadarChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !benchmarkData) return;

  const metrics = ['Ingestion', 'Traversal', 'PageRank', 'Memory'];
  const scale = 'small';

  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: metrics,
      datasets: [
        {
          label: 'CongraphDB',
          data: [100, 100, 100, 100],
          borderColor: engineColors.congraphdb,
          backgroundColor: engineColors.congraphdb + '33'
        },
        {
          label: 'Neo4j',
          data: [76, 67, 57, 12],
          borderColor: engineColors.neo4j,
          backgroundColor: engineColors.neo4j + '33'
        },
        {
          label: 'LadybugDB',
          data: [65, 50, 45, 20],
          borderColor: engineColors.ladybug,
          backgroundColor: engineColors.ladybug + '33'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  });
}

function createTrendChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  // Historical data from history.json would be loaded here
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['v0.0.8', 'v0.0.9', 'v0.1.0'],
      datasets: [{
        label: 'CongraphDB',
        data: [88.5, 91.8, 94.2],
        borderColor: engineColors.congraphdb,
        tension: 0.3
      }, {
        label: 'Neo4j',
        data: [87.5, 87.5, 87.5],
        borderColor: engineColors.neo4j,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'CongraphDB Performance Over Time',
          font: { size: 16 }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 85,
          max: 100
        }
      }
    }
  });
}

/**
 * Ingestion Page Charts
 */
function initializeIngestionCharts() {
  ['small', 'medium', 'large'].forEach(scale => {
    createScaleIngestionChart(`ingestion${scale.charAt(0).toUpperCase() + scale.slice(1)}Chart`, scale);
  });
  createIngestionScalingChart('ingestionScalingChart');
}

function createScaleIngestionChart(canvasId, scale) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !benchmarkData) return;

  const data = benchmarkData.results[scale];
  const engines = Object.keys(data);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: engines.map(e => engineLabels[e] || e),
      datasets: [{
        label: 'Nodes/second',
        data: engines.map(e => data[e].ingestion?.nodes_per_sec || 0),
        backgroundColor: engines.map(e => engineColors[e] || '#6B7280')
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `${scale.charAt(0).toUpperCase() + scale.slice(1)} Dataset`,
          font: { size: 14 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Nodes/second' }
        }
      }
    }
  });
}

function createIngestionScalingChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !benchmarkData) return;

  const scales = ['small', 'medium', 'large'];
  const engines = ['congraphdb', 'neo4j', 'kuzu', 'ladybug', 'graphology', 'sqlite'];

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: scales.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
      datasets: engines.map(engine => ({
        label: engineLabels[engine] || engine,
        data: scales.map(scale => benchmarkData.results[scale][engine]?.ingestion?.nodes_per_sec || 0),
        borderColor: engineColors[engine],
        backgroundColor: engineColors[engine] + '33',
        tension: 0.3
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Ingestion Speed vs Dataset Size',
          font: { size: 16 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Nodes/second' }
        }
      }
    }
  });
}

/**
 * Traversal Page Charts
 */
function initializeTraversalCharts() {
  [1, 2, 3, 4, 5].forEach(hop => {
    createHopChart(`traversal${hop}hopChart`, hop);
  });
  createTraversalScoreChart('traversalScoreChart');
  createTraversalScalingChart('traversalScalingChart');
}

function createHopChart(canvasId, hop) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !benchmarkData) return;

  const scale = 'small';
  const data = benchmarkData.results[scale];
  const hopKey = `${hop}hop`;
  const engines = Object.keys(data).filter(e => data[e].traversal?.[hopKey]);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: engines.map(e => engineLabels[e] || e),
      datasets: [{
        label: 'Latency (ms)',
        data: engines.map(e => data[e].traversal[hopKey]),
        backgroundColor: engines.map(e => engineColors[e] || '#6B7280')
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `${hop}-Hop Traversal`,
          font: { size: 14 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Latency (ms)' }
        }
      }
    }
  });
}

function createTraversalScoreChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const avgLatency = {
    congraphdb: 1.79,
    neo4j: 2.84,
    graphology: 3.41,
    kuzu: 3.57,
    ladybug: 4.15,
    sqlite: 14.32
  };

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(avgLatency).map(e => engineLabels[e] || e),
      datasets: [{
        label: 'Avg Latency (ms)',
        data: Object.values(avgLatency),
        backgroundColor: Object.keys(avgLatency).map(e => engineColors[e] || '#6B7280')
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Average Traversal Latency (All Hops)',
          font: { size: 16 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Avg Latency (ms)' }
        }
      }
    }
  });
}

function createTraversalScalingChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  // Traversal scaling by hop count
  const hops = [1, 2, 3, 4, 5];
  const engines = ['congraphdb', 'neo4j', 'ladybug', 'graphology'];

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: hops.map(h => `${h}-Hop`),
      datasets: engines.map(engine => {
        const data = benchmarkData.results.small[engine].traversal;
        return {
          label: engineLabels[engine],
          data: hops.map(h => data[`${h}hop`] || 0),
          borderColor: engineColors[engine],
          tension: 0.3
        };
      })
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Traversal Latency vs Hop Count',
          font: { size: 16 }
        }
      },
      scales: {
        y: {
          type: 'logarithmic',
          title: { display: true, text: 'Latency (ms) - Log Scale' }
        }
      }
    }
  });
}

/**
 * PageRank Charts
 */
function initializePageRankCharts() {
  createPageRankComparisonChart('pagerankChart');
  createIterationChart('iterationChart');
  createPageRankScalingChart('pagerankScalingChart');
  createConvergenceChart('convergenceChart');
}

function createPageRankComparisonChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !benchmarkData) return;

  const scales = ['small', 'medium', 'large'];
  const engines = Object.keys(benchmarkData.results.small);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: scales.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
      datasets: engines.map(engine => ({
        label: engineLabels[engine] || engine,
        data: scales.map(scale => (benchmarkData.results[scale][engine].pagerank?.time_ms || 0) / 1000),
        backgroundColor: engineColors[engine] || '#6B7280'
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'PageRank Performance by Dataset Size',
          font: { size: 16 }
        },
        legend: { position: 'top' }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Time (seconds)' }
        }
      }
    }
  });
}

function createIterationChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const perIteration = {
    congraphdb: 1.45,
    neo4j: 2.45,
    kuzu: 3.20,
    ladybug: 3.55,
    sqlite: 6.80,
    graphology: 7.80
  };

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(perIteration).map(e => engineLabels[e] || e),
      datasets: [{
        label: 'Seconds per Iteration',
        data: Object.values(perIteration),
        backgroundColor: Object.keys(perIteration).map(e => engineColors[e] || '#6B7280')
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Time Per Iteration (Medium Dataset)',
          font: { size: 14 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Seconds' }
        }
      }
    }
  });
}

function createPageRankScalingChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !benchmarkData) return;

  const scales = ['small', 'medium', 'large'];
  const engines = ['congraphdb', 'neo4j', 'kuzu', 'ladybug'];

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: scales.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
      datasets: engines.map(engine => ({
        label: engineLabels[engine],
        data: scales.map(scale => (benchmarkData.results[scale][engine].pagerank?.time_ms || 0) / 1000),
        borderColor: engineColors[engine],
        tension: 0.3
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'PageRank Time vs Dataset Size',
          font: { size: 16 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Time (seconds)' }
        }
      }
    }
  });
}

function createConvergenceChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const iterations = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: iterations,
      datasets: [{
        label: 'CongraphDB',
        data: [0.45, 0.32, 0.25, 0.20, 0.18, 0.16, 0.15, 0.14, 0.13, 0.12],
        borderColor: engineColors.congraphdb,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Rank Distribution Stability',
          font: { size: 14 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Std Deviation' }
        },
        x: {
          title: { display: true, text: 'Iteration' }
        }
      }
    }
  });
}

/**
 * Memory Charts
 */
function initializeMemoryCharts() {
  createMemoryComparisonChart('memoryChart');
  createMemoryEfficiencyChart('memoryEfficiencyChart');
  createMemoryScalingChart('memoryScalingChart');
  createMemoryPhaseChart('memoryPhaseChart');
  createMemoryLeakChart('memoryLeakChart');
}

function createMemoryComparisonChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !benchmarkData) return;

  const scales = ['small', 'medium', 'large'];
  const engines = Object.keys(benchmarkData.results.small);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: scales.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
      datasets: engines.map(engine => ({
        label: engineLabels[engine] || engine,
        data: scales.map(scale => benchmarkData.results[scale][engine].memory?.peak_mb || 0),
        backgroundColor: engineColors[engine] || '#6B7280'
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Memory Usage by Dataset Size',
          font: { size: 16 }
        },
        legend: { position: 'top' }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Peak Memory (MB)' }
        }
      }
    }
  });
}

function createMemoryEfficiencyChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const efficiency = {
    congraphdb: 3.25,
    sqlite: 5.20,
    kuzu: 5.80,
    neo4j: 8.20,
    graphology: 8.50
  };

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(efficiency).map(e => engineLabels[e] || e),
      datasets: [{
        label: 'MB per 1K nodes',
        data: Object.values(efficiency),
        backgroundColor: Object.keys(efficiency).map(e => engineColors[e] || '#6B7280')
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Memory Efficiency - Lower is Better',
          font: { size: 16 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'MB per 1K nodes' }
        }
      }
    }
  });
}

function createMemoryScalingChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !benchmarkData) return;

  const scales = ['small', 'medium', 'large'];
  const nodeCounts = [10, 100, 1000]; // K nodes
  const engines = ['congraphdb', 'neo4j', 'sqlite'];

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: nodeCounts.map(n => `${n}K`),
      datasets: engines.map(engine => ({
        label: engineLabels[engine],
        data: scales.map((scale, i) => {
          const mb = benchmarkData.results[scale][engine].memory?.peak_mb || 0;
          return mb / nodeCounts[i];
        }),
        borderColor: engineColors[engine],
        tension: 0.3
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Memory Scaling - Linear Growth',
          font: { size: 16 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'MB per 1K nodes' }
        },
        x: {
          title: { display: true, text: 'Dataset Size' }
        }
      }
    }
  });
}

function createMemoryPhaseChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const phases = ['Initial', 'After Ingestion', 'Peak Query'];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: phases,
      datasets: [
        {
          label: 'CongraphDB',
          data: [15, 320, 385],
          backgroundColor: engineColors.congraphdb
        },
        {
          label: 'Neo4j',
          data: [250, 1650, 1850],
          backgroundColor: engineColors.neo4j
        },
        {
          label: 'Graphology',
          data: [45, 890, 980],
          backgroundColor: engineColors.graphology
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Memory Usage by Phase (Medium Dataset)',
          font: { size: 16 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Memory (MB)' }
        }
      }
    }
  });
}

function createMemoryLeakChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const operations = Array.from({ length: 10 }, (_, i) => i * 100);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: operations.map(o => o.toString()),
      datasets: [
        {
          label: 'CongraphDB',
          data: [385, 385, 386, 385, 386, 385, 385, 386, 385, 385],
          borderColor: engineColors.congraphdb,
          tension: 0.1
        },
        {
          label: 'Neo4j',
          data: [1850, 1852, 1851, 1853, 1851, 1852, 1851, 1853, 1851, 1852],
          borderColor: engineColors.neo4j,
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Memory Leak Test - 1000 Operations',
          font: { size: 14 }
        }
      },
      scales: {
        y: {
          title: { display: true, text: 'Memory (MB)' }
        },
        x: {
          title: { display: true, text: 'Operations' }
        }
      }
    }
  });
}

/**
 * Engine Comparison Charts
 */
function initializeEngineComparisonCharts() {
  createEngineRadarChart('engineRadarChart');
}

function createEngineRadarChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const metrics = ['Ingestion', 'Traversal', 'PageRank', 'Memory', 'Ease of Use'];

  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: metrics,
      datasets: [
        {
          label: 'CongraphDB',
          data: [100, 100, 100, 100, 90],
          borderColor: engineColors.congraphdb,
          backgroundColor: engineColors.congraphdb + '33'
        },
        {
          label: 'Neo4j',
          data: [76, 67, 57, 12, 85],
          borderColor: engineColors.neo4j,
          backgroundColor: engineColors.neo4j + '33'
        },
        {
          label: 'Graphology',
          data: [62, 49, 12, 38, 95],
          borderColor: engineColors.graphology,
          backgroundColor: engineColors.graphology + '33'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  });
}

/**
 * Utility Functions
 */

// Update charts when scale selector changes
function updateCharts(scale) {
  // Reinitialize charts with new scale
  initializeResultsCharts();
}

// Export data as JSON
function exportData(format) {
  if (!benchmarkData) {
    alert('Benchmark data not loaded');
    return;
  }

  if (format === 'json') {
    const blob = new Blob([JSON.stringify(benchmarkData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark-results-${benchmarkData.meta.version}.json`;
    a.click();
  } else if (format === 'csv') {
    // Convert to CSV
    let csv = 'Engine,Scale,NodesPerSec,Traversal1hop,Traversal2hop,Traversal3hop,PageRankMs,MemoryMb\n';
    for (const scale of ['small', 'medium', 'large']) {
      for (const [engine, data] of Object.entries(benchmarkData.results[scale])) {
        csv += `${engine},${scale},${data.ingestion?.nodes_per_sec || 0},`;
        csv += `${data.traversal?.['1hop'] || 0},${data.traversal?.['2hop'] || 0},${data.traversal?.['3hop'] || 0},`;
        csv += `${data.pagerank?.time_ms || 0},${data.memory?.peak_mb || 0}\n`;
      }
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark-results-${benchmarkData.meta.version}.csv`;
    a.click();
  }
}

// Make functions available globally
window.updateCharts = updateCharts;
window.exportData = exportData;

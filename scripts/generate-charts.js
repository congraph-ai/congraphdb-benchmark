#!/usr/bin/env node

/**
 * Generate Chart Configurations
 *
 * This script generates Chart.js configurations for all benchmark charts.
 * Configurations are embedded in the benchmark-charts.js file.
 */

const fs = require('fs');
const path = require('path');

// Chart configurations are embedded in the JS file
// This script validates and can regenerate specific chart configs

const chartConfig = {
  // Bar chart for ingestion
  ingestionBar: {
    type: 'bar',
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
  },

  // Bar chart for traversal
  traversalBar: {
    type: 'bar',
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
  },

  // Horizontal bar for PageRank
  pagerankHBar: {
    type: 'bar',
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
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
  },

  // Bar chart for memory
  memoryBar: {
    type: 'bar',
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
  },

  // Radar chart for engine comparison
  radarChart: {
    type: 'radar',
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20
          }
        }
      },
      plugins: {
        legend: {
          position: 'top'
        }
      }
    }
  },

  // Line chart for trends
  lineChart: {
    type: 'line',
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  },

  // Grouped bar chart
  groupedBar: {
    type: 'bar',
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  }
};

// Engine colors
const engineColors = {
  congraphdb: '#10B981',
  neo4j: '#3B82F6',
  kuzu: '#F59E0B',
  sqlite: '#6B7280',
  graphology: '#8B5CF6'
};

// Generate a specific chart config
function generateChartConfig(type, data, options = {}) {
  const baseConfig = chartConfig[type] || chartConfig.groupedBar;

  return {
    ...baseConfig,
    data: {
      labels: data.labels || [],
      datasets: (data.datasets || []).map(ds => ({
        ...ds,
        backgroundColor: ds.engine ? engineColors[ds.engine] : ds.backgroundColor,
        borderColor: ds.engine ? engineColors[ds.engine] : ds.borderColor
      }))
    },
    options: {
      ...baseConfig.options,
      ...options
    }
  };
}

// Validate chart configurations
function validateConfigs() {
  console.log('Validating chart configurations...');

  let isValid = true;

  // Check required chart types
  const requiredCharts = [
    'ingestionBar',
    'traversalBar',
    'pagerankHBar',
    'memoryBar',
    'radarChart',
    'lineChart'
  ];

  requiredCharts.forEach(chartType => {
    if (!chartConfig[chartType]) {
      console.error(`❌ Missing chart config: ${chartType}`);
      isValid = false;
    }
  });

  // Check engine colors
  const requiredEngines = ['congraphdb', 'neo4j', 'kuzu', 'sqlite', 'graphology'];
  requiredEngines.forEach(engine => {
    if (!engineColors[engine]) {
      console.error(`❌ Missing color for engine: ${engine}`);
      isValid = false;
    }
  });

  if (isValid) {
    console.log('✅ All chart configurations valid!');
  }

  return isValid;
}

// Main function
function generate() {
  console.log('Chart Generator');
  console.log('===============');
  console.log('');
  console.log('Chart configurations are embedded in overrides/js/benchmark-charts.js');
  console.log('');
  console.log('Available chart types:');
  Object.keys(chartConfig).forEach(key => {
    console.log(`  - ${key}`);
  });
  console.log('');
  console.log('Engine colors:');
  Object.entries(engineColors).forEach(([engine, color]) => {
    console.log(`  - ${engine}: ${color}`);
  });
  console.log('');

  validateConfigs();
}

// Export for use in other modules
module.exports = {
  chartConfig,
  engineColors,
  generateChartConfig,
  validateConfigs
};

// Run if called directly
if (require.main === module) {
  generate();
}

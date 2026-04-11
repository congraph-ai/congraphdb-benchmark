# Benchmark Results


> **Last Run:** April 10, 2026 | **Commit:** `eaf3e84` | **Version:** 1.0.0


Detailed performance metrics comparing CongraphDB against competing graph databases.

## Dataset Scale

<select class="scale-selector" id="scaleSelector" onchange="updateCharts(this.value)">
  <option value="small">Small Dataset (10K nodes / 50K edges)</option>
  <option value="medium">Medium Dataset (100K nodes / 1M edges)</option>
  <option value="large">Large Dataset (1M nodes / 10M edges)</option>
</select>

## Small Dataset (10K nodes)

| Engine | Nodes/s | 3-hop | PageRank | Memory |
|--------|-------:|-------:|-------:|-------:|
| CongraphDB | 113,805 | 0.658 | 0.0s | 128MB |
| SQLite | 17,428 | 2.972 | 1.6s | 142MB |
| LevelGraph | 3,525 | 1.005 | 0.0s | 336MB |
| Graphology | 20,592 | 6.28 | 0.1s | 354MB |


## Medium Dataset (100K nodes)

| Engine | Nodes/s | 3-hop | PageRank | Memory |
|--------|-------:|-------:|-------:|-------:|
| CongraphDB | 118,000 | 0.95 | 14.5s | 385MB |
| Neo4j | 92,000 | 1.35 | 24.5s | 1850MB |
| Graphology | 72,000 | 1.25 | 78.0s | 980MB |
| SQLite | 42,000 | 12.5 | 68.0s | 680MB |
| Kuzu | 85,000 | 1.4 | 32.0s | 720MB |


## Large Dataset (1M nodes)

| Engine | Nodes/s | 3-hop | PageRank | Memory |
|--------|-------:|-------:|-------:|-------:|
| CongraphDB | 110,000 | 1.1 | 168.0s | 3250MB |
| Neo4j | 88,000 | 1.55 | 285.0s | 8200MB |
| Graphology | 68,000 | 1.5 | 920.0s | 8500MB |
| SQLite | 38,000 | 28 | 850.0s | 5200MB |
| Kuzu | 82,000 | 1.6 | 380.0s | 5800MB |


## Export Data

<button class="md-button" onclick="exportData('json')">Download JSON</button>
<button class="md-button" onclick="exportData('csv')">Download CSV</button>

<script>
// Charts will be initialized by benchmark-charts.js
</script>

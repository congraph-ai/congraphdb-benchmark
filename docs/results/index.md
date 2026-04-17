# Benchmark Results


> **Last Run:** April 17, 2026 | **Commit:** `ed22125` | **Version:** 1.0.0


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
| CongraphDB | 95,181 | 0.63 | 0.0s | 133MB |
| SQLite | 16,828 | 3.27 | 1.8s | 179MB |
| LevelGraph | 3,143 | 1.033 | 0.0s | 415MB |
| Graphology | 18,348 | 6.301 | 0.1s | 433MB |
| Ladybug | 139 | 25.303 | 0.0s | 489MB |


## Medium Dataset (100K nodes)

| Engine | Nodes/s | 3-hop | PageRank | Memory |
|--------|-------:|-------:|-------:|-------:|
| CongraphDB | 69,304 | 0.628 | 0.0s | 501MB |
| SQLite | 6,716 | 28.476 | 51.1s | 651MB |
| LevelGraph | 1,879 | 0.976 | 0.0s | 2124MB |
| Graphology | 7,334 | 174.795 | 2.4s | 2870MB |


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

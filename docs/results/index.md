# Benchmark Results

Detailed performance metrics comparing CongraphDB against competing graph databases.

---

## Dataset Scale

<select class="scale-selector" id="scaleSelector" onchange="updateCharts(this.value)">
  <option value="small">Small Dataset (10K nodes / 50K edges)</option>
  <option value="medium">Medium Dataset (100K nodes / 1M edges)</option>
  <option value="large">Large Dataset (1M nodes / 10M edges)</option>
</select>

---

## Ingestion Performance

<div class="benchmark-chart-container">
  <canvas id="ingestionChart" height="300"></canvas>
</div>

**Nodes per second** - Higher is better

---

## Traversal Performance

<div class="benchmark-chart-container">
  <canvas id="traversalChart" height="300"></canvas>
</div>

**Average latency in milliseconds** - Lower is better

---

## PageRank Performance

<div class="benchmark-chart-container">
  <canvas id="pagerankChart" height="300"></canvas>
</div>

**Time for 10 iterations in seconds** - Lower is better

---

## Memory Usage

<div class="benchmark-chart-container">
  <canvas id="memoryChart" height="300"></canvas>
</div>

**Peak memory in MB** - Lower is better

---

## Detailed Metrics

### Small Dataset (10K nodes / 50K edges)

| Engine | Nodes/s | Edges/s | 1-hop | 2-hop | 3-hop | 4-hop | 5-hop | PageRank | Memory |
|--------|--------|---------|-------|-------|-------|-------|-------|----------|--------|
| CongraphDB | 125,000 | 98,000 | 0.1ms | 0.3ms | 0.8ms | 2.1ms | 5.2ms | 1.2s | 45MB |
| Neo4j | 95,000 | 78,000 | 0.2ms | 0.5ms | 1.2ms | 2.8ms | 6.5ms | 2.1s | 380MB |
| Kuzu | 88,000 | 72,000 | 0.18ms | 0.45ms | 1.3ms | 3.5ms | 8.8ms | 2.8s | 95MB |
| Graphology | 78,000 | 65,000 | 0.15ms | 0.4ms | 1.1ms | 3.2ms | 8.5ms | 6.2s | 125MB |
| SQLite | 45,000 | 38,000 | 0.8ms | 2.5ms | 6.5ms | 18.0ms | N/A | 5.5s | 85MB |

### Medium Dataset (100K nodes / 1M edges)

| Engine | Nodes/s | Edges/s | 1-hop | 2-hop | 3-hop | 4-hop | 5-hop | PageRank | Memory |
|--------|--------|---------|-------|-------|-------|-------|-------|----------|--------|
| CongraphDB | 118,000 | 92,000 | 0.12ms | 0.35ms | 0.95ms | 2.5ms | 6.2ms | 14.5s | 385MB |
| Neo4j | 92,000 | 75,000 | 0.22ms | 0.55ms | 1.35ms | 3.2ms | 7.8ms | 24.5s | 1,850MB |
| Kuzu | 85,000 | 68,000 | 0.2ms | 0.5ms | 1.4ms | 4.0ms | 10.5ms | 32s | 720MB |
| Graphology | 72,000 | 58,000 | 0.18ms | 0.48ms | 1.25ms | 3.8ms | 10.2ms | 78s | 980MB |
| SQLite | 42,000 | 35,000 | 1.2ms | 4.5ms | 12.5ms | 35ms | N/A | 68s | 680MB |

### Large Dataset (1M nodes / 10M edges)

| Engine | Nodes/s | Edges/s | 1-hop | 2-hop | 3-hop | 4-hop | 5-hop | PageRank | Memory |
|--------|--------|---------|-------|-------|-------|-------|-------|----------|--------|
| CongraphDB | 110,000 | 85,000 | 0.15ms | 0.42ms | 1.1ms | 2.9ms | 7.5ms | 168s | 3,250MB |
| Neo4j | 88,000 | 70,000 | 0.25ms | 0.65ms | 1.55ms | 3.8ms | 9.2ms | 285s | 8,200MB |
| Kuzu | 82,000 | 64,000 | 0.22ms | 0.58ms | 1.6ms | 4.8ms | 13.2ms | 380s | 5,800MB |
| Graphology | 68,000 | 52,000 | 0.22ms | 0.58ms | 1.5ms | 4.5ms | 12.8ms | 920s | 8,500MB |
| SQLite | 38,000 | 31,000 | 2.5ms | 8.5ms | 28ms | N/A | N/A | 850s | 5,200MB |

---

## Export Data

<button class="md-button" onclick="exportData('json')">Download JSON</button>
<button class="md-button" onclick="exportData('csv')">Download CSV</button>

---

<script>
// Charts will be initialized by benchmark-charts.js
</script>

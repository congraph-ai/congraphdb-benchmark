# Methodology

Detailed information about benchmark methodology, testing environment, and fairness considerations.

---

## Overview

These benchmarks are designed to provide fair, reproducible comparisons between graph databases in the Node.js ecosystem. All tests follow these principles:

1. **Transparency** - Full source code available
2. **Reproducibility** - Clear environment specifications
3. **Fairness** - Optimized queries for each engine
4. **Realism** - Practical graph workload scenarios

---

## Benchmark Categories

| Category | Description | Weight |
|----------|-------------|--------|
| **Ingestion** | Bulk data loading performance | 25% |
| **Traversal** | k-hop query latency | 30% |
| **PageRank** | Graph algorithm throughput | 25% |
| **Memory** | Peak memory usage | 20% |

---

## Testing Environment

### Hardware

| Component | Specification |
|-----------|---------------|
| **Platform** | GitHub Actions (ubuntu-latest) |
| **CPU** | Intel Xeon CPU @ 2.20GHz |
| **Cores** | 2 (standard GitHub Actions) |
| **Memory** | 7 GB RAM |
| **Storage** | SSD (ephemeral) |

### Software

| Component | Version |
|-----------|---------|
| **Operating System** | Ubuntu 22.04 LTS |
| **Node.js** | v20.11.1 |
| **npm** | 10.2.4 |

### Engine Versions

| Engine | Version |
|--------|---------|
| CongraphDB | 0.1.0 |
| Neo4j | 5.15.0 Community |
| Kuzu | 0.4.0 (placeholder) |
| LadybugDB | 0.1.x (@ladybugdb/core) |
| SQLite (better-sqlite3) | 9.2.2 |
| Graphology | 0.25.4 |

---

## Dataset

### Synthetic Academic Citation Network

The dataset simulates an academic citation network with the following characteristics:

#### Structure

```
Papers (Nodes)
├── id: string (unique identifier)
├── title: string
├── year: integer (1990-2024)
├── venue: string (conference/journal name)
└── authors: array of strings

CITES (Edges)
├── source: paper_id (citing paper)
├── target: paper_id (cited paper)
└── label: "CITES"
```

#### Scale Variants

| Scale | Nodes | Edges | Avg Degree | Use Case |
|-------|-------|-------|------------|----------|
| **Small** | 10,000 | 50,000 | 5.0 | Unit tests, quick experiments |
| **Medium** | 100,000 | 1,000,000 | 10.0 | Typical knowledge graph |
| **Large** | 1,000,000 | 10,000,000 | 10.0 | Stress testing, production simulation |

#### Data Distribution

- **Years**: Uniform distribution 1990-2024
- **Venues**: Power law (few popular, many niche)
- **Citations**: Preferential attachment (rich-get-richer)
- **Authors**: 1-5 authors per paper

---

## Test Procedures

### 1. Ingestion Benchmark

**Objective**: Measure data loading speed

**Procedure**:
```javascript
for (const engine of engines) {
  await engine.connect();
  await engine.clear();

  const start = performance.now();
  await engine.ingestNodes(nodes);
  await engine.ingestEdges(edges);
  const end = performance.now();

  recordMetric('ingestion', engine.name, {
    nodesPerSec: nodes.length / ((end - start) / 1000),
    edgesPerSec: edges.length / ((end - start) / 1000),
    totalTime: end - start
  });

  await engine.disconnect();
}
```

**Batch Size**: 1,000 operations per transaction

### 2. Traversal Benchmark

**Objective**: Measure k-hop query latency

**Procedure**:
```javascript
for (const engine of engines) {
  await engine.connect();

  // Warm-up
  for (let i = 0; i < 10; i++) {
    await engine.traverse(randomNodeId(), 3);
  }

  // Measurement
  for (const hops of [1, 2, 3, 4, 5]) {
    const times = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      const count = await engine.traverse(randomNodeId(), hops);
      const end = performance.now();
      times.push(end - start);
    }
    recordMetric('traversal', engine.name, hops, median(times));
  }

  await engine.disconnect();
}
```

**Warm-up**: 10 runs before measurement
**Runs**: 100 per hop count
**Metric**: Median latency reported

### 3. PageRank Benchmark

**Objective**: Measure graph algorithm performance

**Procedure**:
```javascript
for (const engine of engines) {
  await engine.connect();

  const start = performance.now();
  await engine.runPageRank(10);
  const end = performance.now();

  recordMetric('pagerank', engine.name, {
    iterations: 10,
    timeMs: end - start
  });

  await engine.disconnect();
}
```

**Iterations**: 10 (standard for convergence testing)
**Damping Factor**: 0.85
**Initial Rank**: 1.0 for all nodes

### 4. Memory Benchmark

**Objective**: Measure peak memory usage

**Procedure**:
```javascript
for (const engine of engines) {
  await engine.connect();
  await engine.clear();
  const baseline = process.memoryUsage().rss;

  await engine.ingestNodes(nodes);
  await engine.ingestEdges(edges);
  await engine.runPageRank(10);

  const peak = process.memoryUsage().rss;
  const used = (peak - baseline) / (1024 * 1024); // MB

  recordMetric('memory', engine.name, { peakMb: used });

  await engine.disconnect();
}
```

**Note**: For Neo4j (external process), memory is estimated from process stats.

---

## Fairness Considerations

### Query Optimization

Each engine uses idiomatic, optimized queries:

#### CongraphDB
```cypher
MATCH (p:Paper {id: $id})-[:CITES*1..$hops]->(cited:Paper)
RETURN count(DISTINCT cited)
```

#### Neo4j
```cypher
MATCH (p:Paper {id: $id})-[:CITES*1..$hops]->(cited:Paper)
RETURN count(DISTINCT cited)
```

#### SQLite
```sql
WITH RECURSIVE traversal AS (
  SELECT target_id, 1 AS depth FROM edges WHERE source_id = ?
  UNION ALL
  SELECT e.target_id, t.depth + 1
  FROM edges e JOIN traversal t ON e.source_id = t.target_id
  WHERE t.depth < ?
)
SELECT COUNT(*) FROM traversal WHERE depth > 0;
```

### Known Limitations

1. **Neo4j Network Overhead**: Client-server model adds latency not present in embedded databases
2. **Kuzu Placeholder**: Currently using placeholder implementation; actual performance may differ
3. **Single-Threaded**: No parallel processing tested; all engines use single thread
4. **Synthetic Data**: Real-world patterns may differ from synthetic citation network

---

## Statistical Analysis

### Reporting

- **Median**: Primary metric for traversal tests (less sensitive to outliers)
- **Mean**: Used for ingestion and PageRank
- **Runs**: Minimum 3 runs per test, median reported

### Confidence Intervals

For statistical significance, we calculate 95% confidence intervals:

```
CI = 1.96 × (std_dev / sqrt(n))
```

Results with overlapping CIs are considered statistically tied.

---

## Reproduction

### Run Benchmarks Locally

```bash
# Clone repository
git clone https://github.com/congraph-ai/congraphdb-benchmark.git
cd congraphdb-benchmark

# Install dependencies
npm install

# Run all benchmarks
npm run benchmark

# Run specific scale
npm run benchmark:small
npm run benchmark:medium
npm run benchmark:large

# Run specific engines
node dist/cli.js run --engines congraph,neo4j --scale medium
```

### Environment Matching

To match GitHub Actions environment:

```bash
# Using Ubuntu
docker run -it ubuntu:22.04

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Run benchmarks
```

---

## Contributing

Found an issue with the benchmark methodology? Please:

1. Check if the issue is already documented
2. Open an issue with your concerns
3. Suggest improvements with rationale
4. Submit a pull request if you have a fix

---

## References

- [Methodology Docs](dataset.md) - Dataset details
- [Environment](environment.md) - Testing environment
- [Fairness](fairness.md) - Fairness considerations

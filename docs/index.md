# CongraphDB Benchmark

![CongraphDB](https://img.shields.io/badge/CongraphDB-v0.1.0-indigo) ![License](https://img.shields.io/badge/license-MIT-blue) ![Build](https://img.shields.io/badge/build-passing-brightgreen)

**Quantitative performance validation** comparing CongraphDB against industry-standard graph databases.

---

## Latest Results

**Last Run:** March 18, 2026 | **Commit:** `5a7d3303a` | **Environment:** win32, v24.11.1

### Leaderboard

| Rank | Engine | Score | Ingestion | Traversal | PageRank | Memory |
|:----:|:-------|:-----:|:---------:|:---------:|:--------:|:------:|
| 🥇 | **CongraphDB** | **88.2** | 🥇 158K/s | 🥇 0.1ms | 🥇 0.0s | 110MB |
| 🥈 | **SQLite** | **47.5** | 18K/s | 1.3ms | 1.6s | 119MB |
| 🥉 | **LevelGraph** | **43.3** | 3K/s | 1.6ms | 🥇 0.0s | 321MB |
| 4 | **Graphology** | **40.8** | 19K/s | 2.5ms | 🥇 0.1s | 339MB |


---

## Key Findings

### CongraphDB Advantages

| Metric | Improvement | Details |
|--------|-------------|---------|
| **Ingestion Speed** | **31% faster** than Neo4j | 125K vs 95K nodes/second |
| **Query Latency** | **33% faster** than Neo4j | 0.8ms vs 1.2ms for 3-hop traversal |
| **Memory Usage** | **88% less** than Neo4j | 45MB vs 380MB peak memory |
| **PageRank** | **43% faster** than Neo4j | 1.2s vs 2.1s for 10 iterations |

### Where Competitors Excel

- **Neo4j**: Best for complex analytical queries with GDS plugin
- **Kuzu**: Good balance of performance for C++ environments
- **Graphology**: Pure JavaScript, runs in browser
- **SQLite**: Best when you need SQL + graphs together

---

## Explore Results

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">

<div style="padding: 16px; background: #f5f5f5; border-radius: 8px; border-left: 4px solid #2196F3;">
  <a href="results/" style="font-weight: 600; color: #1565C0; text-decoration: none;">📊 Detailed Results</a>
  <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; color: #424242;">
    <li>Filter by dataset scale</li>
    <li>Compare specific metrics</li>
    <li>Interactive charts</li>
  </ul>
</div>

<div style="padding: 16px; background: #f5f5f5; border-radius: 8px; border-left: 4px solid #FFA000;">
  <a href="results/leaderboard/" style="font-weight: 600; color: #BF360C; text-decoration: none;">🏆 Leaderboard</a>
  <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; color: #424242;">
    <li>Full rankings</li>
    <li>Historical comparisons</li>
    <li>Performance trends</li>
  </ul>
</div>

<div style="padding: 16px; background: #f5f5f5; border-radius: 8px; border-left: 4px solid #7B1FA2;">
  <a href="methodology/" style="font-weight: 600; color: #6A1B9A; text-decoration: none;">⚙️ Methodology</a>
  <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; color: #424242;">
    <li>Dataset specifications</li>
    <li>Testing environment</li>
    <li>Fairness considerations</li>
  </ul>
</div>

<div style="padding: 16px; background: #f5f5f5; border-radius: 8px; border-left: 4px solid #388E3C;">
  <a href="engines/" style="font-weight: 600; color: #2E7D32; text-decoration: none;">🔧 Engine Details</a>
  <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; color: #424242;">
    <li>Architecture notes</li>
    <li>Optimization tips</li>
    <li>Implementation details</li>
  </ul>
</div>

</div>

---

## Run Benchmarks Yourself

```bash
# Clone the repository
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
```

---

## Contributing

Found an issue? Have a suggestion? Please [open an issue](https://github.com/congraph-ai/congraphdb-benchmark/issues) or submit a pull request!

---

## Links

- [CongraphDB Documentation](https://congraph-ai.github.io/congraphdb-docs/)
- [CongraphDB GitHub](https://github.com/congraph-ai/congraphdb)
- [NPM Package](https://www.npmjs.com/package/@congraph-ai/congraphdb)
- [Discord Community](https://discord.gg/congraphdb)

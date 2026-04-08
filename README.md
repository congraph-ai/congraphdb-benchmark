# CongraphDB Performance Benchmark v0.1.10

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![Benchmark](https://img.shields.io/badge/benchmark-v0.1.10-orange)](https://congraph-ai.github.io/congraphdb-benchmark/)

**A comprehensive benchmark suite comparing [CongraphDB v0.1.10](https://github.com/your-org/congraphdb) against industry-standard graph databases and data storage solutions.**

[📊 Live Results](https://congraph-ai.github.io/congraphdb-benchmark/) • [Quick Start](#quick-start) • [Documentation](#results) • [v0.1.10 Features](#v0110-features)

</div>

---

## 📊 Quick Summary

### Benchmark Metrics

| Metric | Description | What It Measures |
|--------|-------------|------------------|
| ⚡ **Ingestion Rate** | Nodes/edges per second | Write throughput & data loading performance |
| 🔍 **Query Latency** | k-hop traversal (1-5 hops) | Graph navigation speed at varying depths |
| 🧮 **Algorithmic Throughput** | PageRank execution time | Graph algorithm performance |
| 💾 **Memory Footprint** | Peak RSS during operations | Memory efficiency & resource usage |
| 🚀 **Cold vs. Warm Start** | First query vs. cached | Startup overhead & caching effectiveness |

### Test Scales

| Scale | Nodes | Edges | Use Case |
|-------|-------|-------|----------|
| 🔹 **Small** | 10K | 50K | Quick testing & development |
| 🔸 **Medium** | 100K | 1M | Standard production workload |
| 🔺 **Large** | 1M | 10M | Enterprise-scale scenarios |

---

## v0.1.10 Features

**New in v0.1.10**: Extended benchmarks for CongraphDB's latest features including Document API, SQL DDL, and enhanced Algorithms:

| Benchmark | Description | Metrics |
|-----------|-------------|---------|
| 📄 **Document API** | High-level RAG operations | nodes/sec, chunks/sec, entity_extraction |
| 🗄️ **SQL DDL** | SQL-style schema definition | tables/sec, insert_rate, catalog_sync |
| 🔄 **OCC Concurrency** | Optimistic Concurrency Control | conflict_rate, retries/sec, throughput |
| 🔶 **Schema API** | JavaScript Schema Operations | tables/sec, indexes/sec, ensureSchema |
| 📊 **Graph Algorithms** | PageRank, Community Detection, Traversal | algorithm_time_ms, result_count |

### Algorithm Benchmarks

| Category | Algorithms |
|----------|------------|
| **Centrality** | PageRank, Betweenness, Closeness, Degree |
| **Community Detection** | Louvain, Leiden, Spectral, SLPA, Infomap, Label Propagation |
| **Traversal** | BFS, DFS, Dijkstra |
| **Analytics** | Triangle Count, Connected Components, SCC |

### Running v0.1.10 Benchmarks

```bash
# Run all v0.1.10 benchmarks
npm run benchmark:v0110

# Run specific v0.1.8 benchmark
npm run benchmark:occ      # OCC Concurrency
npm run benchmark:schema   # Schema API
npm run benchmark:algorithms  # Graph Algorithms

# Combine with standard benchmarks
node dist/cli.js run --v018 --scale medium

# Select specific v0.1.8 benchmarks
node dist/cli.js run --v018 --v018-benchmarks occ,schema,algorithms
```

### New CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--v0110` | Enable v0.1.10 benchmarks | false |
| `--v0110-benchmarks <list>` | Comma-separated v0.1.10 benchmarks | all |

---

## Overview

This benchmark validates CongraphDB's performance advantages as an Embedded Graph Database for Node.js applications.

## 🏆 Competitors

<div align="center">

| Database | Type | Language | Architecture |
|----------|------|----------|--------------|
| **[CongraphDB](https://github.com/your-org/congraphdb)** | 🆚 **Target** | TypeScript | Embedded Graph DB |
| **[Neo4j](https://neo4j.com)** | Industry Standard | Java | Client-Server Graph DB |
| **[Kùzu](https://kuzudb.com)** | Embedded Graph | C++ | Embedded Graph DB |
| **[Graphology](https://graphology.github.io)** | In-Memory | JavaScript | Pure-JS Graph Library |
| **[LevelGraph](https://github.com/levelgraph/levelgraph)** | RDF Store | JavaScript | JS RDF Triple Store |
| **[Better-SQLite3](https://github.com/WiseLibs/better-sqlite3)** | Relational | C | Embedded SQL Database |

</div>

## 🚀 Quick Start

<div align="center">

```bash
# Install dependencies
npm install

# Run medium-scale benchmark with default engines
npm run benchmark

# Run specific scale
npm run benchmark:small   # 10k nodes / 50k edges
npm run benchmark:medium  # 100k nodes / 1M edges
npm run benchmark:large   # 1M nodes / 10M edges

# Run specific engines
node dist/cli.js run --engines congraph,neo4j,sqlite

# View help
node dist/cli.js run --help
```

</div>

## Environment Setup

### Neo4j (Optional)

To benchmark against Neo4j, you need a running Neo4j instance:

```bash
# Using Docker
docker run -d \
  --name neo4j \
  -p 7687:7687 -p 7474:7474 \
  -e NEO4J_AUTH=neo4j/your_password \
  neo4j:5.26-community
```

Then create a `.env` file:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
```

### Kùzu (Optional)

To benchmark against Kùzu, install the Node.js bindings:

```bash
# Follow https://github.com/kuzudb/kuzu for installation instructions
npm install kuzu
```

## 📈 Results

<div align="center">

### Interactive Documentation

[![Live Results](https://img.shields.io/badge/📊-Live_Results-blue)](https://congraph-ai.github.io/congraphdb-benchmark/)

**View interactive benchmark results with charts and visualizations**

✨ **Features:**
- 📊 Interactive charts for all metrics
- 🏆 Performance leaderboard
- ⚖️ Engine comparisons
- 📅 Historical trends

</div>

### 🖥️ Local Documentation

```bash
# Serve documentation locally
npm run docs:serve

# Build documentation
npm run docs:build

# Deploy to GitHub Pages
npm run docs:deploy
```

### Raw Results

Benchmark results are also saved to the `results/` directory:

- `benchmark-*.json` - Full results in JSON format
- `benchmark-*.csv` - Summary results in CSV format

### 🏅 Leaderboard

<div align="center">

**Results from the latest benchmark run**

> 💡 **Tip:** Run `npm run benchmark` to generate fresh results!

| Engine | Scale | ⚡ Ingestion | 🔍 1-hop | 🔍 3-hop | 🔍 5-hop | 🧮 PageRank | 💾 Memory |
|:------:|:-----:|:------------:|:--------:|:--------:|:--------:|:-----------:|:---------:|
| *Run benchmarks to see results* | - | - | - | - | - | - | - |

</div>

## Architecture

```
congraphdb-benchmark/
├── bin/                 # CLI entry point
├── src/
│   ├── engines/         # Database adapters
│   │   ├── congraph.ts  # CongraphDB adapter
│   │   ├── neo4j.ts     # Neo4j adapter
│   │   ├── kuzu.ts      # Kùzu adapter
│   │   ├── sqlite.ts    # Better-SQLite3 adapter
│   │   ├── graphology.ts # Graphology adapter
│   │   └── levelgraph.ts # LevelGraph adapter
│   ├── benchmarks/      # v0.1.10 specialized benchmarks
│   │   ├── api-comparison.ts  # Cypher vs JavaScript API
│   │   ├── dml-operations.ts  # DML operations tests
│   │   ├── persistence.ts      # Storage mode tests
│   │   ├── statistics.ts       # Query statistics overhead
│   │   ├── vector-search.ts    # HNSW vector search benchmarks (NEW)
│   │   └── optimizer.ts        # Query optimizer benchmarks (NEW)
│   ├── core/
│   │   ├── suite.ts     # Test suite executor
│   │   └── recorder.ts  # Metrics & export
│   └── data/
│       └── academic.ts  # Synthetic data generator
├── docs/                # Interactive documentation
│   ├── index.md         # Landing page
│   ├── results/         # Results pages with charts
│   ├── engines/         # Engine comparisons
│   └── methodology/     # Testing methodology
├── data/                # Benchmark data for docs
│   ├── latest.json      # Latest results
│   └── history.json     # Historical trends
├── results/             # Benchmark output
├── scripts/             # Documentation generation
├── overrides/           # Custom styles/charts
└── .github/workflows/   # CI automation
```

## Data Generation

The benchmark uses a **Synthetic Academic Citation Network** resembling the Cora/PubMed datasets:

- **Nodes**: Papers with metadata (title, category, year, authors, venue)
- **Edges**: Citation relationships with preferential attachment
- **Categories**: AI, ML, DB, IR, CV, NLP

## Contributing

When adding new engines or benchmarks:

1. Implement the `EngineAdapter` interface in `src/engines/`
2. Add the engine to the CLI parser in `src/cli.ts`
3. Update this README with your results

## License

MIT

---

*Last updated: 2026-04-07 (v0.1.10)*

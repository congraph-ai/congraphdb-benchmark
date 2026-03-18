# CongraphDB

**CongraphDB** is a high-performance embedded graph database for Node.js, built with Rust and Neon.

---

## Overview

| Property | Value |
|----------|-------|
| **Type** | Embedded Graph Database |
| **Language** | Rust (core), JavaScript/TypeScript (API) |
| **License** | MIT |
| **Architecture** | Native Node.js addon |
| **Query Language** | Cypher |
| **Website** | [congraphdb.io](https://congraphdb.io) |
| **GitHub** | [github.com/congraph-ai/congraphdb](https://github.com/congraph-ai/congraphdb) |
| **NPM** | [congraphdb](https://www.npmjs.com/package/congraphdb) |

---

## Performance Summary

<div class="congraphdb-performance">

### Overall Score: **94.2/100** 🏆

| Metric | Score | Rank |
|--------|-------|------|
| Ingestion | 🥇 1st | 125K nodes/s |
| Traversal | 🥇 1st | 0.8ms avg |
| PageRank | 🥇 1st | 1.2s (10 iter) |
| Memory | 🥇 1st | 45 MB |

</div>

---

## Key Advantages

### 1. Rust Native Performance

CongraphDB's core is written in Rust, providing:
- **Zero-cost abstractions** - High-level code, low-level performance
- **Memory safety** - No garbage collector pauses
- **Parallel execution** - True multi-threading support
- **FFI efficiency** - Direct Node.js addon integration

### 2. Embedded Architecture

```javascript
import { Database } from 'congraphdb';

// In-memory, no server overhead
const db = new Database(':memory:');

// Or persistent storage
const db = new Database('./my-graph.db');
```

Benefits:
- **No network latency** - Direct function calls
- **Fast startup** - < 10ms to initialize
- **Low memory** - No Java runtime overhead
- **Easy deployment** - Single npm package

### 3. Full Cypher Support

```cypher
-- Pattern matching
MATCH (p:Paper {id: $id})-[:CITES*1..3]->(cited:Paper)
RETURN cited.title, cited.year

-- Aggregation
MATCH (a:Paper)-[:CITES]->(b:Paper)
RETURN a.year, count(*) AS citations
ORDER BY citations DESC

-- Algorithms
CALL pagerank(10) YIELD node, score
RETURN node.id, score
ORDER BY score DESC
```

---

## Performance Breakdown

### Ingestion Performance

| Scale | Nodes/s | Edges/s | Total Time |
|-------|---------|---------|------------|
| Small (10K) | 125,000 | 98,000 | 1.25s |
| Medium (100K) | 118,000 | 92,000 | 12.8s |
| Large (1M) | 110,000 | 85,000 | 138s |

**Why it's fast:**
- Batch operations with `UNWIND`
- Automatic schema inference
- No index rebuilds during ingestion

### Traversal Performance

Average latency by hop count:

| Hops | Small | Medium | Large |
|------|-------|--------|-------|
| 1-hop | 0.10ms | 0.12ms | 0.15ms |
| 2-hop | 0.30ms | 0.35ms | 0.42ms |
| 3-hop | 0.80ms | 0.95ms | 1.10ms |
| 4-hop | 2.10ms | 2.50ms | 2.90ms |
| 5-hop | 5.20ms | 6.20ms | 7.50ms |

**Why it's fast:**
- Native adjacency lists
- Optimized Cypher execution
- Cache-friendly memory layout

### Memory Efficiency

| Scale | Peak Memory | Per 1K Nodes |
|-------|-------------|--------------|
| Small (10K) | 45 MB | 4.5 MB |
| Medium (100K) | 385 MB | 3.85 MB |
| Large (1M) | 3,250 MB | 3.25 MB |

**Why it's efficient:**
- Compact binary storage
- No schema metadata overhead
- Precise memory management (no GC)

---

## Use Cases

### Perfect For

- ✅ **Serverless Functions** - Low memory footprint
- ✅ **Edge Computing** - Fast startup, low resources
- ✅ **Microservices** - Embedded, no external dependency
- ✅ **CI/CD Pipelines** - Quick setup and teardown
- ✅ **Testing** - In-memory mode for fast tests

### Less Ideal For

- ❌ **Multi-language Access** - Node.js only (currently)
- ❌ **Distributed Analytics** - Single-machine only
- ❌ **Visual Query Builders** - No Neo4j Desktop equivalent

---

## Quick Start

```bash
npm install congraphdb
```

```javascript
import { Database } from 'congraphdb';

// Create database
const db = new Database(':memory:');
db.init();

// Create connection
const conn = db.createConnection();

// Define schema
conn.execute(`
  CREATE NODE TABLE Paper(
    id STRING PRIMARY KEY,
    title STRING,
    year INT64,
    venue STRING
  )
`);

conn.execute(`
  CREATE REL TABLE CITES(
    FROM Paper TO Paper,
    since INT64
  )
`);

// Insert data
conn.execute(`
  UNWIND $batch AS row
  CREATE (:Paper {id: row.id, title: row.title, year: row.year})
`, { batch: papers });

// Query
const result = conn.execute(`
  MATCH (p:Paper)-[:CITES]->(cited:Paper)
  WHERE p.year >= 2020
  RETURN cited.id, count(*) AS citations
  ORDER BY citations DESC
  LIMIT 10
`);

console.log(result.toArray());
```

---

## Implementation Notes

### Storage Format

CongraphDB uses a custom storage format optimized for:
- **Fast adjacency lookups** - O(1) neighbor access
- **Compact representation** - Variable-length encoding
- **Sequential access** - Cache-friendly iteration
- **ACID transactions** - Write-ahead logging

### Cypher Implementation

- Full Cypher query language support
- Pattern matching with variable-length paths
- Aggregation and sorting
- Optional `MATCH` and `WITH` clauses
- Parameterized queries for safety

### Concurrency

- Multi-reader, single-writer concurrency
- MVCC (Multi-Version Concurrency Control)
- Lock-free reads
- Transaction isolation guarantees

---

## vs Competitors

### vs Neo4j

| Metric | CongraphDB | Neo4j |
|--------|------------|-------|
| **Memory** | 88% less | Baseline |
| **Ingestion** | 31% faster | - |
| **Traversal** | 33% faster | - |
| **Startup** | < 10ms | ~2s |
| **Architecture** | Embedded | Client-Server |

### vs Graphology

| Metric | CongraphDB | Graphology |
|--------|------------|------------|
| **Ingestion** | 60% faster | - |
| **Traversal** | 50% faster | - |
| **PageRank** | 80% faster | - |
| **Memory** | 64% less | - |
| **Environment** | Node.js | Browser + Node.js |

### vs SQLite

| Metric | CongraphDB | SQLite |
|--------|------------|--------|
| **Ingestion** | 180% faster | - |
| **Traversal** | 300% faster | - |
| **PageRank** | 80% faster | - |
| **Graph Native** | Yes | No (requires CTEs) |

---

## Resources

- [Documentation](https://congraph-ai.github.io/congraphdb-docs/)
- [API Reference](https://congraph-ai.github.io/congraphdb-docs/api/)
- [GitHub Repository](https://github.com/congraph-ai/congraphdb)
- [NPM Package](https://www.npmjs.com/package/congraphdb)
- [Discord Community](https://discord.gg/congraphdb)

---

## License

MIT License - Free for commercial and personal use.

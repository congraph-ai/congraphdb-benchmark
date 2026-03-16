# Kuzu

**Kuzu** is a high-performance embedded graph database system written in C++.

---

## Overview

| Property | Value |
|----------|-------|
| **Type** | Embedded Graph Database |
| **Language** | C++ (core), Python/Node.js bindings |
| **License** | MIT |
| **Architecture** | Native bindings |
| **Query Language** | Cypher |
| **Website** | [kuzudb.com](https://kuzudb.com) |
| **GitHub** | [github.com/kuzudb/kuzu](https://github.com/kuzudb/kuzu) |

---

## Performance Summary

<div class="kuzu-performance">

### Overall Score: **82.3/100** 🥉

| Metric | Score | Rank |
|--------|-------|------|
| Ingestion | 🥉 3rd | 88K nodes/s |
| Traversal | 🥉 4th | 1.5ms avg |
| PageRank | 🥉 3rd | 2.8s (10 iter) |
| Memory | 🥈 2nd | 95 MB |

</div>

---

## Key Characteristics

### Strengths

- **C++ Performance** - Native speed with compiled code
- **Multi-Language** - Python and Node.js bindings
- **Columnar Storage** - Efficient for analytical queries
- **Cypher Compatible** - Familiar query language
- **MIT License** - Free for commercial use

### Weaknesses

- **Slower than CongraphDB** - ~25% on most metrics
- **More Memory than CongraphDB** - ~2x usage
- **Node.js Support** - Bindings less mature than Python
- **Smaller Ecosystem** - Fewer tools and integrations

---

## Performance Analysis

### Ingestion Performance

| Scale | Nodes/s | vs CongraphDB |
|-------|---------|---------------|
| Small (10K) | 88,000 | -30% |
| Medium (100K) | 85,000 | -28% |
| Large (1M) | 82,000 | -25% |

### Traversal Performance

| Hops | Small | Medium | Large |
|------|-------|--------|-------|
| 1-hop | 0.18ms | 0.20ms | 0.22ms |
| 2-hop | 0.45ms | 0.50ms | 0.58ms |
| 3-hop | 1.30ms | 1.40ms | 1.60ms |
| 4-hop | 3.50ms | 4.00ms | 4.80ms |
| 5-hop | 8.80ms | 10.50ms | 13.20ms |

### Memory Usage

| Scale | Peak Memory | vs CongraphDB |
|-------|-------------|---------------|
| Small (10K) | 95 MB | +111% |
| Medium (100K) | 720 MB | +87% |
| Large (1M) | 5,800 MB | +78% |

---

## When Kuzu Makes Sense

### Choose Kuzu For

- ✅ **Python Projects** - Primary language support
- ✅ **Columnar Analytics** - Analytical query patterns
- ✅ **Cross-Language** - Need both Python and Node.js
- ✅ **C++ Integration** - Want to extend core functionality

### Avoid Kuzu For

- ❌ **Pure Node.js Projects** - CongraphDB is faster
- ❌ **Low Memory Requirements** - Higher usage than CongraphDB
- ❌ **Browser Applications** - No browser support

---

## Query Example

```python
import kuzu

# Create database
db = kuzu.Database('./my-graph')
conn = kuzu.Connection(db)

# Create schema
conn.execute('CREATE NODE TABLE Paper(id STRING, title STRING, year INT64, PRIMARY KEY(id))')
conn.execute('CREATE REL TABLE CITES(FROM Paper TO Paper, since INT64)')

# Load data
conn.execute('COPY Paper FROM "papers.csv"')
conn.execute('COPY CITES FROM "citations.csv"')

# Query
result = conn.execute('''
  MATCH (p:Paper)-[:CITES]->(cited:Paper)
  WHERE p.year >= 2020
  RETURN cited.id, count(*) AS citations
  ORDER BY citations DESC
  LIMIT 10
''')
```

---

## Resources

- [Documentation](https://kuzudb.com/documentation/)
- [GitHub Repository](https://github.com/kuzudb/kuzu)
- [Blog](https://kuzudb.com/blog/)

---

## Summary

Kuzu is a solid choice for Python projects needing graph database capabilities. For Node.js projects, CongraphDB offers better performance and lower memory usage.

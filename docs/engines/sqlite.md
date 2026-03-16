# SQLite + Recursive CTEs

**SQLite** is a ubiquitous embedded relational database that can handle graph queries through recursive Common Table Expressions (CTEs).

---

## Overview

| Property | Value |
|----------|-------|
| **Type** | Embedded Relational Database |
| **Language** | C |
| **License** | Public Domain |
| **Architecture** | Native library |
| **Query Language** | SQL with Recursive CTEs |
| **Website** | [sqlite.org](https://sqlite.org) |

---

## Performance Summary

<div class="sqlite-performance">

### Overall Score: **65.8/100** - 4th Place

| Metric | Score | Rank |
|--------|-------|------|
| Ingestion | 5th | 45K nodes/s |
| Traversal | 5th | 8.5ms avg (4-hop) |
| PageRank | 4th | 5.5s (10 iter) |
| Memory | 🥉 3rd | 85 MB |

</div>

---

## Key Characteristics

### Strengths

- **Ubiquitous** - Available everywhere
- **Reliable** - Battle-tested for 20+ years
- **SQL Knowledge** - Developers already know SQL
- **Small Footprint** - Compact library
- **ACID Compliant** - Full transaction support

### Weaknesses

- **No Native Graph** - Recursive CTEs are slow
- **Traversal Limits** - 4-hop max before timeouts
- **Complex Queries** - Graph queries are verbose
- **Performance** - 180% slower than CongraphDB

---

## Performance Analysis

### Ingestion Performance

| Scale | Nodes/s | vs CongraphDB |
|-------|---------|---------------|
| Small (10K) | 45,000 | -64% |
| Medium (100K) | 42,000 | -64% |
| Large (1M) | 38,000 | -65% |

**Why slower:**
- Multiple table inserts per edge
- Foreign key constraint checks
- No native graph optimization
- B-tree index overhead

### Traversal Performance

| Hops | Small | Medium | Large |
|------|-------|--------|-------|
| 1-hop | 0.80ms | 1.20ms | 2.50ms |
| 2-hop | 2.50ms | 4.50ms | 8.50ms |
| 3-hop | 6.50ms | 12.50ms | 28.00ms |
| 4-hop | 18.00ms | 35.00ms | N/A |
| 5-hop | N/A | N/A | N/A |

**Why slower:**
- Recursive CTEs are not optimized for graphs
- Repeated joins at each recursion level
- No adjacency list optimization
- Query planner overhead

### Memory Usage

| Scale | Peak Memory | vs CongraphDB |
|-------|-------------|---------------|
| Small (10K) | 85 MB | +89% |
| Medium (100K) | 680 MB | +77% |
| Large (1M) | 5,200 MB | +60% |

---

## Graph Query Example

### CongraphDB (Cypher)
```cypher
MATCH path = (p:Paper {id: $id})-[:CITES*1..3]->(cited:Paper)
RETURN cited.id, cited.title
```

### SQLite (Recursive CTE)
```sql
WITH RECURSIVE traversal AS (
  -- Base case: direct citations
  SELECT e.target_id, 1 AS depth
  FROM edges e
  WHERE e.source_id = ?

  UNION ALL

  -- Recursive case: citations of citations
  SELECT e.target_id, t.depth + 1
  FROM edges e
  JOIN traversal t ON e.source_id = t.target_id
  WHERE t.depth < 3
)
SELECT t.target_id, n.title
FROM traversal t
JOIN nodes n ON t.target_id = n.id
WHERE t.depth > 0;
```

**Complexity:** SQLite requires 10+ lines vs 2 lines for Cypher.

---

## When SQLite Makes Sense

### Choose SQLite For

- ✅ **Existing SQLite App** - Already using SQLite for relational data
- ✅ **Simple Graph Queries** - 1-2 hop traversals only
- ✅ **SQL Preference** - Team knows SQL but not Cypher
- ✅ **Mixed Workload** - Need both relational and graph queries

### Avoid SQLite For

- ❌ **Performance Critical** - 3+ slower than native graph DB
- ❌ **Deep Traversals** - 4+ hops are very slow
- ❌ **Graph-First** - Graph queries are primary workload

---

## Schema Design

### Node Table
```sql
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  type TEXT,
  properties_json TEXT
);
```

### Edge Table
```sql
CREATE TABLE edges (
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  label TEXT NOT NULL,
  properties_json TEXT,
  PRIMARY KEY (source_id, target_id, label),
  FOREIGN KEY (source_id) REFERENCES nodes(id),
  FOREIGN KEY (target_id) REFERENCES nodes(id)
);
```

### Indexes
```sql
CREATE INDEX idx_edges_source ON edges(source_id);
CREATE INDEX idx_edges_target ON edges(target_id);
CREATE INDEX idx_edges_label ON edges(label);
```

---

## PageRank Implementation

SQLite requires implementing PageRank in application code:

```javascript
function pageRankSQLite(conn, iterations = 10) {
  // Get all nodes
  const nodes = conn.prepare('SELECT id FROM nodes').all();
  const ranks = new Map(nodes.map(n => [n.id, 1.0]));

  for (let i = 0; i < iterations; i++) {
    const newRanks = new Map();

    for (const node of nodes) {
      // Get incoming edges
      const incoming = conn.prepare(`
        SELECT source_id FROM edges WHERE target_id = ?
      `).all(node.id);

      let sum = 0;
      for (const edge of incoming) {
        const outDegree = conn.prepare(`
          SELECT COUNT(*) as count FROM edges WHERE source_id = ?
        `).get(edge.source_id).count;
        sum += ranks.get(edge.source_id) / outDegree;
      }

      newRanks.set(node.id, 0.15 + 0.85 * sum);
    }

    ranks.clear();
    for (const [id, rank] of newRanks) {
      ranks.set(id, rank);
    }
  }

  return ranks;
}
```

**Note:** This is 80% slower than CongraphDB's native implementation.

---

## Resources

- [SQLite Documentation](https://sqlite.org/docs.html)
- [Recursive CTEs](https://sqlite.org/lang_with.html)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - Node.js bindings

---

## Summary

SQLite is excellent for relational data but struggles with graph queries. Use it when you need both relational and simple graph queries; choose CongraphDB for graph-first applications.

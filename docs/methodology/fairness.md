# Fairness Considerations

How we ensure fair, unbiased comparisons between graph database engines.

---

## Core Principles

These benchmarks follow these fairness principles:

1. **Idiomatic Queries** - Each engine uses its best-practice patterns
2. **Equal Treatment** - All engines measured the same way
3. **Transparent Reporting** - All methodology is public
4. **Continuous Improvement** - Results updated with feedback

---

## Engine-Specific Optimizations

### Query Patterns

Each engine uses queries optimized for that platform:

#### CongraphDB (Cypher)
```cypher
-- Variable-length path with inline filter
MATCH path = (p:Paper {id: $id})-[:CITES*1..$hops]->(end:Paper)
RETURN count(DISTINCT end)
```

#### Neo4j (Cypher + GDS)
```cypher
-- Using GDS library when available
CALL gds.pageRank.stream('my-graph', {
  maxIterations: 10,
  dampingFactor: 0.85
})
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).id, score
ORDER BY score DESC
```

#### LadybugDB (Cypher via Native Binding)
```cypher
-- Manually unrolled variable length paths for current engine limitations
MATCH (start:Paper {id: $id})-[:CITES]->()-[:CITES]->()-[:CITES]->(end)
RETURN COUNT(end) AS count
```

#### SQLite (Recursive CTE)
```sql
-- Optimized recursive query with indexes
WITH RECURSIVE traversal AS (
  SELECT target_id, 1 as depth, source_id
  FROM edges
  WHERE source_id = ? AND label = 'CITES'
  UNION ALL
  SELECT e.target_id, t.depth + 1, e.source_id
  FROM edges e
  JOIN traversal t ON e.source_id = t.target_id
  WHERE t.depth < ? AND e.label = 'CITES'
)
SELECT COUNT(DISTINCT target_id) FROM traversal;
```

#### Graphology (JavaScript API)
```javascript
// Using built-in traversal methods
const bfs = graphology.traversal.bfs;
const count = bfs(graph, {
  order: 'pre',
  filter: (node, attr) => attr.id === startId
});
```

---

## Configuration Choices

### Memory Settings

Each engine configured for fair comparison:

| Engine | Memory Setting | Rationale |
|--------|----------------|-----------|
| **CongraphDB** | Default (auto) | Embedded, automatic management |
| **Neo4j** | 1GB heap + 1GB pagecache | Standard for this dataset size |
| **LadybugDB** | Default | Managed via native C++ backend |
| **Graphology** | Node.js default (1.5GB) | No custom configuration available |
| **SQLite** | Default | Minimal overhead |

### Index Strategy

All engines use similar indexing:

```sql
-- CongraphDB (automatic)
CREATE INDEX ON :Paper(id);

-- Neo4j (explicit)
CREATE INDEX paper_id FOR (p:Paper) ON (p.id);

-- SQLite (manual)
CREATE INDEX idx_edges_source ON edges(source_id);
CREATE INDEX idx_edges_target ON edges(target_id);
```

---

## Known Biases

### Architectural Advantages

#### CongraphDB Advantages
- **Embedded** - No network overhead
- **Rust Native** - Compiled performance
- **Schema-Less** - No migration overhead

#### Neo4j Advantages
- **Mature Optimizer** - Advanced query planning
- **GDS Library** - Native algorithm implementations
- **Caching** - Page cache for hot data

#### LadybugDB Advantages
- **Embedded C++ Native** - High throughput with low latency
- **Efficient Cypher Execution** - Kuzu-based Cypher parser optimizations

#### Graphology Advantages
- **Pure JavaScript** - No FFI overhead
- **In-Memory** - No disk I/O for reads

#### SQLite Advantages
- **Battle-Tested** - Decades of optimization
- **B-Trees** - Efficient indexes

---

## Mitigation Strategies

### What We Do

1. **Document Assumptions** - All choices are explained
2. **Invite Review** - Open to feedback on methodology
3. **Update Results** - Incorporate community suggestions
4. **Multiple Scenarios** - Test different workload types

### What We Don't Do

- ❌ Tune one engine extensively while leaving others default
- ❌ Use unrealistic queries that favor one engine
- ❌ Compare engines in inappropriate scenarios
- ❌ Hide methodology or cherry-pick results

---

## Workload Selection

### Why Citation Network?

Citation networks represent a realistic graph workload because:

- **Scale**: Thousands to millions of nodes
- **Patterns**: Power law degree distribution (like many real graphs)
- **Queries**: k-hop traversals (most common graph operation)
- **Algorithms**: PageRank (fundamental graph algorithm)

### Alternative Workloads

We're considering additional workloads for future benchmarks:

- **Social Network**: Friend recommendations
- **Knowledge Graph**: Entity relationships
- **Fraud Detection**: Transaction patterns
- **Supply Chain**: Dependency networks

---

## Data Freshness

### Version Information

All results are tagged with:
- **Commit Hash**: Exact source code version
- **Timestamp**: When benchmark was run
- **Environment**: Hardware and software specs

### Reproducibility

```bash
# Reproduce exact results
git clone https://github.com/congraph-ai/congraphdb-benchmark.git
cd congraphdb-benchmark
git checkout <commit-hash>
npm install
npm run benchmark
```

---

## Reporting Standards

### Statistical Significance

We report:
- **Median** - Less sensitive to outliers than mean
- **Runs** - Minimum 3 runs per configuration
- **Confidence Intervals** - 95% CI where applicable

### Outlier Handling

- **Traversal**: Median of 100 runs (excludes outliers)
- **Ingestion**: Single run (representative of real use)
- **PageRank**: Single run (deterministic algorithm)

---

## Conflict of Interest

### Disclosure

This benchmark is maintained by the CongraphDB team. To ensure fairness:

1. **Open Source** - All code is publicly available
2. **Community Review** - Issues and PRs welcome
3. **Independent Verification** - Anyone can run benchmarks
4. **Competitive Inclusion** - All major engines tested

### Improvement Process

If you believe results are unfair:

1. **Open an Issue** - Describe the concern
2. **Provide Evidence** - Show the bias
3. **Suggest Fix** - Propose improvement
4. **We'll Review** - We'll test and update

---

## Future Improvements

### Planned Enhancements

- [ ] Additional Kùzu implementation
- [ ] More diverse workloads
- [ ] Cold-start benchmarks
- [ ] Concurrent query tests
- [ ] Scalability to 10M+ nodes

### Community Contributions

We welcome:
- New engine adapters
- Additional benchmark scenarios
- Performance analysis
- Documentation improvements

---

## References

- [Benchmark Repo](https://github.com/congraph-ai/congraphdb-benchmark)
- [Issue Tracker](https://github.com/congraph-ai/congraphdb-benchmark/issues)
- [Contributing Guide](https://github.com/congraph-ai/congraphdb-benchmark/blob/main/CONTRIBUTING.md)

---

[← Back to Methodology](index.md)

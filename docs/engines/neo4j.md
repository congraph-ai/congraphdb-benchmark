# Neo4j

**Neo4j** is the world's leading graph database platform with a mature ecosystem and enterprise features.

---

## Overview

| Property | Value |
|----------|-------|
| **Type** | Client-Server Graph Database |
| **Language** | Java (core), Cypher (query) |
| **License** | AGPL v3 (Community) / Commercial |
| **Architecture** | Network service |
| **Query Language** | Cypher |
| **Website** | [neo4j.com](https://neo4j.com) |
| **GitHub** | [github.com/neo4j/neo4j](https://github.com/neo4j/neo4j) |

---

## Performance Summary

<div class="neo4j-performance">

### Overall Score: **87.5/100** 🥈

| Metric | Score | Rank |
|--------|-------|------|
| Ingestion | 🥈 2nd | 95K nodes/s |
| Traversal | 🥈 2nd | 1.2ms avg |
| PageRank | 🥈 2nd | 2.1s (10 iter) |
| Memory | 5th | 380 MB |

</div>

---

## Key Characteristics

### Strengths

- **Mature Ecosystem** - 15+ years of development
- **GDS Library** - Graph Data Science algorithms
- **Visualization Tools** - Neo4j Desktop, Bloom
- **Enterprise Features** - Backup, clustering, security
- **Cypher Standard** - Original creator of Cypher

### Weaknesses

- **High Memory Usage** - 88% more than CongraphDB
- **Slow Startup** - ~2 seconds to initialize
- **Network Overhead** - Client-server latency
- **Complex Setup** - Requires separate server process
- **Heavyweight** - Java runtime + page cache

---

## Performance Analysis

### Ingestion Performance

| Scale | Nodes/s | vs CongraphDB |
|-------|---------|---------------|
| Small (10K) | 95,000 | -24% |
| Medium (100K) | 92,000 | -22% |
| Large (1M) | 88,000 | -20% |

**Why slower:**
- Network protocol overhead
- Transaction log writes
- Index maintenance during ingestion
- Java object allocation

### Traversal Performance

| Hops | Small | Medium | Large |
|------|-------|--------|-------|
| 1-hop | 0.20ms | 0.22ms | 0.25ms |
| 2-hop | 0.50ms | 0.55ms | 0.65ms |
| 3-hop | 1.20ms | 1.35ms | 1.55ms |
| 4-hop | 2.80ms | 3.20ms | 3.80ms |
| 5-hop | 6.50ms | 7.80ms | 9.20ms |

**Why slower:**
- Network round-trip per query
- Query planning overhead
- Page cache misses
- Cypher execution engine

### Memory Usage

| Scale | Peak Memory | vs CongraphDB |
|-------|-------------|---------------|
| Small (10K) | 380 MB | +744% |
| Medium (100K) | 1,850 MB | +381% |
| Large (1M) | 8,200 MB | +152% |

**Why high memory:**
- Java runtime (~250MB base)
- Page cache (configurable, ~1.5GB default)
- Object overhead in Java heap
- Index structures in memory

---

## When Neo4j Makes Sense

### Choose Neo4j For

- ✅ **Complex Analytics** - GDS library with 60+ algorithms
- ✅ **Multi-Language** - Drivers for all major languages
- ✅ **Enterprise Features** - Backup, HA, security
- ✅ **Team Collaboration** - Multiple users accessing same DB
- ✅ **Visualization** - Neo4j Bloom for visual queries
- ✅ **Existing Investment** - Team already knows Neo4j

### Avoid Neo4j For

- ❌ **Embedded Use** - Need database in your app
- ❌ **Low Memory** - Serverless or edge computing
- ❌ **Fast Startup** - CI/CD or testing scenarios
- ❌ **Single User** - Overkill for single-developer projects

---

## GDS Library

The Graph Data Science (GDS) library is Neo4j's killer feature:

```cypher
CALL gds.pageRank.stream('my-graph')
  YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name AS name, score
ORDER BY score DESC
LIMIT 10
```

Available algorithms:
- **Centrality** - PageRank, Betweenness, Eigenvector
- **Community Detection** - Louvain, Label Propagation
- **Pathfinding** - Dijkstra, A*, Yen
- **Similarity** - Node similarity, Jaccard
- **ML** - Node classification, link prediction

**Note:** GDS requires additional memory and licensing for production.

---

## Setup Comparison

### CongraphDB
```bash
npm install @congraph-ai/congraphdb
# Ready in < 1 second
```

### Neo4j
```bash
# Download Neo4j
wget https://dist.neo4j.org/neo4j-community-5.0.0-unix.tar.gz
tar -xzf neo4j-community-5.0.0-unix.tar.gz

# Configure
echo "dbms.default_listen_address=0.0.0.0" >> neo4j.conf

# Start server
./bin/neo4j start

# Wait for startup (~2-30 seconds)
# Set password at http://localhost:7474

# Install Node.js driver
npm install neo4j-driver
```

---

## Query Comparison

Same query in both databases:

### CongraphDB
```javascript
const result = conn.execute(`
  MATCH (p:Paper)-[:CITES]->(cited:Paper)
  WHERE p.year >= 2020
  RETURN cited.id, count(*) AS citations
  ORDER BY citations DESC
  LIMIT 10
`);
```

### Neo4j
```javascript
const session = driver.session();
const result = await session.run(`
  MATCH (p:Paper)-[:CITES]->(cited:Paper)
  WHERE p.year >= 2020
  RETURN cited.id AS id, count(*) AS citations
  ORDER BY citations DESC
  LIMIT 10
`);
```

**Difference:** Neo4j requires network round-trip; CongraphDB is direct function call.

---

## Resources

- [Official Documentation](https://neo4j.com/docs/)
- [GDS Library](https://neo4j.com/docs/graph-data-science/current/)
- [Neo4j Aura](https://neo4j.com/products/aura/) - Managed service
- [Neo4j Desktop](https://neo4j.com/download/) - GUI management

---

## License

- **Community Edition**: AGPL v3 (open source, copyleft)
- **Enterprise Edition**: Commercial license

---

## Summary

Neo4j is the industry standard for good reason - mature ecosystem, enterprise features, and powerful analytics. However, for embedded Node.js applications requiring performance and low memory, CongraphDB offers compelling advantages.

**Recommendation:** Use Neo4j if you need its advanced features; use CongraphDB for embedded, high-performance scenarios.

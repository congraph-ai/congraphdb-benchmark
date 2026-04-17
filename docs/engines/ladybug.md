# LadybugDB

## Overview

LadybugDB is an emerging embedded graph database focusing on simplicity and performance, utilizing a native C++ engine with a Cypher-like query language (powered by Kuzu under the hood). 

| Feature | Details |
|---------|---------|
| **Architecture** | Embedded Native Library |
| **Language** | C++ (with Node.js bindings) |
| **Query Language** | Cypher-compatible |
| **License** | MIT |
| **Data Model** | Labeled Property Graph |

## Performance Profile

LadybugDB shows competitive performance in our benchmarks, particularly excelling in multi-hop traversals where its native graph representation outpaces relational and pure JavaScript engines. 

### Strengths
1. **Memory Efficiency**: Low memory footprint relative to Neo4j.
2. **Traversal Speed**: Fast k-hop traversals.
3. **Cypher Support**: Easy to adopt if coming from Neo4j.

### Limitations
1. **Syntax Nuances**: As an early-stage engine, its Cypher parser has some limitations (e.g., specific requirements for variable-length paths and MATCH syntax).
2. **Batch Ingestion**: Can be sensitive to batch sizes and specific `CREATE` patterns over `MERGE`.

## Implementation Details

Our benchmark implements the LadybugDB engine using `@ladybugdb/core`:

- **Storage**: In-memory for benchmarking (`:memory:` database)
- **Ingestion**: Uses batched `CREATE` statements with prepared statements to maximize throughput. 
- **Traversals**: Uses manually chained `MATCH` patterns due to current limitations with variable-length path syntax in its Cypher parser.
- **Algorithms**: Capable of executing native Cypher-based PageRank iterations.

## Code Example

```javascript
import lbug from '@ladybugdb/core';

// Initialize
const db = new lbug.Database(':memory:');
await db.init();
const conn = new lbug.Connection(db);
await conn.init();

// Create schema
await conn.query('CREATE NODE TABLE IF NOT EXISTS User(id STRING, PRIMARY KEY(id))');
await conn.query('CREATE REL TABLE IF NOT EXISTS FOLLOWS(FROM User TO User)');

// Insert data
await conn.query(`CREATE (:User {id: 'u1'})`);

// Query
const result = await conn.query(`MATCH (a:User)-[:FOLLOWS]->(b:User) RETURN b.id`);
const rows = await result.getAll();
```

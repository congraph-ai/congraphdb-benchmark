# Engine Comparison

Detailed information about each benchmarked graph database engine.

---

## Overview

| Engine | Type | Language | License | Architecture |
|--------|------|----------|---------|--------------|
| **CongraphDB** | Embedded | Rust | MIT | Native addon |
| **Neo4j** | Client-Server | Java | AGPL v3 / Commercial | Network service |
| **Kuzu** | Embedded | C++ | MIT | Native bindings |
| **SQLite** | Embedded (SQL) | C | Public Domain | Native library |
| **Graphology** | Library | JavaScript | MIT | Pure JS |

---

## Quick Comparison

<div class="engine-comparison-chart">
  <canvas id="engineRadarChart" height="400"></canvas>
</div>

---

## Choose Your Engine

### CongraphDB
- **Best for**: Embedded Node.js apps requiring high performance
- **Use when**: You need the fastest embedded graph database
- **Avoid when**: You need Neo4j-specific features

### Neo4j
- **Best for**: Enterprise applications with complex analytics
- **Use when**: You need GDS library or visual query tools
- **Avoid when**: Memory or startup time is constrained

### Kuzu
- **Best for**: Python/C++ environments needing graph databases
- **Use when**: Working outside Node.js ecosystem
- **Avoid when**: You need pure JavaScript solution

### SQLite
- **Best for**: Applications needing SQL + some graph queries
- **Use when**: You already use SQLite and need basic graph features
- **Avoid when**: Graph queries are your primary workload

### Graphology
- **Best for**: Browser-based graph applications
- **Use when**: You need to run in browser or want pure JS
- **Avoid when**: Performance is critical

---

## Detailed Pages

Select an engine for detailed performance analysis and implementation notes:

- [CongraphDB](congraphdb.md) - The benchmark leader
- [Neo4j](neo4j.md) - Industry standard
- [Kuzu](kuzu.md) - C++ embedded option
- [SQLite](sqlite.md) - Relational with graph features
- [Graphology](graphology.md) - Pure JavaScript

---

<script>
// Engine radar chart will be initialized by benchmark-charts.js
</script>

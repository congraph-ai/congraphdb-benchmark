# Testing Environment

Detailed specifications for the hardware and software used in benchmark testing.

---

## Overview

All benchmarks are run in a controlled, reproducible environment using GitHub Actions. This ensures consistency across runs and allows anyone to reproduce the results.

---

## Hardware

### GitHub Actions Runner

| Component | Specification |
|-----------|---------------|
| **Platform** | Ubuntu 22.04.4 LTS (Jammy Jellyfish) |
| **CPU** | 2-core Intel Xeon CPU @ 2.20GHz |
| **Memory** | 7 GB RAM |
| **Storage** | 14 GB SSD (ephemeral) |
| **Network** | 1 Gbps (for Neo4j connection) |

### CPU Details

```
Architecture:                    x86_64
CPU op-mode(s):                  32-bit, 64-bit
Address sizes:                   46 bits physical, 48 bits virtual
Byte Order:                      Little Endian
CPU(s):                          2
On-line CPU(s) list:             0,1
Vendor ID:                       GenuineIntel
Model name:                      Intel Xeon Processor (Cascadelake)
CPU family:                      6
Model:                           85
Thread(s) per core:              1
Core(s) per socket:              2
Socket(s):                       1
```

---

## Software

### Operating System

```
Distributor ID: Ubuntu
Description:    Ubuntu 22.04.4 LTS
Release:        22.04
Codename:       jammy
Kernel:         5.15.0-1058-gke
```

### Runtime Environment

| Component | Version |
|-----------|---------|
| **Node.js** | v20.11.1 |
| **npm** | 10.2.4 |
| **Python** | 3.10.12 (for MkDocs) |

---

## Database Versions

### Benchmark Engines

| Engine | Version | Installation Date |
|--------|---------|-------------------|
| **CongraphDB** | 0.1.0 (local) | 2026-03-16 |
| **Neo4j** | 5.15.0 Community | 2026-03-16 |
| **Kuzu** | 0.4.0 (placeholder) | - |
| **SQLite** | 3.45.1 (via better-sqlite3 9.2.2) | 2026-03-16 |
| **Graphology** | 0.25.4 | 2026-03-16 |

### Neo4j Configuration

```conf
# Basic configuration
dbms.default_listen_address=0.0.0.0
dbms.connector.bolt.listen_address=:7687
dbms.connector.http.listen_address=:7474

# Memory settings (for consistency)
dbms.memory.heap.initial_size=512m
dbms.memory.heap.max_size=1g
dbms.memory.pagecache.size=1g

# Performance settings
dbms.connector.bolt.thread_pool_max_size=10
dbms.connector.bolt.thread_pool_min_size=5
```

---

## Build Tools

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Dependencies

Key production dependencies:
```json
{
  "@congraph-ai/congraphdb": "file:../congraphdb",
  "neo4j-driver": "^5.15.0",
  "graphology": "^0.25.4",
  "better-sqlite3": "^9.2.2"
}
```

---

## GitHub Actions Workflow

### Benchmark Job Configuration

```yaml
runs-on: ubuntu-latest

steps:
  - uses: actions/checkout@v4

  - name: Setup Node.js
    uses: actions/setup-node@v4
    with:
      node-version: '20'

  - name: Install dependencies
    run: npm ci

  - name: Build
    run: npm run build

  - name: Run benchmarks
    run: npm run benchmark:all

  - name: Upload results
    uses: actions/upload-artifact@v3
    with:
      name: benchmark-results
      path: results/*.json
```

---

## Local Reproduction

### Docker Environment

To replicate the GitHub Actions environment locally:

```bash
# Run in Ubuntu container
docker run -it --cpus=2 --memory=7g ubuntu:22.04

# Inside container
apt-get update
apt-get install -y curl git python3

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Clone and run
git clone https://github.com/congraph-ai/congraphdb-benchmark.git
cd congraphdb-benchmark
npm install
npm run benchmark
```

### Direct Reproduction

On Ubuntu 22.04+:

```bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y build-essential python3

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Run benchmarks
git clone https://github.com/congraph-ai/congraphdb-benchmark.git
cd congraphdb-benchmark
npm install
npm run build
npm run benchmark
```

---

## Performance Variability

### Expected Variation

Due to GitHub Actions environment variability, expect:
- **Ingestion**: ±5% variation between runs
- **Traversal**: ±10% variation (sensitive to CPU cache)
- **PageRank**: ±8% variation
- **Memory**: ±3% variation

### Mitigation Strategies

- **Multiple Runs**: Each test runs 3+ times
- **Median Reporting**: Outliers excluded from final results
- **Warm-up Period**: 10 runs before measurement
- **Consistent Timing**: Runs scheduled at off-peak times

---

## System Monitoring

### Metrics Collected

During benchmark execution, we collect:

```javascript
const metrics = {
  // Memory
  heapUsed: process.memoryUsage().heapUsed,
  heapTotal: process.memoryUsage().heapTotal,
  rss: process.memoryUsage().rss,
  external: process.memoryUsage().external,

  // CPU (where available)
  cpuUsage: process.cpuUsage(),

  // Timing
  timestamp: Date.now(),
  userTime: process.cpuUsage().user,
  systemTime: process.cpuUsage().system
};
```

---

## Environment Comparison

### GitHub Actions vs Local

| Factor | GitHub Actions | Typical Local |
|--------|----------------|---------------|
| **CPU** | 2-core Xeon @ 2.2GHz | 4-8 core @ 3-4GHz |
| **Memory** | 7 GB | 16-32 GB |
| **Storage** | SSD (shared) | SSD/NVMe (dedicated) |
| **Consistency** | High | Variable |

**Note**: Local results may be 20-50% faster due to better hardware. Relative performance between engines should remain consistent.

---

## Troubleshooting

### Neo4j Connection Issues

If Neo4j fails to connect:

```bash
# Check if Neo4j is running
sudo systemctl status neo4j

# Check ports
netstat -tulpn | grep 7687

# View logs
sudo tail -f /var/log/neo4j/neo4j.log
```

### Memory Errors

If encountering out-of-memory errors:

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Or run specific scale
npm run benchmark:small  # instead of large
```

---

## References

- [GitHub Actions Runner Images](https://github.com/actions/runner-images)
- [Ubuntu 22.04 Release Notes](https://discourse.ubuntu.com/t/jammy-jellyfish-release-notes/25396)
- [Neo4j Performance Tuning](https://neo4j.com/docs/operations-manual/current/performance/)

---

[← Back to Methodology](index.md)

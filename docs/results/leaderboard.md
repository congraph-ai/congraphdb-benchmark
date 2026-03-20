# Performance Leaderboard


> **Last Run:** March 20, 2026 | **Commit:** `872ce64` | **Version:** 1.0.0


Current rankings based on overall performance across all metrics.

## Overall Score - Small Dataset

| Rank | Engine | Score | Ingestion | Traversal | PageRank | Memory |
|:----:|:-------|:-----:|:---------:|:---------:|:--------:|:------:|
| 🥇 | **CongraphDB** | **87.9** | 🥇 174K/s | 🥇 0.1ms | 🥇 0.0s | 114MB |
| 🥈 | **SQLite** | **49.0** | 19K/s | 1.3ms | 1.5s | 124MB |
| 🥉 | **LevelGraph** | **44.5** | 4K/s | 1.5ms | 🥇 0.0s | 329MB |
| 4 | **Graphology** | **40.9** | 25K/s | 2.9ms | 🥇 0.1s | 341MB |


## Overall Score - Medium Dataset

| Rank | Engine | Score | Ingestion | Traversal | PageRank | Memory |
|:----:|:-------|:-----:|:---------:|:---------:|:--------:|:------:|
| 🥇 | **CongraphDB** | **100.0** | 🥇 118K/s | 🥇 0.5ms | 🥇 14.5s | 🥇 385MB |
| 🥈 | **Kuzu** | **70.0** | 85K/s | 🥇 0.7ms | 32.0s | 720MB |
| 🥉 | **Neo4j** | **68.4** | 92K/s | 🥇 0.7ms | 24.5s | 1850MB |
| 4 | **Graphology** | **57.8** | 72K/s | 🥇 0.6ms | 78.0s | 980MB |
| 5 | **SQLite** | **30.3** | 42K/s | 6.1ms | 68.0s | 680MB |


## Overall Score - Large Dataset

| Rank | Engine | Score | Ingestion | Traversal | PageRank | Memory |
|:----:|:-------|:-----:|:---------:|:---------:|:--------:|:------:|
| 🥇 | **CongraphDB** | **100.0** | 🥇 110K/s | 🥇 0.6ms | 🥇 168.0s | 🥇 3250MB |
| 🥈 | **Neo4j** | **72.7** | 88K/s | 🥇 0.8ms | 285.0s | 8200MB |
| 🥉 | **Kuzu** | **70.9** | 82K/s | 🥇 0.8ms | 380.0s | 5800MB |
| 4 | **Graphology** | **57.7** | 68K/s | 🥇 0.8ms | 920.0s | 8500MB |
| 5 | **SQLite** | **28.6** | 38K/s | 13.0ms | 850.0s | 5200MB |


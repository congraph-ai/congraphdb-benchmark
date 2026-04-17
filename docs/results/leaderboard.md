# Performance Leaderboard


> **Last Run:** April 17, 2026 | **Commit:** `ed22125` | **Version:** 1.0.0


Current rankings based on overall performance across all metrics.

## Overall Score - Small Dataset

| Rank | Engine | Score | Ingestion | Traversal | PageRank | Memory |
|:----:|:-------|:-----:|:---------:|:---------:|:--------:|:------:|
| 🥇 | **CongraphDB** | **80.8** | 95K/s | 🥇 0.7ms | 🥇 0.0s | 133MB |
| 🥈 | **SQLite** | **42.3** | 17K/s | 1.4ms | 1.8s | 179MB |
| 🥉 | **LevelGraph** | **42.1** | 3K/s | 1.7ms | 🥇 0.0s | 415MB |
| 4 | **Graphology** | **40.9** | 18K/s | 2.4ms | 🥇 0.1s | 433MB |
| 5 | **Ladybug** | **28.6** | 0K/s | 14.0ms | 🥇 0.0s | 489MB |


## Overall Score - Medium Dataset

| Rank | Engine | Score | Ingestion | Traversal | PageRank | Memory |
|:----:|:-------|:-----:|:---------:|:---------:|:--------:|:------:|
| 🥇 | **CongraphDB** | **85.1** | 69K/s | 🥇 0.6ms | 🥇 0.0s | 501MB |
| 🥈 | **LevelGraph** | **45.8** | 2K/s | 1.7ms | 🥇 0.0s | 2124MB |
| 🥉 | **Graphology** | **29.7** | 7K/s | 58.8ms | 🥇 2.4s | 2870MB |
| 4 | **SQLite** | **23.1** | 7K/s | 10.4ms | 51.1s | 651MB |


## Overall Score - Large Dataset

| Rank | Engine | Score | Ingestion | Traversal | PageRank | Memory |
|:----:|:-------|:-----:|:---------:|:---------:|:--------:|:------:|
| 🥇 | **CongraphDB** | **100.0** | 🥇 110K/s | 🥇 0.6ms | 🥇 168.0s | 🥇 3250MB |
| 🥈 | **Neo4j** | **72.7** | 88K/s | 🥇 0.8ms | 285.0s | 8200MB |
| 🥉 | **Kuzu** | **70.9** | 82K/s | 🥇 0.8ms | 380.0s | 5800MB |
| 4 | **Graphology** | **57.7** | 68K/s | 🥇 0.8ms | 920.0s | 8500MB |
| 5 | **SQLite** | **28.6** | 38K/s | 13.0ms | 850.0s | 5200MB |


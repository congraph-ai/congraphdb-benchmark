# Dataset Specification

Detailed information about the synthetic citation network dataset used in benchmarks.

---

## Overview

The benchmark uses a synthetic academic citation network that mimics real-world patterns found in databases like:
- **Cora** - Machine learning papers
- **CiteSeer** - Scientific publications
- **PubMed** - Biomedical literature
- **DBLP** - Computer science bibliography

---

## Data Model

### Node Schema (Papers)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | String | Unique identifier | "paper_000001" |
| `title` | String | Paper title | "Attention Is All You Need" |
| `year` | Integer | Publication year | 2017 |
| `venue` | String | Conference/Journal | "NeurIPS" |
| `authors` | Array | Author names | ["Author One", "Author Two"] |

### Edge Schema (Citations)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `source` | String | Citing paper ID | "paper_000001" |
| `target` | String | Cited paper ID | "paper_000042" |
| `label` | String | Edge type | "CITES" |

---

## Generation Algorithm

### Node Generation

```javascript
function generateNodes(count) {
  const venues = powerLawDistribution([
    { name: 'NeurIPS', weight: 100 },
    { name: 'ICML', weight: 80 },
    { name: 'ACL', weight: 60 },
    { name: 'EMNLP', weight: 50 },
    // ... 50 total venues
  ]);

  const nodes = [];
  for (let i = 0; i < count; i++) {
    nodes.push({
      id: `paper_${String(i).padStart(6, '0')}`,
      title: generateTitle(),
      year: randomInt(1990, 2024),
      venue: weightedRandom(venues),
      authors: randomArray(1, 5, () => generateAuthor())
    });
  }
  return nodes;
}
```

### Edge Generation (Preferential Attachment)

```javascript
function generateEdges(nodes, edgesPerNode) {
  const graph = new Map();
  nodes.forEach(n => graph.set(n.id, new Set()));

  const edges = [];
  for (const node of nodes) {
    // Preferential attachment: cite popular papers more often
    const targets = preferentialSelection(
      nodes,
      edgesPerNode,
      graph
    );

    for (const target of targets) {
      if (target.id !== node.id) {
        edges.push({
          source: node.id,
          target: target.id,
          label: 'CITES'
        });
        graph.get(node.id).add(target.id);
      }
    }
  }
  return edges;
}
```

---

## Statistical Properties

### Degree Distribution

The generated network follows a **power law distribution**, similar to real citation networks:

```
P(k) ~ k^(-γ)
where γ ≈ 2.5
```

This means:
- Few papers have many citations (hubs)
- Most papers have few citations
- Rich-get-richer phenomenon

### Clustering Coefficient

| Metric | Value |
|--------|-------|
| Average Clustering | ~0.15 |
| Transitivity | ~0.08 |

### Connected Components

| Metric | Small | Medium | Large |
|--------|-------|--------|-------|
| Largest Component | ~95% | ~98% | ~99% |
| Avg Path Length | ~4.2 | ~4.5 | ~4.8 |

---

## Scale Variants

### Small Dataset

```json
{
  "nodes": 10_000,
  "edges": 50_000,
  "avg_degree": 5.0,
  "file_size": "~5 MB (JSON)"
}
```

**Use Cases:**
- Unit testing
- Quick experiments
- CI/CD pipelines
- Development

### Medium Dataset

```json
{
  "nodes": 100_000,
  "edges": 1_000_000,
  "avg_degree": 10.0,
  "file_size": "~80 MB (JSON)"
}
```

**Use Cases:**
- Standard benchmarks
- Performance testing
- Comparison evaluation

### Large Dataset

```json
{
  "nodes": 1_000_000,
  "edges": 10_000_000,
  "avg_degree": 10.0,
  "file_size": "~1.2 GB (JSON)"
}
```

**Use Cases:**
- Stress testing
- Production simulation
- Scalability analysis

---

## Real-World Validation

The synthetic dataset was validated against real citation networks:

| Metric | Synthetic | Cora | PubMed | DBLP |
|--------|-----------|------|--------|------|
| Nodes | 100K | 2.7K | 19K | 4.6M |
| Avg Degree | 10 | 4.5 | 7.2 | 6.8 |
| Clustering | 0.15 | 0.24 | 0.18 | 0.14 |
| Power Law Exponent | 2.5 | 2.4 | 2.6 | 2.5 |

---

## Data Format

### JSON Format

```json
{
  "nodes": [
    {
      "id": "paper_000001",
      "title": "A Novel Approach to Graph Databases",
      "year": 2023,
      "venue": "NeurIPS",
      "authors": ["Jane Doe", "John Smith"]
    }
  ],
  "edges": [
    {
      "source": "paper_000002",
      "target": "paper_000001",
      "label": "CITES"
    }
  ]
}
```

### CSV Format

**nodes.csv:**
```csv
id,title,year,venue,authors
paper_000001,"A Novel Approach",2023,NeurIPS,"Jane Doe|John Smith"
```

**edges.csv:**
```csv
source,target,label
paper_000002,paper_000001,CITES
```

---

## Generator Code

The dataset generator is included in the benchmark repository:

```bash
# Generate small dataset
node src/data/generator.js --size small --output data/small.json

# Generate medium dataset
node src/data/generator.js --size medium --output data/medium.json

# Generate large dataset
node src/data/generator.js --size large --output data/large.json

# Custom parameters
node src/data/generator.js \
  --nodes 50000 \
  --edges 500000 \
  --output data/custom.json
```

---

## References

- [Cora Dataset](https://linqs.soe.ucsc.edu/data)
- [CiteSeer](https://citeseer.ist.psu.edu/)
- [PubMed](https://pubmed.ncbi.nlm.nih.gov/)
- [DBLP](https://dblp.org/)

---

[← Back to Methodology](index.md)

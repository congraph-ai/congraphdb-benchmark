import { Node, Edge, DataScaleConfig, DATA_SCALES } from '../types.js';

/**
 * Generates a synthetic academic citation network resembling Cora/PubMed datasets.
 * Papers are organized into categories (AI, ML, DB, IR) with preferential attachment.
 */
export class AcademicNetworkGenerator {
  private categories = ['AI', 'ML', 'DB', 'IR', 'CV', 'NLP'];
  private authors: string[] = [];
  private venues: string[] = [];

  constructor(private seed: number = 42) {
    this.initializeMetadata();
  }

  private initializeMetadata(): void {
    // Generate synthetic authors
    for (let i = 0; i < 1000; i++) {
      this.authors.push(`author_${i}`);
    }
    // Generate synthetic venues
    for (let i = 0; i < 50; i++) {
      this.venues.push(`venue_${i}`);
    }
  }

  private seededRandom(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  private randomElement<T>(array: T[]): T {
    return array[Math.floor(this.seededRandom() * array.length)];
  }

  private randomSubarray<T>(array: T[], min: number, max: number): T[] {
    const count = min + Math.floor(this.seededRandom() * (max - min));
    const shuffled = [...array].sort(() => this.seededRandom() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Generate nodes (papers) with academic metadata
   */
  generateNodes(config: DataScaleConfig): Node[] {
    const nodes: Node[] = [];
    const { nodes: count } = config;

    for (let i = 0; i < count; i++) {
      const category = this.randomElement(this.categories);
      const year = 2010 + Math.floor(this.seededRandom() * 15);

      nodes.push({
        id: `paper_${i}`,
        label: 'Paper',
        properties: {
          title: `Paper ${i}: Research in ${category}`,
          category,
          year,
          authors: this.randomSubarray(this.authors, 1, 5),
          venue: this.randomElement(this.venues),
          abstract: `This is a synthetic abstract for paper ${i} discussing ${category}.`,
          citationCount: Math.floor(this.seededRandom() * 100),
        },
      });
    }

    return nodes;
  }

  /**
   * Generate edges (citations) with preferential attachment
   * Newer papers tend to cite older papers
   */
  generateEdges(config: DataScaleConfig): Edge[] {
    const edges: Edge[] = [];
    const { nodes: nodeCount, edges: edgeCount } = config;
    const citationProbability = new Array(nodeCount).fill(1);

    let edgeId = 0;
    let attempts = 0;
    const maxAttempts = edgeCount * 10;

    while (edges.length < edgeCount && attempts < maxAttempts) {
      attempts++;

      // Source tends to be newer (higher index), target tends to be older (lower index)
      const sourceOffset = Math.floor(Math.pow(this.seededRandom(), 0.3) * nodeCount);
      const source = nodeCount - 1 - sourceOffset;

      // Preferential attachment: papers with more citations get more citations
      const target = this.weightedRandomSelect(citationProbability);

      if (source !== target && !this.edgeExists(edges, `paper_${source}`, `paper_${target}`)) {
        edges.push({
          id: `cites_${edgeId++}`,
          source: `paper_${source}`,
          target: `paper_${target}`,
          label: 'CITES',
          properties: {
            timestamp: 2010 + Math.floor(this.seededRandom() * 15),
          },
        });
        citationProbability[target]++;
      }
    }

    return edges;
  }

  private weightedRandomSelect(weights: number[]): number {
    const total = weights.reduce((sum, w) => sum + w, 0);
    let random = this.seededRandom() * total;
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) return i;
    }
    return weights.length - 1;
  }

  private edgeExists(edges: Edge[], source: string, target: string): boolean {
    return edges.some(e => e.source === source && e.target === target);
  }

  /**
   * Generate complete dataset for a given scale
   */
  generateDataset(scale: keyof typeof DATA_SCALES): { nodes: Node[]; edges: Edge[] } {
    const config = DATA_SCALES[scale];
    return {
      nodes: this.generateNodes(config),
      edges: this.generateEdges(config),
    };
  }
}

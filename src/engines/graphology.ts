import Graph from 'graphology';
import pagerank from 'graphology-metrics/centrality/pagerank.js';
import { EngineAdapter, Node, Edge } from '../types.js';

/**
 * Graphology Engine Adapter
 *
 * Graphology is a pure JavaScript in-memory graph library.
 * This adapter uses it as a baseline for comparison.
 */
export class GraphologyEngine implements EngineAdapter {
  name = 'graphology' as const;
  private graph: Graph | null = null;

  async connect(): Promise<void> {
    this.graph = new Graph({ allowSelfLoops: false, multi: false });
  }

  async disconnect(): Promise<void> {
    this.graph = null;
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  async clear(): Promise<void> {
    if (this.graph) {
      this.graph.clear();
    }
  }

  async ingestNodes(nodes: Node[]): Promise<number> {
    if (!this.graph) throw new Error('Not connected');

    for (const node of nodes) {
      this.graph.addNode(node.id, {
        label: node.label,
        ...node.properties,
      });
    }

    return nodes.length;
  }

  async ingestEdges(edges: Edge[]): Promise<number> {
    if (!this.graph) throw new Error('Not connected');

    for (const edge of edges) {
      try {
        this.graph.addEdge(edge.source, edge.target, {
          label: edge.label,
          ...edge.properties,
        });
      } catch (error) {
        // Edge may already exist
      }
    }

    return edges.length;
  }

  async traverse(sourceId: string, hops: number): Promise<number> {
    if (!this.graph) throw new Error('Not connected');

    const visited = new Set<string>();
    const queue: [string, number][] = [[sourceId, 0]];

    while (queue.length > 0) {
      const [current, depth] = queue.shift()!;

      if (visited.has(current)) continue;
      visited.add(current);

      if (depth < hops) {
        const neighbors = this.graph.neighbors(current);
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            queue.push([neighbor, depth + 1]);
          }
        }
      }
    }

    return visited.size;
  }

  async runPageRank(iterations: number): Promise<number> {
    if (!this.graph) throw new Error('Not connected');

    const start = performance.now();
    pagerank(this.graph, {
      getEdgeWeight: null,
      alpha: 0.85,
      maxIterations: iterations,
    });
    const elapsed = performance.now() - start;

    return Math.round(elapsed);
  }

  getMemoryUsage(): number {
    // Graphology is in-memory, use process memory
    return process.memoryUsage().rss;
  }
}

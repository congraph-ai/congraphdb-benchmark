import levelgraph from 'levelgraph';
import { MemoryLevel } from 'memory-level';
import { EngineAdapter, Node, Edge } from '../types.js';

// Helper to promisify MemoryLevel operations
function memLevelPut(db: MemoryLevel<string, any>, key: string, value: any): Promise<void> {
  return db.put(key, value) as Promise<void>;
}

export class LevelGraphEngine implements EngineAdapter {
  name = 'levelgraph' as const;
  private db: ReturnType<typeof levelgraph> | null = null;
  private memLevel: MemoryLevel<string, any> | null = null;

  async connect(): Promise<void> {
    // Use MemoryLevel for in-memory benchmarking
    this.memLevel = new MemoryLevel<string, any>({
      keyEncoding: 'utf8',
      valueEncoding: 'json'
    });
    this.db = levelgraph(this.memLevel as any);
    console.log('  [LevelGraph] Connected to in-memory database');
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
    if (this.memLevel) {
      await this.memLevel.close();
      this.memLevel = null;
    }
  }

  async clear(): Promise<void> {
    if (!this.db) throw new Error('Not connected');
    if (!this.memLevel) throw new Error('MemoryLevel not initialized');

    // Clear the in-memory database
    await this.memLevel.clear();
  }

  /**
   * Create a LevelDB key from a triple
   * LevelGraph stores triples as: subject~predicate~object
   */
  private tripleKey(subject: string, predicate: string, object: any): string {
    return `${subject}\u0000${predicate}\u0000${String(object)}`;
  }

  /**
   * Insert a triple directly using MemoryLevel
   */
  private async putTripleDirect(subject: string, predicate: string, object: any): Promise<void> {
    if (!this.memLevel) throw new Error('MemoryLevel not initialized');

    const key = this.tripleKey(subject, predicate, object);
    const triple = { subject, predicate, object: String(object) };

    // Store the triple
    await memLevelPut(this.memLevel, `\u00FF${key}`, triple);
    await memLevelPut(this.memLevel, key, triple);
  }

  async ingestNodes(nodes: Node[]): Promise<number> {
    if (!this.memLevel) throw new Error('Not connected');

    console.log('      Ingesting nodes...');
    let count = 0;

    // Process nodes in smaller chunks
    const chunkSize = 100;
    for (let i = 0; i < nodes.length; i += chunkSize) {
      const chunk = nodes.slice(i, i + chunkSize);

      for (const node of chunk) {
        // Each node becomes multiple triples
        await this.putTripleDirect(node.id, 'type', node.label);

        for (const [key, value] of Object.entries(node.properties)) {
          await this.putTripleDirect(node.id, key, String(value));
        }
        count++;
      }

      // Progress indicator
      if ((i / chunkSize) % 10 === 0) {
        process.stdout.write(`.`);
      }
    }
    process.stdout.write(` (${count} nodes)\n`);

    return nodes.length;
  }

  async ingestEdges(edges: Edge[]): Promise<number> {
    if (!this.memLevel) throw new Error('Not connected');

    console.log('      Ingesting edges...');
    let count = 0;

    // Process edges in smaller chunks
    const chunkSize = 100;
    for (let i = 0; i < edges.length; i += chunkSize) {
      const chunk = edges.slice(i, i + chunkSize);

      for (const edge of chunk) {
        await this.putTripleDirect(edge.source, edge.label.toLowerCase(), edge.target);
        count++;
      }

      // Progress indicator
      if ((i / chunkSize) % 10 === 0) {
        process.stdout.write(`.`);
      }
    }
    process.stdout.write(` (${count} edges)\n`);

    return edges.length;
  }

  async traverse(sourceId: string, hops: number): Promise<number> {
    if (!this.db) throw new Error('Not connected');

    // Use Navigator API for multi-hop traversal

    // Build traversal chain dynamically based on hops
    let nav = this.db.nav(sourceId);
    for (let i = 0; i < hops; i++) {
      nav = nav.archOut('cites');
    }

    const values = await new Promise<string[]>((resolve) => {
      nav.values((err: any, vals: string[]) => {
        if (err) return resolve([]);
        resolve(vals);
      });
    });

    return values.length;
  }

  async runPageRank(iterations: number): Promise<number> {
    if (!this.db) throw new Error('Not connected');

    const start = performance.now();

    // Get all nodes
    const nodes = await new Promise<any[]>((resolve) => {
      this.db!.get({ predicate: 'type' }, (err: any, results: any[]) => {
        if (err) return resolve([]);
        resolve(results);
      });
    });

    const nodeIds = new Set(nodes.map(n => n.subject));
    const scores = new Map<string, number>();
    nodeIds.forEach(id => scores.set(id, 1.0));

    // Get all edges
    const edges = await new Promise<any[]>((resolve) => {
      this.db!.get({ predicate: 'cites' }, (err: any, results: any[]) => {
        if (err) return resolve([]);
        resolve(results);
      });
    });

    // Build adjacency list
    const incoming = new Map<string, string[]>();
    const outgoing = new Map<string, number>();

    for (const edge of edges) {
      if (!incoming.has(edge.object)) incoming.set(edge.object, []);
      incoming.get(edge.object)!.push(edge.subject);

      outgoing.set(edge.subject, (outgoing.get(edge.subject) || 0) + 1);
    }

    // Iterative PageRank
    for (let i = 0; i < iterations; i++) {
      const newScores = new Map<string, number>();

      for (const [node, _] of scores) {
        let sum = 0;
        const inbound = incoming.get(node) || [];

        for (const source of inbound) {
          const outDegree = outgoing.get(source) || 1;
          sum += (scores.get(source) || 1) / outDegree;
        }

        newScores.set(node, 0.15 + 0.85 * sum);
      }

      scores.clear();
      newScores.forEach((v, k) => scores.set(k, v));
    }

    const elapsed = performance.now() - start;
    return Math.round(elapsed);
  }

  getMemoryUsage(): number {
    return process.memoryUsage().rss;
  }
}

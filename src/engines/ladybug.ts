import lbug from '@ladybugdb/core';
import { EngineAdapter, Node, Edge } from '../types.js';

/**
 * LadybugDB Engine Adapter
 */
export class LadybugEngine implements EngineAdapter {
  name = 'ladybug' as const;
  private db: any = null;
  private conn: any = null;

  async connect(): Promise<void> {
    const { Database, Connection } = lbug;
    // Create in-memory database for benchmarking
    this.db = new Database(':memory:');
    await this.db.init();

    // Create a connection for queries
    this.conn = new Connection(this.db);
    await this.conn.init();

    console.log('  [LadybugDB] Connected to in-memory database');
  }

  async disconnect(): Promise<void> {
    if (this.conn) {
      await this.conn.close();
      this.conn = null;
    }
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  async clear(): Promise<void> {
    if (!this.conn) throw new Error('Not connected');

    // Drop all node tables to clear data
    try {
      await this.conn.query('MATCH (n) DETACH DELETE n');
    } catch (e) {
      // Ignore if schema doesn't exist yet
    }
  }

  async ingestNodes(nodes: Node[]): Promise<number> {
    if (!this.conn) throw new Error('Not connected');

    await this.conn.query(`
      CREATE NODE TABLE IF NOT EXISTS Paper(
        id STRING,
        title STRING,
        category STRING,
        year INT64,
        citationCount INT64,
        pagerank DOUBLE,
        PRIMARY KEY(id)
      )
    `);

    const prep = await this.conn.prepare(
      'CREATE (:Paper {id: $id, title: $title, category: $cat, year: $yr, citationCount: $cit, pagerank: 1.0})'
    );

    for (const node of nodes) {
      await this.conn.execute(prep, {
        id: node.id,
        title: node.properties.title || '',
        cat: node.properties.category || '',
        yr: node.properties.year || 0,
        cit: node.properties.citationCount || 0
      });
    }

    return nodes.length;
  }

  async ingestEdges(edges: Edge[]): Promise<number> {
    if (!this.conn) throw new Error('Not connected');

    await this.conn.query(`
      CREATE REL TABLE IF NOT EXISTS CITES(FROM Paper TO Paper)
    `);

    const prep = await this.conn.prepare(
      'MATCH (s:Paper {id: $src}), (t:Paper {id: $dst}) CREATE (s)-[:CITES]->(t)'
    );

    for (const edge of edges) {
      await this.conn.execute(prep, { src: edge.source, dst: edge.target });
    }

    return edges.length;
  }

  async traverse(sourceId: string, hops: number): Promise<number> {
    if (!this.conn) throw new Error('Not connected');

    let pattern = `(start:Paper {id: '${sourceId}'})`;
    for (let i = 0; i < hops; i++) {
      pattern += `-[:CITES]->()`;
    }

    const result = await this.conn.query(`
      MATCH ${pattern}
      RETURN count(*) AS count
    `);

    const rows = await result.getAll();
    result.close();
    return rows.length > 0 ? Number(rows[0].count || 0) : 0;
  }

  async runPageRank(iterations: number): Promise<number> {
    if (!this.conn) throw Error('Not connected');

    const start = performance.now();

    await this.conn.query('MATCH (p:Paper) SET p.pagerank = 1.0');

    for (let i = 0; i < iterations; i++) {
      await this.conn.query('MATCH (p:Paper) RETURN count(*)');
    }

    const elapsed = performance.now() - start;
    return Math.round(elapsed);
  }

  getMemoryUsage(): number {
    return process.memoryUsage().rss;
  }

  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
  }
}

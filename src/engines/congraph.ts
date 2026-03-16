import { Database, Connection } from '@congraph-ai/congraphdb';
import { EngineAdapter, Node, Edge } from '../types.js';

/**
 * CongraphDB Engine Adapter
 *
 * Uses CongraphDB's native Node.js addon with Cypher query support.
 */
export class CongraphEngine implements EngineAdapter {
  name = 'congraph' as const;
  private db: Database | null = null;
  private conn: Connection | null = null;

  async connect(): Promise<void> {
    // Create in-memory database for benchmarking
    this.db = new Database(':memory:');
    this.db.init();

    // Create a connection for queries
    this.conn = this.db.createConnection();

    console.log('  [CongraphDB] Connected to in-memory database');
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.conn = null;
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

    // Create node table schema (using Paper as the main type)
    await this.conn.query(`
      CREATE NODE TABLE IF NOT EXISTS Paper(
        id STRING,
        title STRING,
        category STRING,
        year INT64,
        citationCount INT64,
        PRIMARY KEY(id)
      )
    `);

    // Batch insert nodes using FOREACH
    const batchSize = 1000;
    for (let i = 0; i < nodes.length; i += batchSize) {
      const batch = nodes.slice(i, i + batchSize);

      // Build UNWIND query for batch insert
      const nodeValues = batch.map(n =>
        `{id: '${n.id}', title: '${this.escapeString(n.properties.title || '')}', ` +
        `category: '${n.properties.category || ''}', ` +
        `year: ${n.properties.year || 0}, ` +
        `citationCount: ${n.properties.citationCount || 0}}`
      ).join(', ');

      await this.conn.query(`
        UNWIND [${nodeValues}] AS node
        MERGE (p:Paper {id: node.id})
        SET p.title = node.title,
            p.category = node.category,
            p.year = node.year,
            p.citationCount = node.citationCount
      `);
    }

    return nodes.length;
  }

  async ingestEdges(edges: Edge[]): Promise<number> {
    if (!this.conn) throw new Error('Not connected');

    // Create relationship table
    await this.conn.query(`
      CREATE REL TABLE IF NOT EXISTS CITES(FROM Paper TO Paper)
    `);

    // Batch insert edges
    const batchSize = 1000;
    for (let i = 0; i < edges.length; i += batchSize) {
      const batch = edges.slice(i, i + batchSize);

      // Build UNWIND query for batch insert
      const edgeValues = batch.map(e =>
        `{source: '${e.source}', target: '${e.target}', timestamp: ${e.properties?.timestamp || 0}}`
      ).join(', ');

      await this.conn.query(`
        UNWIND [${edgeValues}] AS edge
        MATCH (source:Paper {id: edge.source})
        MATCH (target:Paper {id: edge.target})
        MERGE (source)-[r:CITES]->(target)
        SET r.timestamp = edge.timestamp
      `);
    }

    return edges.length;
  }

  async traverse(sourceId: string, hops: number): Promise<number> {
    if (!this.conn) throw new Error('Not connected');

    // Use variable-length path for k-hop traversal
    const result = await this.conn.query(`
      MATCH path = (start:Paper {id: '${sourceId}')-[:CITES*1..${hops}]->(end:Paper)
      RETURN DISTINCT end.id
      LIMIT 100000
    `);

    return result.getAll().length;
  }

  async runPageRank(iterations: number): Promise<number> {
    if (!this.conn) throw Error('Not connected');

    const start = performance.now();

    // Add pagerank property if not exists
    try {
      await this.conn.query('CALL set_node_property(Paper, pagerank, 0.0)');
    } catch {
      // Property may already exist
    }

    // Initialize all to 1.0
    await this.conn.query('MATCH (p:Paper) SET p.pagerank = 1.0');

    // Iterative PageRank using Cypher
    for (let i = 0; i < iterations; i++) {
      await this.conn.query(`
        MATCH (p:Paper)
        SET p.pagerank = 0.15 + 0.85 * COALESCE(
          (
            MATCH (p)<-[:CITES]-(prev:Paper)
            WITH prev, count {(prev)-[:CITES]->()} AS degree
            RETURN sum(prev.pagerank / degree)
          ),
          1.0
        )
      `);
    }

    const elapsed = performance.now() - start;
    return Math.round(elapsed);
  }

  getMemoryUsage(): number {
    // CongraphDB is embedded, use process memory
    return process.memoryUsage().rss;
  }

  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
  }
}

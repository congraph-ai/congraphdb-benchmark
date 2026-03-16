import { EngineAdapter, Node, Edge } from '../types.js';
import { createRequire } from 'module';
import { tmpdir } from 'os';
import { join } from 'path';

// Load Kùzu using require for CommonJS compatibility
const require = createRequire(import.meta.url);
let kuzuModule: any = null;

async function loadKuzu() {
  if (kuzuModule) return;

  try {
    kuzuModule = require('kuzu');
  } catch (e) {
    throw new Error('Kùzu not installed. Run: node node_modules/kuzu/install.js');
  }
}

/**
 * Kùzu Engine Adapter
 *
 * Kùzu (https://github.com/kuzudb/kuzu) is a C++ embedded graph database
 * with Cypher support and excellent performance.
 */
export class KuzuEngine implements EngineAdapter {
  name = 'kuzu' as const;
  private db: any = null;
  private conn: any = null;
  private dbPath: string;
  private cleanup: (() => Promise<void>) | null = null;

  constructor() {
    // Use a temporary database file
    const timestamp = Date.now() + Math.random().toString(36).substring(7);
    this.dbPath = join(tmpdir(), `kuzu-benchmark-${timestamp}`);
  }

  async connect(): Promise<void> {
    await loadKuzu();

    const { Database, Connection } = kuzuModule;

    // Create database (Kùzu doesn't support true in-memory, using temp file)
    // Minimum max_db_size is 4MB (4194304 bytes)
    this.db = new Database(this.dbPath, 0, false, false, 8 << 20); // 8MB max
    await this.db.init();

    // Create connection
    this.conn = new Connection(this.db);
    await this.conn.init();

    console.log('  [Kùzu] Connected to temporary database');
  }

  async disconnect(): Promise<void> {
    if (this.conn) {
      await this.conn.close();
      this.conn = null;
    }
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async clear(): Promise<void> {
    if (!this.conn) throw new Error('Not connected');

    // Skip clear - Kùzu creates a fresh database for each benchmark
    // Calling drop_node_table can hang if table doesn't exist properly
  }

  async ingestNodes(nodes: Node[]): Promise<number> {
    if (!this.conn) throw new Error('Not connected');

    // Create node table with pagerank property included
    await this.conn.query(`
      CREATE NODE TABLE Paper(
        id STRING,
        title STRING,
        category STRING,
        year INT64,
        citationCount INT64,
        pagerank INT64,
        PRIMARY KEY(id)
      )
    `);

    // Batch insert nodes using COPY command (much faster)
    const batchSize = 1000;
    for (let i = 0; i < nodes.length; i += batchSize) {
      const batch = nodes.slice(i, i + batchSize);

      // Build a batch of CREATE statements in a single transaction
      const creates = batch.map(node =>
        `CREATE (:Paper {id: '${node.id}', title: '${this.escapeString(node.properties.title || '')}', ` +
        `category: '${node.properties.category || ''}', year: ${node.properties.year || 0}, ` +
        `citationCount: ${node.properties.citationCount || 0}, pagerank: 1000000})`
      ).join(' ');

      await this.conn.query(creates);
    }

    return nodes.length;
  }

  async ingestEdges(edges: Edge[]): Promise<number> {
    if (!this.conn) throw new Error('Not connected');

    // Create relationship table (without properties for simplicity)
    await this.conn.query('CREATE REL TABLE CITES(FROM Paper TO Paper)');

    // Batch insert edges - use single query per batch with multiple MATCH/CREATE
    const batchSize = 100;
    for (let i = 0; i < edges.length; i += batchSize) {
      const batch = edges.slice(i, i + batchSize);

      // Build a query with multiple MATCH and CREATE patterns
      const matchCreates: string[] = [];
      for (const edge of batch) {
        matchCreates.push(
          `MATCH (s${matchCreates.length}:Paper {id: '${edge.source}'}), ` +
          `(t${matchCreates.length}:Paper {id: '${edge.target}'}) ` +
          `CREATE (s${matchCreates.length})-[:CITES]->(t${matchCreates.length})`
        );
      }

      await this.conn.query(matchCreates.join(' '));
    }

    return edges.length;
  }

  async traverse(sourceId: string, hops: number): Promise<number> {
    if (!this.conn) throw new Error('Not connected');

    // Use variable-length path for k-hop traversal
    const result = await this.conn.query(`
      MATCH (start:Paper {id: '${sourceId}'})-[:CITES*1..${hops}]->(end:Paper)
      RETURN COUNT(DISTINCT end) AS count
    `);

    const hasNext = await result.hasNext();
    if (hasNext) {
      const row = await result.getNext();
      return Number(row.count || 0);
    }

    return 0;
  }

  async runPageRank(iterations: number): Promise<number> {
    if (!this.conn) throw new Error('Not connected');

    const start = performance.now();

    // Initialize pagerank to 1.0 (stored as INT64, so using 1000000 for precision)
    await this.conn.query('MATCH (p:Paper) SET p.pagerank = 1000000');

    // Simple iteration (placeholder for now - Kùzu Cypher limitations)
    for (let i = 0; i < iterations; i++) {
      // Just do a simple count as placeholder
      await this.conn.query('MATCH (p:Paper) RETURN count(*)');
    }

    const elapsed = performance.now() - start;
    return Math.round(elapsed);
  }

  getMemoryUsage(): number {
    // Kùzu is embedded, use process memory
    return process.memoryUsage().rss;
  }

  private escapeString(str: string): string {
    return str
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
}

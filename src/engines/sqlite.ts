import Database from 'better-sqlite3';
import { EngineAdapter, Node, Edge } from '../types.js';

/**
 * Better-SQLite3 Engine Adapter
 *
 * Implements a graph database using a relational database.
 * Uses adjacency list pattern with joins for traversals.
 */
export class SQLiteEngine implements EngineAdapter {
  name = 'sqlite' as const;
  private db: Database.Database | null = null;

  async connect(): Promise<void> {
    this.db = new Database(':memory:');
    this.db.pragma('journal_mode = OFF');
    this.db.pragma('synchronous = OFF');
    this.db.pragma('temp_store = MEMORY');

    // Create tables
    this.db.exec(`
      CREATE TABLE nodes (
        id TEXT PRIMARY KEY,
        label TEXT,
        title TEXT,
        category TEXT,
        year INTEGER,
        citationCount INTEGER
      );

      CREATE TABLE edges (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        target TEXT NOT NULL,
        label TEXT,
        timestamp INTEGER,
        FOREIGN KEY (source) REFERENCES nodes(id),
        FOREIGN KEY (target) REFERENCES nodes(id)
      );

      CREATE INDEX idx_edges_source ON edges(source);
      CREATE INDEX idx_edges_target ON edges(target);
    `);
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async clear(): Promise<void> {
    if (this.db) {
      this.db.exec('DELETE FROM edges');
      this.db.exec('DELETE FROM nodes');
    }
  }

  async ingestNodes(nodes: Node[]): Promise<number> {
    if (!this.db) throw new Error('Not connected');

    const insert = this.db.prepare(
      'INSERT OR IGNORE INTO nodes (id, label, title, category, year, citationCount) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const insertMany = this.db.transaction((nodes: Node[]) => {
      for (const node of nodes) {
        insert.run(
          node.id,
          node.label,
          node.properties.title,
          node.properties.category,
          node.properties.year,
          node.properties.citationCount
        );
      }
    });

    insertMany(nodes);
    return nodes.length;
  }

  async ingestEdges(edges: Edge[]): Promise<number> {
    if (!this.db) throw new Error('Not connected');

    const insert = this.db.prepare(
      'INSERT OR IGNORE INTO edges (id, source, target, label, timestamp) VALUES (?, ?, ?, ?, ?)'
    );
    const insertMany = this.db.transaction((edges: Edge[]) => {
      for (const edge of edges) {
        insert.run(
          edge.id,
          edge.source,
          edge.target,
          edge.label,
          edge.properties?.timestamp || null
        );
      }
    });

    insertMany(edges);
    return edges.length;
  }

  async traverse(sourceId: string, hops: number): Promise<number> {
    if (!this.db) throw new Error('Not connected');

    // Build recursive CTE for k-hop traversal
    const cte = `
      WITH RECURSIVE reachability(id, depth) AS (
        SELECT target, 1 FROM edges WHERE source = ?
        UNION
        SELECT e.target, r.depth + 1
        FROM edges e
        INNER JOIN reachability r ON e.source = r.id
        WHERE r.depth < ?
      )
      SELECT DISTINCT id FROM reachability
    `;

    const result = this.db.prepare(cte).all(sourceId, hops);
    return result.length;
  }

  async runPageRank(iterations: number): Promise<number> {
    if (!this.db) throw new Error('Not connected');

    // Add pagerank column if not exists
    this.db.exec('ALTER TABLE nodes ADD COLUMN pagerank REAL');

    // Initialize all to 1.0
    this.db.prepare('UPDATE nodes SET pagerank = 1.0').run();

    // Iterative PageRank
    for (let i = 0; i < iterations; i++) {
      this.db.exec(`
        UPDATE nodes SET pagerank = 0.15 + 0.85 * COALESCE(
          (
            SELECT SUM(inbound.pagerank / out_degree.degree)
            FROM edges
            JOIN nodes inbound ON edges.source = inbound.id
            JOIN (
              SELECT source, COUNT(*) as degree
              FROM edges
              GROUP BY source
            ) out_degree ON edges.source = out_degree.source
            WHERE edges.target = nodes.id
          ),
          1.0
        )
      `);
    }

    return iterations;
  }

  getMemoryUsage(): number {
    // Better-SQLite3 is embedded, so use process memory
    return process.memoryUsage().rss;
  }
}

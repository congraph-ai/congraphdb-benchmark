import neo4j, { Driver, Session, integer } from 'neo4j-driver';
import { EngineAdapter, Node, Edge } from '../types.js';

export class Neo4jEngine implements EngineAdapter {
  name = 'neo4j' as const;
  private driver: Driver | null = null;
  private uri: string;
  private user: string;
  private password: string;
  private database: string;

  constructor(config?: { uri?: string; user?: string; password?: string; database?: string }) {
    this.uri = config?.uri || process.env.NEO4J_URI || 'bolt://localhost:7687';
    // Support both NEO4J_USER and NEO4J_USERNAME (for Neo4j Aura compatibility)
    this.user = config?.user || process.env.NEO4J_USER || process.env.NEO4J_USERNAME || 'neo4j';
    this.password = config?.password || process.env.NEO4J_PASSWORD || 'password';
    this.database = config?.database || process.env.NEO4J_DATABASE || 'neo4j';
  }

  async connect(): Promise<void> {
    this.driver = neo4j.driver(this.uri, neo4j.auth.basic(this.user, this.password));

    // Verify connection
    const session = this.driver.session();
    try {
      await session.run('RETURN 1');
    } finally {
      await session.close();
    }
  }

  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
  }

  async clear(): Promise<void> {
    const session = this.getSession();
    try {
      await session.run('MATCH (n) DETACH DELETE n');
    } finally {
      await session.close();
    }
  }

  async ingestNodes(nodes: Node[]): Promise<number> {
    const session = this.getSession();
    try {
      // Batch insert using UNWIND for better performance
      const batchSize = 1000;
      for (let i = 0; i < nodes.length; i += batchSize) {
        const batch = nodes.slice(i, i + batchSize);
        const cypher = `
          UNWIND $nodes AS node
          MERGE (p:Paper {id: node.id})
          SET p += node.properties
        `;
        await session.run(cypher, { nodes: batch.map(n => ({ id: n.id, properties: n.properties })) });
      }
      return nodes.length;
    } finally {
      await session.close();
    }
  }

  async ingestEdges(edges: Edge[]): Promise<number> {
    const session = this.getSession();
    try {
      // Batch insert edges
      const batchSize = 1000;
      for (let i = 0; i < edges.length; i += batchSize) {
        const batch = edges.slice(i, i + batchSize);
        const cypher = `
          UNWIND $edges AS edge
          MATCH (source:Paper {id: edge.source})
          MATCH (target:Paper {id: edge.target})
          MERGE (source)-[r:CITES]->(target)
          SET r += edge.properties
        `;
        await session.run(cypher, { edges: batch });
      }
      return edges.length;
    } finally {
      await session.close();
    }
  }

  async traverse(sourceId: string, hops: number): Promise<number> {
    const session = this.getSession();
    try {
      const cypher = `
        MATCH path = (start:Paper {id: $sourceId})-[:CITES*1..${hops}]->(end:Paper)
        RETURN DISTINCT end.id
        LIMIT 100000
      `;
      const result = await session.run(cypher, { sourceId });
      return result.records.length;
    } finally {
      await session.close();
    }
  }

  async runPageRank(iterations: number): Promise<number> {
    // Try GDS plugin first
    const session = this.getSession();
    try {
      const cypher = `
        CALL gds.pageRank.stream('myGraph', {
          maxIterations: ${iterations},
          dampingFactor: 0.85
        })
        YIELD nodeId, score
        RETURN count(nodeId) AS count
      `;

      try {
        await session.run(cypher);
        return iterations;
      } catch (error: any) {
        // Check if this is a GDS not available error
        if (error?.message?.includes('gds') || error?.code?.includes('UnknownProcedure')) {
          console.warn('  [Neo4j] GDS plugin not available, using native traversal');
        } else {
          throw error; // Re-throw other errors
        }
      }
    } finally {
      await session.close();
    }

    // Fallback: Use simple iterative approach if GDS is not available
    return this.nativePageRank(iterations);
  }

  private async nativePageRank(iterations: number): Promise<number> {
    // Simple PageRank using Cypher (less efficient but works without GDS)
    const session = this.getSession();
    try {
      // Initialize all PageRanks to 1.0
      await session.run('MATCH (p:Paper) SET p.pagerank = 1.0');

      // Run PageRank iterations using COUNT {} syntax for Neo4j 5.x+
      for (let i = 0; i < iterations; i++) {
        await session.run(`
          MATCH (p:Paper)
          OPTIONAL MATCH (p)<-[:CITES]-(prev:Paper)
          WITH p, prev,
            CASE
              WHEN COUNT {(prev)-[:CITES]->()} > 0 THEN prev.pagerank / COUNT {(prev)-[:CITES]->()}
              ELSE 0
            END AS rankContribution
          WITH p, sum(rankContribution) AS incomingRank
          SET p.pagerank = 0.15 + 0.85 * COALESCE(incomingRank, 0.0)
        `);
      }
      return iterations;
    } finally {
      await session.close();
    }
  }

  getMemoryUsage(): number {
    // Neo4j runs as a separate process, so we can't directly measure its memory
    // Return process memory for the driver
    return process.memoryUsage().rss;
  }

  private getSession(): Session {
    if (!this.driver) {
      throw new Error('Not connected to Neo4j');
    }
    return this.driver.session({ database: this.database });
  }
}

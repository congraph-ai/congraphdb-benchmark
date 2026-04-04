import { Database, Connection, PropertyTypes } from 'congraphdb';

/**
 * Schema API Benchmark
 *
 * Tests JavaScript Schema API performance for schema operations.
 */
export class SchemaApiBenchmark {
  private db?: Database;
  private conn?: Connection;

  constructor(
    private tableCount: number = 100,
    private propertyCount: number = 20
  ) {}

  /**
   * Run the Schema API benchmark
   */
  async run(): Promise<SchemaApiResult> {
    console.log('\n  🔶 Schema API Benchmark');
    console.log('  ' + '='.repeat(50));
    console.log(`  Tables: ${this.tableCount}`);
    console.log(`  Properties per table: ${this.propertyCount}`);

    const dbPath = `./benchmark-schema-${Date.now()}.cgraph`;

    // Initialize database
    this.db = new Database(dbPath);
    this.db.init();
    this.conn = this.db.createConnection();

    // Run benchmarks
    const nodeTableCreation = await this.benchmarkNodeTableCreation();
    const relTableCreation = await this.benchmarkRelTableCreation();
    const indexCreation = await this.benchmarkIndexCreation();
    const ensureSchema = await this.benchmarkEnsureSchema();
    const introspection = await this.benchmarkIntrospection();

    // Cleanup
    this.conn = undefined;
    this.db?.close();
    this.db = undefined;
    this.cleanupTestFile(dbPath);

    return {
      nodeTableCreation,
      relTableCreation,
      indexCreation,
      ensureSchema,
      introspection
    };
  }

  /**
   * Benchmark node table creation
   */
  private async benchmarkNodeTableCreation(): Promise<TableCreationResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Testing node table creation...');

    const startTime = performance.now();

    for (let i = 0; i < this.tableCount; i++) {
      const tableName = `NodeTable_${i}`;
      const properties = this.generateProperties(this.propertyCount);

      await this.conn.createNodeTable(tableName, properties, 'id');
    }

    const elapsed = performance.now() - startTime;

    return {
      tableCount: this.tableCount,
      propertyCount: this.propertyCount,
      totalTimeMs: elapsed,
      averageTimeMs: elapsed / this.tableCount,
      tablesPerSecond: this.tableCount / (elapsed / 1000)
    };
  }

  /**
   * Benchmark relationship table creation
   */
  private async benchmarkRelTableCreation(): Promise<TableCreationResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Testing relationship table creation...');

    const startTime = performance.now();

    for (let i = 0; i < this.tableCount; i++) {
      const tableName = `RelTable_${i}`;
      const fromTable = `NodeTable_${i % 10}`;
      const toTable = `NodeTable_${(i + 1) % 10}`;
      const properties = this.generateProperties(Math.floor(this.propertyCount / 2));

      await this.conn.createRelTable(tableName, fromTable, toTable, properties);
    }

    const elapsed = performance.now() - startTime;

    return {
      tableCount: this.tableCount,
      propertyCount: Math.floor(this.propertyCount / 2),
      totalTimeMs: elapsed,
      averageTimeMs: elapsed / this.tableCount,
      tablesPerSecond: this.tableCount / (elapsed / 1000)
    };
  }

  /**
   * Benchmark index creation
   */
  private async benchmarkIndexCreation(): Promise<IndexCreationResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Testing index creation...');

    const indexCount = 50;
    const startTime = performance.now();

    for (let i = 0; i < indexCount; i++) {
      const tableName = `NodeTable_${i % 10}`;
      const columnName = `prop_${i % this.propertyCount}`;

      await this.conn.createIndex(tableName, [columnName]);
    }

    const elapsed = performance.now() - startTime;

    return {
      indexCount,
      totalTimeMs: elapsed,
      averageTimeMs: elapsed / indexCount,
      indexesPerSecond: indexCount / (elapsed / 1000)
    };
  }

  /**
   * Benchmark ensureSchema (idempotent schema creation)
   */
  private async benchmarkEnsureSchema(): Promise<EnsureSchemaResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Testing ensureSchema (idempotent)...');

    const schema = {
      nodeTables: Array.from({ length: 20 }, (_, i) => ({
        name: `EnsuredNode_${i}`,
        properties: this.generatePropertiesMap(10),
        primaryKey: 'id'
      })),
      relTables: Array.from({ length: 10 }, (_, i) => ({
        name: `EnsuredRel_${i}`,
        from: `EnsuredNode_${i}`,
        to: `EnsuredNode_${(i + 1) % 20}`,
        properties: this.generatePropertiesMap(5)
      }))
    };

    // First run (creation)
    const startCreate = performance.now();
    await this.conn.ensureSchema(schema);
    const createTime = performance.now() - startCreate;

    // Second run (should be no-op for existing tables)
    const startEnsure = performance.now();
    await this.conn.ensureSchema(schema);
    const ensureTime = performance.now() - startEnsure;

    return {
      nodeTableCount: schema.nodeTables.length,
      relTableCount: schema.relTables.length,
      creationTimeMs: createTime,
      ensureTimeMs: ensureTime,
      speedup: createTime / ensureTime
    };
  }

  /**
   * Benchmark schema introspection
   */
  private async benchmarkIntrospection(): Promise<IntrospectionResult> {
    if (!this.conn) throw new Error('Not connected');

    console.log('  📊 Testing schema introspection...');

    const iterations = 100;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      await this.conn.getTables();
    }

    const elapsed = performance.now() - startTime;

    // Get actual table count
    const tables = await this.conn.getTables();

    return {
      iterations,
      tableCount: tables.length,
      totalTimeMs: elapsed,
      averageTimeMs: elapsed / iterations,
      queriesPerSecond: iterations / (elapsed / 1000)
    };
  }

  /**
   * Generate property definitions for createNodeTable
   */
  private generateProperties(count: number): Array<{ name: string; type: string; nullable?: boolean }> {
    const types = [
      PropertyTypes.String,
      PropertyTypes.Int64,
      PropertyTypes.Float64,
      PropertyTypes.Bool,
      PropertyTypes.Date,
      PropertyTypes.Timestamp
    ];

    return Array.from({ length: count }, (_, i) => ({
      name: `prop_${i}`,
      type: types[i % types.length],
      nullable: i > 0 // Only first property (id) is non-nullable
    }));
  }

  /**
   * Generate property map for ensureSchema
   */
  private generatePropertiesMap(count: number): Record<string, string> {
    const typeMap: Record<string, string> = {
      0: 'string',
      1: 'int64',
      2: 'double',
      3: 'bool',
      4: 'date',
      5: 'timestamp'
    };

    const properties: Record<string, string> = {};
    for (let i = 0; i < count; i++) {
      properties[`prop_${i}`] = typeMap[i % 6];
    }
    return properties;
  }

  /**
   * Clean up test database file
   */
  private cleanupTestFile(dbPath: string): void {
    const fs = require('fs');
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      if (fs.existsSync(dbPath + '.wal')) fs.unlinkSync(dbPath + '.wal');
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Create a Schema API engine adapter for benchmarking
 */
export class SchemaApiEngineAdapter {
  name = 'congraph-schema' as const;
  private db?: Database;
  private conn?: Connection;

  async connect(): Promise<void> {
    this.db = new Database(`./bench-schema-${Date.now()}.cgraph`);
    this.db.init();
    this.conn = this.db.createConnection();
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = undefined;
      this.conn = undefined;
    }
  }

  async clear(): Promise<void> {
    if (!this.conn) throw new Error('Not connected');
    try {
      const tables = await this.conn.getTables();
      for (const table of tables) {
        await this.conn.dropTable(table.name);
      }
    } catch {
      // Ignore if schema doesn't exist
    }
  }

  async benchmarkSchemaCreation(tableCount: number): Promise<number> {
    if (!this.conn) throw new Error('Not connected');

    const start = performance.now();

    for (let i = 0; i < tableCount; i++) {
      await this.conn.createNodeTable(`Table_${i}`, [
        { name: 'id', type: PropertyTypes.String },
        { name: 'name', type: PropertyTypes.String },
        { name: 'value', type: PropertyTypes.Int64 }
      ], 'id');
    }

    return Math.round(performance.now() - start);
  }

  async benchmarkEnsureSchema(tableCount: number, iterations: number): Promise<number> {
    if (!this.conn) throw new Error('Not connected');

    const schema = {
      nodeTables: Array.from({ length: tableCount }, (_, i) => ({
        name: `Table_${i}`,
        properties: { id: 'string', name: 'string', value: 'int64' },
        primaryKey: 'id'
      }))
    };

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      await this.conn.ensureSchema(schema);
    }

    return Math.round(performance.now() - start);
  }

  async benchmarkIndexCreation(tableCount: number): Promise<number> {
    if (!this.conn) throw new Error('Not connected');

    const start = performance.now();

    for (let i = 0; i < tableCount; i++) {
      await this.conn.createIndex(`Table_${i % tableCount}`, ['name']);
    }

    return Math.round(performance.now() - start);
  }
}

// Result types
export interface SchemaApiResult {
  nodeTableCreation: TableCreationResult;
  relTableCreation: TableCreationResult;
  indexCreation: IndexCreationResult;
  ensureSchema: EnsureSchemaResult;
  introspection: IntrospectionResult;
}

export interface TableCreationResult {
  tableCount: number;
  propertyCount: number;
  totalTimeMs: number;
  averageTimeMs: number;
  tablesPerSecond: number;
}

export interface IndexCreationResult {
  indexCount: number;
  totalTimeMs: number;
  averageTimeMs: number;
  indexesPerSecond: number;
}

export interface EnsureSchemaResult {
  nodeTableCount: number;
  relTableCount: number;
  creationTimeMs: number;
  ensureTimeMs: number;
  speedup: number;
}

export interface IntrospectionResult {
  iterations: number;
  tableCount: number;
  totalTimeMs: number;
  averageTimeMs: number;
  queriesPerSecond: number;
}

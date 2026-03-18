import { EngineAdapter, Node, DMLResult, DMLTestResult } from '../types.js';

/**
 * DML Operations Benchmark
 *
 * Tests Data Manipulation Language operations:
 * - SET: Property updates and dynamic property creation
 * - DELETE: Node and edge deletion
 * - MERGE: Upsert operations with ON MATCH/ON CREATE
 * - REMOVE: Property removal
 */
export class DMLOperationsBenchmark {
  constructor(private engine: EngineAdapter) {}

  /**
   * Run the complete DML benchmark
   */
  async run(): Promise<DMLTestResult | null> {
    console.log('\n  🔧 DML Operations Benchmark');
    console.log('  ' + '='.repeat(50));

    // Check if DML operations are supported
    if (!this.supportsDML()) {
      console.log('  ⚠️  DML operations not supported by this engine');
      return null;
    }

    await this.engine.connect();
    await this.engine.clear();

    // Setup test data
    const nodes = this.generateTestNodes(1000);
    await this.engine.ingestNodes(nodes);

    // Run DML benchmarks
    const setResult = await this.benchmarkSET(nodes);
    const deleteResult = await this.benchmarkDELETE(nodes);
    const mergeResult = await this.benchmarkMERGE(nodes);
    const removeResult = await this.benchmarkREMOVE(nodes);

    await this.engine.disconnect();

    return {
      set: setResult,
      delete: deleteResult,
      merge: mergeResult,
      remove: removeResult,
    };
  }

  /**
   * Check if engine supports DML operations
   */
  private supportsDML(): boolean {
    return !!(
      this.engine.dmlSet ||
      this.engine.dmlDelete ||
      this.engine.dmlMerge ||
      this.engine.dmlRemove
    );
  }

  /**
   * Benchmark SET operations
   */
  private async benchmarkSET(nodes: Node[]): Promise<DMLResult> {
    console.log('  📝 Testing SET operations...');

    if (!this.engine.dmlSet) {
      return this.unsupportedResult('SET');
    }

    const iterations = 100;
    const batchSize = 100;
    const totalOps = iterations * batchSize;

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      for (let j = 0; j < batchSize; j++) {
        const node = nodes[j % nodes.length];
        await this.engine.dmlSet!(node.id, {
          updated: true,
          counter: i,
          timestamp: Date.now(),
          dynamicProp: `value_${i}`,
        });
      }
    }

    const elapsed = performance.now() - start;

    return {
      operation: 'SET',
      opsPerSecond: Math.round((totalOps / elapsed) * 1000),
      totalTimeMs: Math.round(elapsed),
      affectedRows: totalOps,
    };
  }

  /**
   * Benchmark DELETE operations
   */
  private async benchmarkDELETE(nodes: Node[]): Promise<DMLResult> {
    console.log('  🗑️  Testing DELETE operations...');

    if (!this.engine.dmlDelete) {
      return this.unsupportedResult('DELETE');
    }

    const batchSize = 100;
    const testNodes = nodes.slice(0, batchSize);

    // Measure delete time
    const start = performance.now();

    for (const node of testNodes) {
      await this.engine.dmlDelete!(node.id, true); // detach delete
    }

    const elapsed = performance.now() - start;

    // Re-populate for other tests
    await this.engine.ingestNodes(testNodes);

    return {
      operation: 'DELETE',
      opsPerSecond: Math.round((batchSize / elapsed) * 1000),
      totalTimeMs: Math.round(elapsed),
      affectedRows: batchSize,
    };
  }

  /**
   * Benchmark MERGE operations
   */
  private async benchmarkMERGE(nodes: Node[]): Promise<DMLResult> {
    console.log('  🔀 Testing MERGE operations...');

    if (!this.engine.dmlMerge) {
      return this.unsupportedResult('MERGE');
    }

    const iterations = 100;
    const batchSize = 100;

    // First, ensure some nodes exist
    await this.engine.clear();
    await this.engine.ingestNodes(nodes.slice(0, batchSize));

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      for (let j = 0; j < batchSize; j++) {
        const node = nodes[j];
        // MERGE should update existing nodes and create new ones
        await this.engine.dmlMerge!(node.id, 'Paper', {
          title: `Updated Paper ${j}`,
          mergeCount: i,
          lastMerged: Date.now(),
        });
      }
    }

    const elapsed = performance.now() - start;
    const totalOps = iterations * batchSize;

    return {
      operation: 'MERGE',
      opsPerSecond: Math.round((totalOps / elapsed) * 1000),
      totalTimeMs: Math.round(elapsed),
      affectedRows: totalOps,
    };
  }

  /**
   * Benchmark REMOVE operations
   */
  private async benchmarkREMOVE(nodes: Node[]): Promise<DMLResult> {
    console.log('  ➖ Testing REMOVE operations...');

    if (!this.engine.dmlRemove) {
      return this.unsupportedResult('REMOVE');
    }

    const batchSize = 100;
    const testNodes = nodes.slice(0, batchSize);

    // First add some properties to remove
    for (const node of testNodes) {
      await this.engine.dmlSet?.(node.id, {
        tempProp: 'value',
        toRemove: 'delete me',
      });
    }

    const start = performance.now();

    for (const node of testNodes) {
      await this.engine.dmlRemove!(node.id, 'tempProp');
      await this.engine.dmlRemove!(node.id, 'toRemove');
    }

    const elapsed = performance.now() - start;
    const totalOps = batchSize * 2; // 2 removes per node

    return {
      operation: 'REMOVE',
      opsPerSecond: Math.round((totalOps / elapsed) * 1000),
      totalTimeMs: Math.round(elapsed),
      affectedRows: totalOps,
    };
  }

  /**
   * Generate test nodes
   */
  private generateTestNodes(count: number): Node[] {
    const nodes: Node[] = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        id: `dml_test_${i}`,
        label: 'Paper',
        properties: {
          title: `Test Paper ${i}`,
          category: 'TEST',
          value: i,
        },
      });
    }
    return nodes;
  }

  /**
   * Return unsupported result
   */
  private unsupportedResult(operation: 'SET' | 'DELETE' | 'MERGE' | 'REMOVE'): DMLResult {
    return {
      operation,
      opsPerSecond: 0,
      totalTimeMs: 0,
      affectedRows: 0,
    };
  }
}

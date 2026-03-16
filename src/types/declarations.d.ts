// Type declarations for untyped packages

declare module 'levelgraph' {
  interface Triple {
    subject: string;
    predicate: string;
    object: any;
  }

  interface LevelGraph {
    put(triples: Triple[], callback?: (err?: Error) => void): Promise<void>;
    get(pattern: Partial<Triple>, callback?: (err: Error, results: Triple[]) => void): Promise<Triple[]>;
    close(callback?: () => void): Promise<void>;
    nav(start: string): Navigator;
  }

  interface Navigator {
    archOut(predicate: string): Navigator;
    values(callback: (err: Error, values: string[]) => void): void;
  }

  function levelgraph(db: any): LevelGraph;
  export = levelgraph;
}

declare module 'level' {
  interface LevelOptions {
    keyEncoding?: string;
    valueEncoding?: string;
  }

  class Level<K = any, V = any> {
    constructor(options?: LevelOptions);
    get(key: K): Promise<V>;
    put(key: K, value: V): Promise<void>;
    del(key: K): Promise<void>;
    clear(): Promise<void>;
    close(): Promise<void>;
  }
  export = Level;
}

declare module 'memory-level' {
  class MemoryLevel<K = any, V = any> {
    constructor(options?: any);
    get(key: K): Promise<V>;
    put(key: K, value: V): Promise<void>;
    del(key: K): Promise<void>;
    clear(): Promise<void>;
    close(): Promise<void>;
  }
  export { MemoryLevel };
}

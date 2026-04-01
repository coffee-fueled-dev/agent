import { hashToolStaticIdentity } from "./tool-identity.js";

export type RegisteredToolEntry = {
  key: string;
  hash: string;
  staticProps: unknown;
};

export type ToolRegistry = {
  /** Returns the computed static hash. */
  register: (key: string, staticProps: unknown) => Promise<string>;
  get: (key: string) => RegisteredToolEntry | undefined;
  /** If multiple keys share the same hash, the last registered entry wins. */
  getByHash: (hash: string) => RegisteredToolEntry | undefined;
  has: (key: string) => boolean;
  listKeys: () => string[];
  entries: () => IterableIterator<[string, RegisteredToolEntry]>;
};

/**
 * In-memory tool registration map keyed by caller string (convention: same as `staticProps.name`).
 */
export function createToolRegistry(): ToolRegistry {
  const byKey = new Map<string, RegisteredToolEntry>();
  const byHash = new Map<string, RegisteredToolEntry>();

  async function register(key: string, staticProps: unknown): Promise<string> {
    const hash = await hashToolStaticIdentity(staticProps);
    const entry: RegisteredToolEntry = { key, hash, staticProps };
    byKey.set(key, entry);
    byHash.set(hash, entry);
    return hash;
  }

  function get(key: string): RegisteredToolEntry | undefined {
    return byKey.get(key);
  }

  function getByHash(hash: string): RegisteredToolEntry | undefined {
    return byHash.get(hash);
  }

  function has(key: string): boolean {
    return byKey.has(key);
  }

  function listKeys(): string[] {
    return [...byKey.keys()];
  }

  function entries(): IterableIterator<[string, RegisteredToolEntry]> {
    return byKey.entries();
  }

  return {
    register,
    get,
    getByHash,
    has,
    listKeys,
    entries,
  };
}

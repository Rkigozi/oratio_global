import { vi } from "vitest";

type QueryResult<T = unknown> = { data: T | null; error: Error | null; count?: number | null };

function mockResponse<T>(data: T | null, error: Error | null = null, count?: number): QueryResult<T> {
  return { data, error, count };
}

class MockQueryBuilder {
  private _responses: Map<string, QueryResult>;
  private _table: string;
  private _debug: { table: string; method: string; args: unknown[] }[] = [];

  constructor(table: string, responses: Map<string, QueryResult>) {
    this._table = table;
    this._responses = responses;
  }

  select(_columns?: string, _options?: { count?: "exact"; head?: boolean }) {
    this._debug.push({ table: this._table, method: "select", args: [_columns, _options] });
    return this;
  }

  eq(_column: string, _value: unknown) {
    this._debug.push({ table: this._table, method: "eq", args: [_column, _value] });
    return this;
  }

  not(_column: string, _op: string, _value: unknown) {
    this._debug.push({ table: this._table, method: "not", args: [_column, _op, _value] });
    return this;
  }

  in(_column: string, _values: unknown[]) {
    this._debug.push({ table: this._table, method: "in", args: [_column, _values] });
    return this;
  }

  ilike(_column: string, _pattern: string) {
    this._debug.push({ table: this._table, method: "ilike", args: [_column, _pattern] });
    return this;
  }

  order(_column: string, _options?: { ascending?: boolean }) {
    this._debug.push({ table: this._table, method: "order", args: [_column, _options] });
    return this;
  }

  limit(_n: number) {
    this._debug.push({ table: this._table, method: "limit", args: [_n] });
    return this;
  }

  range(_from: number, _to: number) {
    this._debug.push({ table: this._table, method: "range", args: [_from, _to] });
    return this;
  }

  single() {
    this._debug.push({ table: this._table, method: "single", args: [] });
    return this;
  }

  maybeSingle() {
    this._debug.push({ table: this._table, method: "maybeSingle", args: [] });
    return this;
  }

  insert(_data: unknown) {
    this._debug.push({ table: this._table, method: "insert", args: [_data] });
    return this;
  }

  update(_data: unknown) {
    this._debug.push({ table: this._table, method: "update", args: [_data] });
    return this;
  }

  delete() {
    this._debug.push({ table: this._table, method: "delete", args: [] });
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    _onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    const key = Array.from(this._responses.keys()).find((k) => {
      const [table, ...rest] = k.split(":");
      if (table !== this._table) return false;
      return rest.every((part) => this._debug.some((d) => d.method === part));
    });
    const result = key ? this._responses.get(key)! : mockResponse([]);
    return Promise.resolve(onfulfilled ? onfulfilled(result) : (result as unknown as TResult1));
  }

  catch<TResult = never>(
    _onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<QueryResult | TResult> {
    return Promise.resolve(mockResponse([]));
  }

  finally(_onfinally?: (() => void) | null): Promise<QueryResult> {
    return Promise.resolve(mockResponse([]));
  }

  get debug() {
    return this._debug;
  }
}

interface MockAuth {
  getUser: ReturnType<typeof vi.fn>;
  getSession: ReturnType<typeof vi.fn>;
  onAuthStateChange: ReturnType<typeof vi.fn>;
  signUp: ReturnType<typeof vi.fn>;
  signInWithPassword: ReturnType<typeof vi.fn>;
  signInWithOAuth: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  resetPasswordForEmail: ReturnType<typeof vi.fn>;
  updateUser: ReturnType<typeof vi.fn>;
}

interface MockFunctions {
  invoke: ReturnType<typeof vi.fn>;
}

export function createMockSupabase(responses?: Record<string, QueryResult>) {
  const responseMap = new Map(Object.entries(responses || {}));

  const auth: MockAuth = {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user-id" } }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "test-token", user: { id: "test-user-id" } } }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    signUp: vi.fn().mockResolvedValue({ data: { user: { id: "new-user-id", email_confirmed_at: null, identities: [{ id: "identity-1" }] } }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: "test-user-id" } }, error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: "https://example.com/oauth" }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    updateUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user-id" } }, error: null }),
  };

  const functions: MockFunctions = {
    invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
  };

  const tables = new Map<string, MockQueryBuilder>();

  const mockSupabase = {
    auth,
    functions,
    rpc: vi.fn(),
    from: (table: string) => {
      if (!tables.has(table)) {
        tables.set(table, new MockQueryBuilder(table, responseMap));
      }
      return tables.get(table)!;
    },
    __reset: () => {
      tables.clear();
      vi.clearAllMocks();
    },
  };

  return mockSupabase;
}

export type MockSupabase = ReturnType<typeof createMockSupabase>;

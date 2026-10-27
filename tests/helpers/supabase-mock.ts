/**
 * Supabase sorgu zincirini taklit eden küçük yardımcı.
 * Her tablo için dönülecek sonuç verilir; yapılan insert/update çağrıları kaydedilir.
 */
type Result = { data?: unknown; error?: unknown; count?: number | null }
export type QueryContext = { table: string; op: string; payload?: unknown; filters: [string, string, unknown][] }
export type TableHandler = Result | ((ctx: QueryContext) => Result)

export function createSupabaseMock(tables: Record<string, TableHandler>) {
  const calls: QueryContext[] = []

  function builder(table: string) {
    const ctx: QueryContext = { table, op: 'select', filters: [] }
    calls.push(ctx)
    const resolve = (): Result => {
      const h = tables[table]
      if (!h) return { data: null, error: null }
      return typeof h === 'function' ? h(ctx) : h
    }
    const chain: Record<string, unknown> = {}
    for (const m of ['select', 'order', 'limit', 'range', 'not', 'ilike', 'gte', 'lte', 'gt', 'lt', 'is']) chain[m] = () => chain
    for (const m of ['eq', 'neq', 'in']) {
      chain[m] = (col: string, val: unknown) => {
        ctx.filters.push([m, col, val])
        return chain
      }
    }
    chain.insert = (payload: unknown) => {
      ctx.op = 'insert'
      ctx.payload = payload
      return chain
    }
    chain.update = (payload: unknown) => {
      ctx.op = 'update'
      ctx.payload = payload
      return chain
    }
    chain.single = () => Promise.resolve(resolve())
    chain.maybeSingle = () => Promise.resolve(resolve())
    chain.then = (onFulfilled: (r: Result) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(resolve()).then(onFulfilled, onRejected)
    return chain
  }

  return { client: { from: (table: string) => builder(table) }, calls }
}

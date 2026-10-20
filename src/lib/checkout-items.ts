export interface CartItemInput {
  id: string;
  size: string;
  qty: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Normalise untrusted cart input: valid ids, merged duplicates, sane quantities. */
export function sanitizeItems(raw: unknown): CartItemInput[] {
  if (!Array.isArray(raw)) return [];
  const merged = new Map<string, CartItemInput>();
  for (const r of raw.slice(0, 50)) {
    if (!r || typeof r !== 'object') continue;
    const { id, size, qty } = r as Record<string, unknown>;
    if (typeof id !== 'string' || !UUID_RE.test(id) || typeof size !== 'string' || size.length > 10) continue;
    const q = Math.floor(Number(qty));
    if (!Number.isFinite(q) || q < 1) continue;
    const key = id + '|' + size;
    const prev = merged.get(key);
    merged.set(key, { id, size, qty: Math.min(99, (prev?.qty ?? 0) + q) });
  }
  return [...merged.values()];
}

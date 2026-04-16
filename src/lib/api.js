// ═══════════════════════════════════════════════════
// Lightweight API fetch helper (client-side)
// ═══════════════════════════════════════════════════

export async function api(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    credentials: "include",
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

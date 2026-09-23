/** Group date-bearing items into ordered month buckets ("September 2026"). */
export function groupByMonth<T>(items: T[], date: (t: T) => Date): { label: string; key: string; items: T[] }[] {
  const out: { label: string; key: string; items: T[] }[] = [];
  for (const it of items) {
    const d = date(it);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    let g = out.find((x) => x.key === key);
    if (!g) {
      g = { key, label: d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "America/Chicago" }), items: [] };
      out.push(g);
    }
    g.items.push(it);
  }
  return out;
}

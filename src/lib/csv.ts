/** Minimal CSV writer with proper quoting for export endpoints. */

export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  if (rows.length === 0) {
    return columns ? columns.join(",") + "\n" : "";
  }
  const cols = columns ?? Object.keys(rows[0]);
  const head = cols.map(escape).join(",");
  const body = rows
    .map((r) => cols.map((c) => escape(formatCell(r[c]))).join(","))
    .join("\n");
  return head + "\n" + body + "\n";
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.map(String).join("; ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function escape(s: string): string {
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

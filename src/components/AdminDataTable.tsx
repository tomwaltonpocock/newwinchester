export function AdminDataTable<T extends Record<string, unknown>>({
  rows,
  columns,
}: {
  rows: T[];
  columns: { key: keyof T; label: string; format?: (v: unknown) => string }[];
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-stone-600">No rows.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-stone-200">
            {columns.map((c) => (
              <th key={String(c.key)} className="py-2 pr-4 font-semibold">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-stone-100 align-top">
              {columns.map((c) => {
                const raw = r[c.key];
                const display = c.format ? c.format(raw) : String(raw ?? "");
                return (
                  <td key={String(c.key)} className="py-2 pr-4">
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

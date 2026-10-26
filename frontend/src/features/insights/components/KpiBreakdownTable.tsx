interface KpiBreakdownTableProps {
  columns: string[];
  rows: Record<string, string | number>[];
}

export function KpiBreakdownTable({ columns, rows }: KpiBreakdownTableProps) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto max-h-[300px] rounded-xl border border-[#334139]/12 bg-[#FDFFFC] text-xs">
      <table className="w-full text-left border-collapse">
        <thead className="bg-[#334139]/5 sticky top-0 z-10 border-b border-[#334139]/15">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="py-2.5 px-3 font-mono font-bold text-[10.5px] uppercase tracking-wider text-[#334139]/75"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#334139]/8 tabular-nums">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-[#334139]/[0.03] transition-colors">
              {columns.map((col) => {
                const val = row[col];
                const isNumber = typeof val === 'number';
                return (
                  <td
                    key={col}
                    className={`py-2 px-3 text-[#1E2D24] ${isNumber ? 'font-mono' : ''}`}
                  >
                    {val !== undefined && val !== null ? String(val) : '—'}
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


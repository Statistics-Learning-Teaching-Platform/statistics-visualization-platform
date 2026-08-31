import type { ReactNode } from "react";

export function StatisticsTable({ columns, rows, caption }: { columns: string[]; rows: ReactNode[][]; caption?: ReactNode }) {
  return (
    <div className="table-scroll statistics-table-wrap">
      <table className="result-table statistics-table">
        {caption && <caption>{caption}</caption>}
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

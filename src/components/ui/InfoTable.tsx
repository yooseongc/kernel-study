export interface TableRow {
    cells: string[]
}

interface InfoTableProps {
    headers: string[]
    rows: TableRow[]
}

export function InfoTable({ headers, rows }: InfoTableProps) {
    return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                        {headers.map((h, i) => (
                            <th
                                key={i}
                                className="px-4 py-2.5 text-left font-semibold text-gray-700 dark:text-gray-300 font-mono text-xs"
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, ri) => (
                        <tr
                            key={ri}
                            className="border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                        >
                            {row.cells.map((cell, ci) => (
                                <td
                                    key={ci}
                                    className={`px-4 py-2.5 font-mono text-xs ${
                                        ci === 0
                                            ? 'text-blue-600 dark:text-blue-400 font-semibold'
                                            : 'text-gray-600 dark:text-gray-400'
                                    }`}
                                >
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

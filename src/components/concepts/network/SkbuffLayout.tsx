// ─────────────────────────────────────────────────────────────────────────────
// 6.3  sk_buff 구조 레이아웃 시각화 (JSX)
// ─────────────────────────────────────────────────────────────────────────────
interface SkbRow {
  label: string
  sublabel: string
  size: string
  color: string
  textColor: string
  pointer?: string
  pointerColor?: string
}

const skbRows: SkbRow[] = [
    {
        label: 'headroom',
        sublabel: '여유 공간 (헤더 추가용)',
        size: '가변',
        color: 'bg-gray-800/60',
        textColor: 'text-gray-500',
        pointer: 'head',
        pointerColor: 'text-orange-400',
    },
    {
        label: 'Ethernet header (14B)',
        sublabel: 'mac_header',
        size: '14 B',
        color: 'bg-violet-900/60',
        textColor: 'text-violet-200',
        pointer: 'data',
        pointerColor: 'text-green-400',
    },
    {
        label: 'IP header (20B)',
        sublabel: 'network_header',
        size: '20 B',
        color: 'bg-blue-900/60',
        textColor: 'text-blue-200',
    },
    {
        label: 'TCP header (20B)',
        sublabel: 'transport_header',
        size: '20 B',
        color: 'bg-indigo-900/60',
        textColor: 'text-indigo-200',
    },
    {
        label: 'Payload data',
        sublabel: '실제 사용자 데이터',
        size: '가변',
        color: 'bg-emerald-900/60',
        textColor: 'text-emerald-200',
        pointer: 'tail',
        pointerColor: 'text-yellow-400',
    },
    {
        label: 'tailroom',
        sublabel: '여유 공간 (뒤쪽)',
        size: '가변',
        color: 'bg-gray-800/60',
        textColor: 'text-gray-500',
        pointer: 'end',
        pointerColor: 'text-red-400',
    },
]

export function SkbuffLayout() {
    return (
        <div className="flex gap-6 items-start">
            {/* Memory layout bars */}
            <div className="flex-1">
                <div className="text-xs text-gray-400 mb-2 font-mono">sk_buff 메모리 레이아웃</div>
                <div className="flex flex-col border border-gray-700 rounded-lg overflow-hidden text-xs font-mono">
                    {skbRows.map((row, i) => (
                        <div
                            key={i}
                            className={`relative flex items-center px-3 py-2 ${row.color}`}
                            style={{ minHeight: '36px' }}
                        >
                            <div className="flex-1">
                                <div className={`font-semibold ${row.textColor}`}>{row.label}</div>
                                <div className="text-gray-500 text-[10px]">{row.sublabel}</div>
                            </div>
                            <div className="text-gray-600 text-[10px]">{row.size}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pointer labels */}
            <div className="w-36 flex flex-col text-xs font-mono">
                <div className="text-gray-400 mb-2">포인터</div>
                <div className="space-y-1">
                    {skbRows
                        .filter((r) => r.pointer)
                        .map((r, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className={`font-bold ${r.pointerColor}`}>{r.pointer}</span>
                                <span className="text-gray-600">──→</span>
                                <span className="text-gray-400 text-[10px]">{r.sublabel}</span>
                            </div>
                        ))}
                </div>
                <div className="mt-4 rounded-lg border border-blue-800/40 bg-blue-950/30 p-2 text-[10px] text-blue-300">
          데이터 이동 시 포인터만 변경. 복사 없음!
                </div>
            </div>
        </div>
    )
}

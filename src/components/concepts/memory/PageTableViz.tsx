// ─────────────────────────────────────────────────────────────────────────────
// 3.2  페이지 테이블 워크 시각화
// ─────────────────────────────────────────────────────────────────────────────

// VA = 0x00007FFF_DEADBEEF
//   PGD [47:39] = (addr >> 39) & 0x1FF = 0x0FF (255)
//   PUD [38:30] = (addr >> 30) & 0x1FF = 0x1FF (511)
//   PMD [29:21] = (addr >> 21) & 0x1FF = 0x0F5 (245)
//   PTE [20:12] = (addr >> 12) & 0x1FF = 0x0DB (219)
//   Off [11:0]  =  addr        & 0xFFF = 0xEEF (3823)
const vaFields = [
    { label: 'PGD', bits: '47:39', value: '0x0FF', dec: 255,  color: '#8b5cf6', darkColor: '#7c3aed' },
    { label: 'PUD', bits: '38:30', value: '0x1FF', dec: 511,  color: '#3b82f6', darkColor: '#2563eb' },
    { label: 'PMD', bits: '29:21', value: '0x0F5', dec: 245,  color: '#10b981', darkColor: '#059669' },
    { label: 'PTE', bits: '20:12', value: '0x0DB', dec: 219,  color: '#f59e0b', darkColor: '#d97706' },
    { label: 'Offset', bits: '11:0', value: '0xEEF', dec: 3823, color: '#ef4444', darkColor: '#dc2626' },
]

const tableAddresses = [
    { level: 'PGD', baseAddr: '0x1000_0000', nextLabel: 'PUD' },
    { level: 'PUD', baseAddr: '0x1001_0000', nextLabel: 'PMD' },
    { level: 'PMD', baseAddr: '0x1002_0000', nextLabel: 'PTE' },
    { level: 'PTE', baseAddr: '0x1003_0000', nextLabel: 'Physical' },
]

export function PageTableWalkViz({ step }: { step: number }) {
    return (
        <div className="space-y-5 p-2">
            {/* VA field breakdown */}
            <div>
                <div className="text-xs text-gray-400 mb-2 font-mono">VA: 0x00007FFF_DEADBEEF</div>
                <div className="flex gap-1 flex-wrap">
                    {vaFields.map((f, i) => {
                        const isActive = step === 0 || step - 1 === i
                        return (
                            <div
                                key={f.label}
                                className="flex flex-col items-center rounded p-2 transition-all duration-300"
                                style={{
                                    background: isActive ? f.color + '33' : '#1f2937',
                                    border: `2px solid ${isActive ? f.color : '#374151'}`,
                                    boxShadow: isActive ? `0 0 8px ${f.color}88` : 'none',
                                    minWidth: '70px',
                                }}
                            >
                                <span className="text-[10px] text-gray-400 font-mono">[{f.bits}]</span>
                                <span className="text-sm font-bold font-mono" style={{ color: isActive ? f.color : '#6b7280' }}>
                                    {f.value}
                                </span>
                                <span className="text-[10px] font-semibold" style={{ color: isActive ? f.color : '#6b7280' }}>
                                    {f.label}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Table walk levels */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex flex-col items-center">
                    <div
                        className="rounded px-3 py-2 text-center transition-all duration-300"
                        style={{
                            background: step === 1 ? '#1e3a8a' : '#111827',
                            border: `1px solid ${step === 1 ? '#3b82f6' : '#374151'}`,
                            boxShadow: step === 1 ? '0 0 8px #3b82f688' : 'none',
                        }}
                    >
                        <div className="text-[10px] text-gray-400">CR3</div>
                        <div className="text-xs font-mono text-blue-300 font-bold">PGD base</div>
                        <div className="text-[10px] text-gray-500">0x1000_0000</div>
                    </div>
                </div>

                {tableAddresses.map((t, i) => (
                    <div key={t.level} className="flex items-center gap-2">
                        <div className="text-gray-600">→</div>
                        <div
                            className="rounded px-3 py-2 text-center transition-all duration-300"
                            style={{
                                background: step === i + 1 ? '#1e3a8a' : '#111827',
                                border: `1px solid ${step === i + 1 ? '#3b82f6' : '#374151'}`,
                                boxShadow: step === i + 1 ? '0 0 8px #3b82f688' : 'none',
                                opacity: step >= i + 1 || step === 0 ? 1 : 0.3,
                            }}
                        >
                            <div className="text-[10px] text-gray-400">{t.level}</div>
                            <div className="text-xs font-mono text-blue-300 font-bold">idx: {vaFields[i].value}</div>
                            <div className="text-[10px] text-gray-500">base: {t.baseAddr}</div>
                        </div>
                    </div>
                ))}

                <div className="flex items-center gap-2">
                    <div className="text-gray-600">→</div>
                    <div
                        className="rounded px-3 py-2 text-center transition-all duration-300"
                        style={{
                            background: step === 4 ? '#14532d' : '#111827',
                            border: `1px solid ${step === 4 ? '#22c55e' : '#374151'}`,
                            boxShadow: step === 4 ? '0 0 8px #22c55e88' : 'none',
                            opacity: step === 4 ? 1 : 0.3,
                        }}
                    >
                        <div className="text-[10px] text-gray-300">Physical</div>
                        <div className="text-xs font-mono text-green-300 font-bold">PFN + offset</div>
                        <div className="text-[10px] text-gray-500">0x2000_DEEF</div>
                    </div>
                </div>
            </div>

            {/* TLB tip */}
            <div className="rounded-lg border border-yellow-800/50 bg-yellow-900/20 px-4 py-2 text-xs text-yellow-200">
                <span className="font-bold">TLB 팁:</span> TLB(Translation Lookaside Buffer)가 이 4번의 메모리 접근을 캐싱합니다.
        TLB miss 시 하드웨어가 page table walk를 수행합니다.
            </div>
        </div>
    )
}

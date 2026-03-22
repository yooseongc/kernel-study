// ─────────────────────────────────────────────────────────────────────────────
// 3.1  가상 주소 공간 (JSX div 기반)
// ─────────────────────────────────────────────────────────────────────────────
interface AddrRow {
    label: string
    sublabel?: string
    addrTop?: string
    addrBottom?: string
    heightPct: number
    bg: string
    textColor: string
    striped?: boolean
}

const addrRows: AddrRow[] = [
    {
        label: '커널 공간 (128TB)',
        sublabel: '커널 코드, vmalloc, direct mapping',
        addrTop: '0xFFFFFFFFFFFFFFFF',
        addrBottom: '0xFFFF800000000000',
        heightPct: 25,
        bg: 'bg-violet-900/60 dark:bg-violet-900/60',
        textColor: 'text-violet-200',
    },
    {
        label: '/// non-canonical hole ///',
        sublabel: '~16 exabytes',
        addrTop: '0xFFFF800000000000',
        addrBottom: '0x00007FFFFFFFFFFF',
        heightPct: 10,
        bg: 'bg-gray-800/60 dark:bg-gray-800/60',
        textColor: 'text-gray-500',
        striped: true,
    },
    {
        label: 'stack',
        sublabel: '↓ 아래 방향 성장',
        addrTop: '0x00007FFFFFFFFFFF',
        heightPct: 8,
        bg: 'bg-amber-900/50 dark:bg-amber-900/50',
        textColor: 'text-amber-200',
    },
    {
        label: 'mmap / shared libs',
        sublabel: '파일 매핑, 동적 라이브러리',
        heightPct: 15,
        bg: 'bg-purple-900/50 dark:bg-purple-900/50',
        textColor: 'text-purple-200',
    },
    {
        label: '(미할당)',
        heightPct: 12,
        bg: 'bg-gray-900/40 dark:bg-gray-900/40',
        textColor: 'text-gray-600',
    },
    {
        label: 'heap',
        sublabel: '↑ 위 방향 성장',
        heightPct: 10,
        bg: 'bg-emerald-900/50 dark:bg-emerald-900/50',
        textColor: 'text-emerald-200',
    },
    {
        label: 'BSS / data',
        sublabel: '전역 변수, 정적 변수',
        heightPct: 10,
        bg: 'bg-blue-800/50 dark:bg-blue-800/50',
        textColor: 'text-blue-200',
    },
    {
        label: 'text (코드)',
        sublabel: '.text 섹션',
        heightPct: 7,
        bg: 'bg-blue-900/60 dark:bg-blue-900/60',
        textColor: 'text-blue-300',
    },
    {
        label: 'NULL guard (4KB)',
        addrBottom: '0x0000000000000000',
        heightPct: 3,
        bg: 'bg-gray-950/80 dark:bg-gray-950/80',
        textColor: 'text-gray-600',
    },
]

export function VirtualAddressViz() {
    // cumulative heights for right-side labels
    const cumulative: number[] = []
    let acc = 0
    for (const row of addrRows) {
        cumulative.push(acc)
        acc += row.heightPct
    }

    return (
        <div className="flex gap-3">
            {/* Left: address space bars */}
            <div className="flex-1 flex flex-col border border-gray-700 rounded-lg overflow-hidden text-xs font-mono">
                {addrRows.map((row, i) => (
                    <div
                        key={i}
                        className={`relative flex flex-col justify-center px-3 py-1 ${row.bg} ${
                            row.striped ? 'bg-stripes' : ''
                        }`}
                        style={{ height: `${row.heightPct * 3.2}px`, minHeight: '24px' }}
                    >
                        {row.striped ? (
                            <div
                                className="absolute inset-0 opacity-20"
                                style={{
                                    backgroundImage:
                                        'repeating-linear-gradient(-45deg, #9ca3af 0, #9ca3af 1px, transparent 0, transparent 50%)',
                                    backgroundSize: '8px 8px',
                                }}
                            />
                        ) : null}
                        <span className={`font-semibold relative z-10 ${row.textColor}`}>{row.label}</span>
                        {row.sublabel && (
                            <span className="text-gray-500 text-[10px] relative z-10">{row.sublabel}</span>
                        )}
                    </div>
                ))}
            </div>

            {/* Right: hex address labels */}
            <div
                className="relative w-44 text-[10px] font-mono text-gray-400"
                style={{ height: `${addrRows.reduce((s, r) => s + r.heightPct * 3.2, 0)}px` }}
            >
                {addrRows.map((row, i) => {
                    const topPx = cumulative[i] * 3.2
                    const labels: { offset: number; text: string }[] = []
                    if (row.addrTop) labels.push({ offset: topPx, text: row.addrTop })
                    if (row.addrBottom) labels.push({ offset: topPx + row.heightPct * 3.2, text: row.addrBottom })
                    return labels.map((lbl, j) => (
                        <div
                            key={`${i}-${j}`}
                            className="absolute left-0 flex items-center gap-1"
                            style={{ top: lbl.offset }}
                        >
                            <div className="w-3 h-px bg-gray-600" />
                            <span className="whitespace-nowrap leading-none">{lbl.text}</span>
                        </div>
                    ))
                })}
                {/* 0x00007FFFFFFFFFFF marker */}
                <div
                    className="absolute left-0 flex items-center gap-1"
                    style={{ top: (addrRows[0].heightPct + addrRows[1].heightPct) * 3.2 }}
                >
                    <div className="w-3 h-px bg-gray-600" />
                    <span className="whitespace-nowrap leading-none">0x00007FFFFFFFFFFF</span>
                </div>
                {/* 0x0000000000001000 marker */}
                <div
                    className="absolute left-0 flex items-center gap-1"
                    style={{
                        top: addrRows.slice(0, addrRows.length - 1).reduce((s, r) => s + r.heightPct * 3.2, 0),
                    }}
                >
                    <div className="w-3 h-px bg-gray-600" />
                    <span className="whitespace-nowrap leading-none">0x0000000000001000</span>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3.1  프로세스별 가상 주소 공간 격리 시각화
// ─────────────────────────────────────────────────────────────────────────────
const processes3_1 = [
    {
        name: 'nginx',
        pid: 1234,
        accent: {
            border: 'border-blue-600 dark:border-blue-700',
            bg: 'bg-blue-950/40',
            head: 'bg-blue-900/50',
            dot: 'bg-blue-400',
            text: 'text-blue-300',
            cr3: 'text-blue-400',
            physBg: 'bg-blue-900/60',
            physText: 'text-blue-300',
        },
    },
    {
        name: 'python',
        pid: 5678,
        accent: {
            border: 'border-emerald-600 dark:border-emerald-700',
            bg: 'bg-emerald-950/40',
            head: 'bg-emerald-900/50',
            dot: 'bg-emerald-400',
            text: 'text-emerald-300',
            cr3: 'text-emerald-400',
            physBg: 'bg-emerald-900/60',
            physText: 'text-emerald-300',
        },
    },
    {
        name: 'bash',
        pid: 9012,
        accent: {
            border: 'border-amber-600 dark:border-amber-700',
            bg: 'bg-amber-950/40',
            head: 'bg-amber-900/50',
            dot: 'bg-amber-400',
            text: 'text-amber-300',
            cr3: 'text-amber-400',
            physBg: 'bg-amber-900/60',
            physText: 'text-amber-300',
        },
    },
]

export function MultiProcessVAViz() {
    return (
        <div className="space-y-2">
            {/* 3 process columns */}
            <div className="grid grid-cols-3 gap-2">
                {processes3_1.map((p) => (
                    <div
                        key={p.pid}
                        className={`rounded-xl border ${p.accent.border} ${p.accent.bg} overflow-hidden text-[11px] font-mono`}
                    >
                        {/* Process header */}
                        <div
                            className={`${p.accent.head} px-2.5 py-2 border-b ${p.accent.border} flex items-center gap-1.5`}
                        >
                            <div className={`w-2 h-2 rounded-full ${p.accent.dot} shrink-0`} />
                            <span className={`font-bold ${p.accent.text}`}>{p.name}</span>
                            <span className="text-gray-500 text-[10px] ml-auto">PID {p.pid}</span>
                        </div>
                        {/* Mini address space bars */}
                        <div className="flex flex-col divide-y divide-gray-800/50">
                            <div className="bg-violet-900/60 px-2.5 py-1.5">
                                <div className="text-violet-300 font-semibold text-[10px]">커널 공간</div>
                                <div className="text-violet-500 text-[9px]">공유 ↔</div>
                            </div>
                            <div className="bg-amber-900/30 px-2.5 py-1">
                                <div className="text-amber-300 text-[10px]">stack</div>
                                <div className="text-gray-600 text-[9px]">0x7fff…</div>
                            </div>
                            <div className="bg-emerald-900/30 px-2.5 py-1">
                                <div className="text-emerald-300 text-[10px]">heap</div>
                            </div>
                            <div className="bg-blue-900/30 px-2.5 py-1.5">
                                <div className="text-blue-300 text-[10px]">text / data</div>
                                <div className="text-gray-600 text-[9px]">0x0040_0000</div>
                            </div>
                        </div>
                        {/* CR3 indicator */}
                        <div className={`px-2.5 py-1.5 border-t ${p.accent.border} text-[10px] text-gray-500`}>
                            CR3 → <span className={`font-bold ${p.accent.cr3}`}>PGD_{p.pid}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Arrow row */}
            <div className="grid grid-cols-3 gap-2 text-center text-gray-500 text-xs">
                {processes3_1.map((p) => (
                    <div key={p.pid} className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px]">독립된 페이지 테이블</span>
                        <span>↓</span>
                    </div>
                ))}
            </div>

            {/* Physical memory bar */}
            <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-3 space-y-2">
                <div className="text-[11px] text-gray-400 font-mono font-semibold">물리 메모리 — 단 하나</div>
                <div className="flex rounded-lg overflow-hidden h-9 text-[10px] font-mono border border-gray-700">
                    <div className="w-16 shrink-0 bg-violet-900/70 flex items-center justify-center text-violet-300 border-r border-violet-800">
                        커널
                    </div>
                    {processes3_1.map((p) => (
                        <div
                            key={p.pid}
                            className={`flex-1 ${p.accent.physBg} flex items-center justify-center ${p.accent.physText} border-r border-gray-700 last:border-r-0`}
                        >
                            {p.name}
                        </div>
                    ))}
                </div>
                <div className="flex gap-6 text-[10px] text-gray-500">
                    <span>
                        ↑ 커널 공간: 세 프로세스 <strong className="text-gray-300">모두 같은</strong> 물리 주소 공유
                    </span>
                    <span>
                        ↑ 유저 공간: 프로세스마다 <strong className="text-gray-300">서로 다른</strong> 물리 페이지
                    </span>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3.2  VA bit-field 분해 시각화
// ─────────────────────────────────────────────────────────────────────────────
export function VABitBreakdown() {
    const toBin = (n: number, bits: number) => n.toString(2).padStart(bits, '0')

    const fields = [
        {
            name: 'PGD',
            range: '[47:39]',
            bits: 9,
            dec: 0xff,
            hex: '0xFF',
            bg: 'bg-purple-100 dark:bg-purple-900/40',
            border: 'border-purple-400 dark:border-purple-600',
            text: 'text-purple-700 dark:text-purple-200',
            label: '1번째 레벨 인덱스',
        },
        {
            name: 'PUD',
            range: '[38:30]',
            bits: 9,
            dec: 0x1ff,
            hex: '0x1FF',
            bg: 'bg-blue-100 dark:bg-blue-900/40',
            border: 'border-blue-400 dark:border-blue-600',
            text: 'text-blue-700 dark:text-blue-200',
            label: '2번째 레벨 인덱스',
        },
        {
            name: 'PMD',
            range: '[29:21]',
            bits: 9,
            dec: 0xf5,
            hex: '0xF5',
            bg: 'bg-emerald-100 dark:bg-emerald-900/40',
            border: 'border-emerald-400 dark:border-emerald-600',
            text: 'text-emerald-700 dark:text-emerald-200',
            label: '3번째 레벨 인덱스',
        },
        {
            name: 'PTE',
            range: '[20:12]',
            bits: 9,
            dec: 0xdb,
            hex: '0xDB',
            bg: 'bg-amber-100 dark:bg-amber-900/40',
            border: 'border-amber-400 dark:border-amber-600',
            text: 'text-amber-700 dark:text-amber-200',
            label: '4번째 레벨 인덱스',
        },
        {
            name: 'Offset',
            range: '[11:0]',
            bits: 12,
            dec: 0xeef,
            hex: '0xEEF',
            bg: 'bg-red-100 dark:bg-red-900/40',
            border: 'border-red-400 dark:border-red-600',
            text: 'text-red-700 dark:text-red-200',
            label: '페이지 내 오프셋',
        },
    ]

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3">
            <div className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-300">
                VA = <span className="text-gray-900 dark:text-white">0x00007FFF_DEADBEEF</span> 비트 분해
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
                48비트 = 9+9+9+9+12. 각 9비트는 해당 페이지 테이블에서 최대 512개(2⁹) 엔트리 중 하나를 선택합니다.
            </p>

            {/* 필드별 비트 블록 */}
            <div className="flex gap-1 flex-wrap">
                {fields.map((f) => {
                    const binStr = toBin(f.dec, f.bits)
                    return (
                        <div
                            key={f.name}
                            className={`rounded-lg border ${f.bg} ${f.border} flex flex-col items-center py-2 px-1`}
                        >
                            {/* 비트 열 */}
                            <div className="flex gap-px mb-1">
                                {binStr.split('').map((bit, i) => (
                                    <span
                                        key={i}
                                        className={`w-[18px] h-6 flex items-center justify-center text-xs font-bold font-mono rounded ${f.text} bg-white/50 dark:bg-black/20`}
                                    >
                                        {bit}
                                    </span>
                                ))}
                            </div>
                            <div className={`text-[10px] font-bold font-mono ${f.text}`}>{f.name}</div>
                            <div className="text-[9px] text-gray-400 dark:text-gray-500 font-mono">{f.range}</div>
                            <div className={`text-[11px] font-bold font-mono ${f.text} mt-0.5`}>{f.hex}</div>
                            <div className="text-[9px] text-gray-400 dark:text-gray-500">({f.dec}번째)</div>
                        </div>
                    )
                })}
            </div>

            {/* 의미 설명 */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-1 text-[10px] font-mono">
                {fields.map((f) => (
                    <div key={f.name} className={`rounded px-2 py-1 ${f.bg} ${f.text} text-center`}>
                        {f.label}
                    </div>
                ))}
            </div>

            {/* 계산 흐름 요약 */}
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 font-mono text-[11px] text-gray-600 dark:text-gray-400 space-y-0.5">
                <div>
                    CR3 → PGD[<span className="text-purple-600 dark:text-purple-300">0xFF</span>] → PUD 기준 주소
                </div>
                <div className="pl-2">
                    → PUD[<span className="text-blue-600 dark:text-blue-300">0x1FF</span>] → PMD 기준 주소
                </div>
                <div className="pl-4">
                    → PMD[<span className="text-emerald-600 dark:text-emerald-300">0xF5</span>] → PTE 기준 주소
                </div>
                <div className="pl-6">
                    → PTE[<span className="text-amber-600 dark:text-amber-300">0xDB</span>] →{' '}
                    <strong className="text-gray-800 dark:text-gray-200">PFN</strong> (물리 페이지 번호)
                </div>
                <div className="pl-8">
                    → <strong className="text-gray-800 dark:text-gray-200">PA</strong> = PFN × 4096 +{' '}
                    <span className="text-red-600 dark:text-red-300">0xEEF</span>
                </div>
            </div>
        </div>
    )
}

// Flame Graph mock visualisation
// Extracted from src/pages/topic11-debugging/index.tsx

// ─────────────────────────────────────────────────────────────────────────────
// Types & data
// ─────────────────────────────────────────────────────────────────────────────

interface FlameNode {
    label: string
    widthPct: number
    color: string
    children?: FlameNode[]
}

const flameTreeData: FlameNode = {
    label: 'main',
    widthPct: 100,
    color: '#ef4444',
    children: [
        {
            label: 'process_request',
            widthPct: 70,
            color: '#f97316',
            children: [
                {
                    label: 'db_query',
                    widthPct: 40,
                    color: '#f59e0b',
                    children: [
                        { label: 'pg_exec', widthPct: 25, color: '#eab308' },
                        { label: 'pg_parse', widthPct: 15, color: '#84cc16' },
                    ],
                },
                { label: 'json_encode', widthPct: 30, color: '#22c55e' },
            ],
        },
        { label: 'idle', widthPct: 30, color: '#06b6d4' },
    ],
}

const flameInterpretCards = [
    {
        title: '넓은 평평한 상단 블록',
        color: '#ef4444',
        desc: '해당 함수가 CPU 사용량이 많음 → 최적화 대상',
    },
    {
        title: '좁고 깊은 타워',
        color: '#f97316',
        desc: '깊은 재귀 또는 많은 중간 호출 → 불필요한 추상화 확인',
    },
    {
        title: 'kernel 스택 넓게 나타남',
        color: '#8b5cf6',
        desc: '시스템 콜 또는 인터럽트 처리 병목',
    },
    {
        title: 'idle이 전체의 대부분',
        color: '#06b6d4',
        desc: 'CPU 바운드가 아닌 I/O 바운드 → off-CPU 분석 필요',
    },
]

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function FlameBlock({ node, offsetPct }: { node: FlameNode; offsetPct: number }) {
    return (
        <div
            style={{ width: `${node.widthPct}%`, marginLeft: `${offsetPct}%`, position: 'relative' }}
            className="flex flex-col-reverse"
        >
            {node.children && node.children.length > 0 && (
                <div className="flex items-end w-full" style={{ position: 'relative' }}>
                    {node.children.map((child) => (
                        <FlameBlock key={child.label} node={child} offsetPct={0} />
                    ))}
                </div>
            )}
            <div
                title={`${node.label} — ${node.widthPct}%`}
                style={{ backgroundColor: node.color, width: '100%' }}
                className="h-8 flex items-center justify-center overflow-hidden border border-white/20 dark:border-black/30 cursor-default select-none rounded-sm"
            >
                <span className="text-white text-xs font-mono font-semibold truncate px-1">
                    {node.label} <span className="opacity-75">({node.widthPct}%)</span>
                </span>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function FlameGraphViz() {
    return (
        <div className="space-y-4">
            {/* Axis legend */}
            <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                    { axis: 'X축', desc: '샘플 수 (시간 비율). 왼→오른쪽 순서는 의미 없음 (알파벳 순)' },
                    { axis: 'Y축', desc: '콜 스택 깊이. 아래가 호출자(caller), 위가 피호출자(callee)' },
                    { axis: '폭', desc: '해당 함수가 샘플에 등장한 횟수 → CPU 사용 비율' },
                    { axis: '색상', desc: '의미 없음(구분용). 빨간계열=유저 공간, 파란계열=커널 공간 관례' },
                ].map((item) => (
                    <div
                        key={item.axis}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-1"
                    >
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{item.axis}</span>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                    </div>
                ))}
            </div>

            {/* Mock flame graph */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 p-4 space-y-2">
                <p className="text-xs font-mono text-gray-500 dark:text-gray-500 mb-3">
                    ▲ 콜스택 (위 = callee) &nbsp;|&nbsp; 폭 = CPU 사용 비율
                </p>
                <div className="w-full flex flex-col-reverse">
                    <FlameBlock node={flameTreeData} offsetPct={0} />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-600 pt-1">
                    * 모의 시각화 — 실제 flame graph는 SVG 인터랙티브로 열립니다
                </p>
            </div>

            {/* Interpretation cards */}
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">해석 예시</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {flameInterpretCards.map((card) => (
                    <div
                        key={card.title}
                        className="rounded-xl border bg-white dark:bg-gray-900 p-4 space-y-2"
                        style={{ borderColor: card.color + '55' }}
                    >
                        <div className="text-xs font-mono font-bold" style={{ color: card.color }}>
                            {card.title}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">{card.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

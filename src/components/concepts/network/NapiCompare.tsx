// ─────────────────────────────────────────────────────────────────────────────
// 6.2  NAPI 동작 흐름 비교 (JSX)
// ─────────────────────────────────────────────────────────────────────────────
interface NapiStep {
    text: string
    highlight?: boolean
}

const interruptSteps: NapiStep[] = [
    { text: '패킷 1 도착' },
    { text: 'IRQ 발생', highlight: true },
    { text: '인터럽트 핸들러 실행' },
    { text: '패킷 2 도착' },
    { text: 'IRQ 발생 (또 발생!)', highlight: true },
    { text: '인터럽트 핸들러 실행' },
    { text: '패킷 N 도착 → IRQ 폭풍 발생', highlight: true },
]

const napiSteps: NapiStep[] = [
    { text: '패킷 1 도착' },
    { text: '첫 IRQ 발생 (1회만)', highlight: true },
    { text: 'IRQ 비활성화 + NAPI 등록' },
    { text: '패킷 2, 3, ... 도착' },
    { text: 'poll() — 최대 64개 일괄 처리', highlight: true },
    { text: '큐 비면 IRQ 다시 활성화' },
    { text: '다음 패킷 대기' },
]

export function NapiCompare() {
    return (
        <div className="grid grid-cols-2 gap-4">
            {/* Interrupt mode */}
            <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 p-4">
                <div className="text-sm font-bold text-red-600 dark:text-red-400 mb-3">인터럽트 방식 (Legacy)</div>
                <div className="space-y-1.5">
                    {interruptSteps.map((s, i) => (
                        <div
                            key={i}
                            className={`flex items-center gap-2 text-xs font-mono px-2 py-1 rounded ${
                                s.highlight ? 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700/50' : 'text-gray-600 dark:text-gray-400'
                            }`}
                        >
                            <span className="text-gray-600 w-4 text-right">{i + 1}.</span>
                            <span>{s.text}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-3 text-[11px] text-red-500 dark:text-red-400/80 border-t border-red-200 dark:border-red-800/40 pt-2">
                    고속 트래픽 시 CPU가 인터럽트 처리에만 소모됨
                </div>
            </div>

            {/* NAPI mode */}
            <div className="rounded-xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-950/30 p-4">
                <div className="text-sm font-bold text-green-600 dark:text-green-400 mb-3">NAPI 방식 (New API)</div>
                <div className="space-y-1.5">
                    {napiSteps.map((s, i) => (
                        <div
                            key={i}
                            className={`flex items-center gap-2 text-xs font-mono px-2 py-1 rounded ${
                                s.highlight
                                    ? 'bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700/50'
                                    : 'text-gray-600 dark:text-gray-400'
                            }`}
                        >
                            <span className="text-gray-600 w-4 text-right">{i + 1}.</span>
                            <span>{s.text}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-3 text-[11px] text-green-500 dark:text-green-400/80 border-t border-green-200 dark:border-green-800/40 pt-2">
                    budget 단위 일괄 처리 → CPU 효율 극대화
                </div>
            </div>
        </div>
    )
}

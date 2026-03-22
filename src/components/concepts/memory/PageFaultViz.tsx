// ─────────────────────────────────────────────────────────────────────────────
// 3.4  Page Fault 시각화
// ─────────────────────────────────────────────────────────────────────────────

type PFZone = 'process' | 'kernel' | 'memory'

interface PFStep {
  active: PFZone[]
  arrow?: { from: PFZone; to: PFZone }
  note: string
}

const pfStepData: PFStep[] = [
    { active: ['process'], note: '*ptr = 42 → 가상 주소 변환 요청' },
    { active: ['process', 'kernel'], arrow: { from: 'process', to: 'kernel' }, note: '#PF 예외 발생 → CR2 = fault 주소' },
    { active: ['kernel'], note: 'do_page_fault() → VMA 조회 → fault 종류 판별' },
    { active: ['kernel', 'memory'], arrow: { from: 'kernel', to: 'memory' }, note: 'Buddy Alloc(minor) / disk swap in(major)' },
    { active: ['kernel'], note: 'PTE 갱신 (Present=1) + TLB 무효화' },
    { active: ['process', 'kernel', 'memory'], note: '명령어 재실행 → TLB hit → 정상 접근' },
]

export function PageFaultViz({ step }: { step: number }) {
    const zones: { id: PFZone; label: string; color: string; activeColor: string }[] = [
        { id: 'process', label: '프로세스', color: '#1f2937', activeColor: '#1e3a8a' },
        { id: 'kernel', label: '커널 / MMU', color: '#1f2937', activeColor: '#78350f' },
        { id: 'memory', label: '메모리 / 디스크', color: '#1f2937', activeColor: '#14532d' },
    ]

    const current = pfStepData[step]

    return (
        <div className="space-y-4 p-2">
            <div className="flex gap-3">
                {zones.map((z, zi) => {
                    const isActive = current.active.includes(z.id)
                    const showArrowRight = current.arrow?.from === z.id && zones[zi + 1] && current.arrow.to === zones[zi + 1]?.id
                    return (
                        <div key={z.id} className="flex items-center gap-3 flex-1">
                            <div
                                className="flex-1 rounded-lg p-4 text-center transition-all duration-300 min-h-[80px] flex flex-col items-center justify-center"
                                style={{
                                    background: isActive ? z.activeColor : z.color,
                                    border: `2px solid ${isActive ? '#6b7280' : '#374151'}`,
                                    boxShadow: isActive ? '0 0 12px rgba(255,255,255,0.1)' : 'none',
                                }}
                            >
                                <div className="text-sm font-bold text-white">{z.label}</div>
                                {isActive && (
                                    <div className="text-[10px] text-gray-300 mt-1">활성</div>
                                )}
                            </div>
                            {showArrowRight && (
                                <div className="text-gray-400 text-xl">→</div>
                            )}
                        </div>
                    )
                })}
            </div>

            <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2 text-xs text-gray-200 font-mono text-center">
                {current.note}
            </div>
        </div>
    )
}

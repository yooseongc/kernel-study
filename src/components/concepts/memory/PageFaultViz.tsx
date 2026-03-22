// ─────────────────────────────────────────────────────────────────────────────
// 3.4  Page Fault 시각화
// ─────────────────────────────────────────────────────────────────────────────

import { useTheme } from '../../../hooks/useTheme'

type PFZone = 'process' | 'kernel' | 'memory'

interface PFStep {
    active: PFZone[]
    arrow?: { from: PFZone; to: PFZone }
    note: string
}

const pfStepData: PFStep[] = [
    { active: ['process'], note: '*ptr = 42 → 가상 주소 변환 요청' },
    {
        active: ['process', 'kernel'],
        arrow: { from: 'process', to: 'kernel' },
        note: '#PF 예외 발생 → CR2 = fault 주소',
    },
    { active: ['kernel'], note: 'do_page_fault() → VMA 조회 → fault 종류 판별' },
    {
        active: ['kernel', 'memory'],
        arrow: { from: 'kernel', to: 'memory' },
        note: 'Buddy Alloc(minor) / disk swap in(major)',
    },
    { active: ['kernel'], note: 'PTE 갱신 (Present=1) + TLB 무효화' },
    { active: ['process', 'kernel', 'memory'], note: '명령어 재실행 → TLB hit → 정상 접근' },
]

interface ZoneDef {
    id: PFZone
    label: string
    lightBg: string
    darkBg: string
    lightActive: string
    darkActive: string
    lightBorder: string
    darkBorder: string
}

const zones: ZoneDef[] = [
    {
        id: 'process',
        label: '프로세스',
        lightBg: '#f3f4f6',
        darkBg: '#1f2937',
        lightActive: '#dbeafe',
        darkActive: '#1e3a8a',
        lightBorder: '#93c5fd',
        darkBorder: '#6b7280',
    },
    {
        id: 'kernel',
        label: '커널 / MMU',
        lightBg: '#f3f4f6',
        darkBg: '#1f2937',
        lightActive: '#fef3c7',
        darkActive: '#78350f',
        lightBorder: '#f59e0b',
        darkBorder: '#6b7280',
    },
    {
        id: 'memory',
        label: '메모리 / 디스크',
        lightBg: '#f3f4f6',
        darkBg: '#1f2937',
        lightActive: '#dcfce7',
        darkActive: '#14532d',
        lightBorder: '#22c55e',
        darkBorder: '#6b7280',
    },
]

export function PageFaultViz({ step }: { step: number }) {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const current = pfStepData[step]

    return (
        <div className="space-y-4 p-2">
            <div className="flex gap-3">
                {zones.map((z, zi) => {
                    const isActive = current.active.includes(z.id)
                    const showArrowRight =
                        current.arrow?.from === z.id && zones[zi + 1] && current.arrow.to === zones[zi + 1]?.id
                    return (
                        <div key={z.id} className="flex items-center gap-3 flex-1">
                            <div
                                className="flex-1 rounded-lg p-4 text-center transition-all duration-300 min-h-[80px] flex flex-col items-center justify-center"
                                style={{
                                    background: isActive
                                        ? isDark
                                            ? z.darkActive
                                            : z.lightActive
                                        : isDark
                                          ? z.darkBg
                                          : z.lightBg,
                                    border: `2px solid ${isActive ? (isDark ? z.darkBorder : z.lightBorder) : isDark ? '#374151' : '#d1d5db'}`,
                                }}
                            >
                                <div className="text-sm font-bold text-gray-900 dark:text-white">{z.label}</div>
                                {isActive && (
                                    <div className="text-[10px] text-gray-500 dark:text-gray-300 mt-1">활성</div>
                                )}
                            </div>
                            {showArrowRight && (
                                <div className="text-gray-400 dark:text-gray-500 text-xl">→</div>
                            )}
                        </div>
                    )
                })}
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 px-4 py-2 text-xs text-gray-700 dark:text-gray-200 font-mono text-center">
                {current.note}
            </div>
        </div>
    )
}

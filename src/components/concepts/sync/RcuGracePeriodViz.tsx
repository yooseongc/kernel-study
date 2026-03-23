// RCU Grace Period 타임라인 SVG 시각화
// Extracted from src/pages/topic09-synchronization/index.tsx

import { useTheme } from '@study-ui/components'

export function RcuGracePeriodViz() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    return (
        <div className="overflow-x-auto">
            <svg
                viewBox="0 0 780 260"
                width="780"
                height="260"
                className="w-full max-w-3xl mx-auto block"
                style={{ minWidth: 520 }}
                aria-label="RCU Grace Period 타임라인"
            >
                {/* 배경 */}
                <rect width="780" height="260" rx="10" fill={isDark ? '#111827' : '#f9fafb'} />

                {/* Grace Period 배경 구간: x=210 ~ x=490 */}
                <rect
                    x="210"
                    y="10"
                    width="280"
                    height="230"
                    rx="4"
                    fill={isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.06)'}
                    stroke="#ef4444"
                    strokeWidth="1"
                    strokeDasharray="6,3"
                />
                <text x="350" y="26" textAnchor="middle" fontSize="10" fill="#ef4444" fontWeight="bold">
                    Grace Period
                </text>

                {/* 시간 축 */}
                <line x1="30" y1="245" x2="760" y2="245" stroke={isDark ? '#6b7280' : '#9ca3af'} strokeWidth="1.5" />
                <polygon points="758,241 766,245 758,249" fill={isDark ? '#6b7280' : '#9ca3af'} />
                <text x="40" y="259" fontSize="10" fill={isDark ? '#9ca3af' : '#6b7280'}>
                    시간
                </text>
                {/* 눈금 */}
                {[100, 210, 350, 490, 620, 730].map((x) => (
                    <line
                        key={x}
                        x1={x}
                        y1="241"
                        x2={x}
                        y2="249"
                        stroke={isDark ? '#4b5563' : '#d1d5db'}
                        strokeWidth="1"
                    />
                ))}

                {/* 레이블 열 */}
                <text
                    x="28"
                    y="72"
                    fontSize="11"
                    fontWeight="600"
                    fill={isDark ? '#93c5fd' : '#2563eb'}
                    textAnchor="start"
                >
                    업데이터
                </text>
                <text
                    x="28"
                    y="112"
                    fontSize="11"
                    fontWeight="600"
                    fill={isDark ? '#fdba74' : '#ea580c'}
                    textAnchor="start"
                >
                    Reader 1
                </text>
                <text
                    x="28"
                    y="152"
                    fontSize="11"
                    fontWeight="600"
                    fill={isDark ? '#fdba74' : '#ea580c'}
                    textAnchor="start"
                >
                    Reader 2
                </text>
                <text
                    x="28"
                    y="192"
                    fontSize="11"
                    fontWeight="600"
                    fill={isDark ? '#86efac' : '#16a34a'}
                    textAnchor="start"
                >
                    Reader 3
                </text>

                {/* 업데이터 바: publish 구간 x=100~210 */}
                <rect
                    x="80"
                    y="59"
                    width="130"
                    height="18"
                    rx="4"
                    fill={isDark ? 'rgba(59,130,246,0.35)' : 'rgba(59,130,246,0.25)'}
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                />
                <text
                    x="145"
                    y="72"
                    textAnchor="middle"
                    fontSize="8"
                    fill={isDark ? '#93c5fd' : '#1d4ed8'}
                    fontWeight="bold"
                >
                    publish (rcu_assign_ptr)
                </text>
                {/* publish 화살표 아래로 */}
                <line x1="210" y1="77" x2="210" y2="95" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3,2" />
                <polygon points="206,93 210,101 214,93" fill="#3b82f6" />

                {/* Reader 1: x=100~490 (구버전) */}
                <rect
                    x="100"
                    y="99"
                    width="390"
                    height="18"
                    rx="4"
                    fill={isDark ? 'rgba(249,115,22,0.3)' : 'rgba(249,115,22,0.2)'}
                    stroke="#f97316"
                    strokeWidth="1.5"
                />
                <text
                    x="295"
                    y="112"
                    textAnchor="middle"
                    fontSize="9"
                    fill={isDark ? '#fdba74' : '#c2410c'}
                    fontWeight="bold"
                >
                    구버전 포인터 사용 중
                </text>
                {/* Reader 1 종료 표시 */}
                <line x1="490" y1="95" x2="490" y2="125" stroke="#f97316" strokeWidth="1.5" />
                <text x="494" y="110" fontSize="9" fill={isDark ? '#fdba74' : '#c2410c'}>
                    종료
                </text>

                {/* Reader 2: x=155~490 (구버전) */}
                <rect
                    x="155"
                    y="139"
                    width="335"
                    height="18"
                    rx="4"
                    fill={isDark ? 'rgba(249,115,22,0.3)' : 'rgba(249,115,22,0.2)'}
                    stroke="#f97316"
                    strokeWidth="1.5"
                />
                <text
                    x="322"
                    y="152"
                    textAnchor="middle"
                    fontSize="9"
                    fill={isDark ? '#fdba74' : '#c2410c'}
                    fontWeight="bold"
                >
                    구버전 포인터 사용 중
                </text>
                {/* Reader 2 종료 표시 */}
                <line x1="490" y1="135" x2="490" y2="165" stroke="#f97316" strokeWidth="1.5" />
                <text x="494" y="150" fontSize="9" fill={isDark ? '#fdba74' : '#c2410c'}>
                    종료
                </text>

                {/* Reader 3: x=540~660 (신버전, grace period 후) */}
                <rect
                    x="540"
                    y="179"
                    width="150"
                    height="18"
                    rx="4"
                    fill={isDark ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.18)'}
                    stroke="#22c55e"
                    strokeWidth="1.5"
                />
                <text
                    x="615"
                    y="192"
                    textAnchor="middle"
                    fontSize="9"
                    fill={isDark ? '#86efac' : '#15803d'}
                    fontWeight="bold"
                >
                    신버전 포인터 사용
                </text>

                {/* Grace Period 끝 → Reclaim 화살표 */}
                <line x1="490" y1="170" x2="490" y2="210" stroke="#22c55e" strokeWidth="2" />
                <polygon points="486,208 490,216 494,208" fill="#22c55e" />
                <rect
                    x="430"
                    y="216"
                    width="150"
                    height="20"
                    rx="4"
                    fill={isDark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.15)'}
                    stroke="#22c55e"
                    strokeWidth="1.5"
                />
                <text
                    x="505"
                    y="230"
                    textAnchor="middle"
                    fontSize="10"
                    fill={isDark ? '#86efac' : '#15803d'}
                    fontWeight="bold"
                >
                    call_rcu → kfree
                </text>

                {/* Grace Period 레이블 아래 구간 표시 */}
                <line x1="210" y1="235" x2="490" y2="235" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,2" />
                <polygon points="487,231 495,235 487,239" fill="#ef4444" />
                <polygon points="213,231 205,235 213,239" fill="#ef4444" />
            </svg>
        </div>
    )
}

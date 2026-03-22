/* eslint-disable react-refresh/only-export-components */
// Race Condition animated visualisation
// Extracted from src/pages/topic09-synchronization/index.tsx

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

interface RaceState {
  counter: number
  regA: number | null
  regB: number | null
  activeA: boolean
  activeB: boolean
  highlight: 'none' | 'a' | 'b' | 'danger'
  note: string
}

const raceStates: RaceState[] = [
    {
        counter: 0,
        regA: null,
        regB: null,
        activeA: false,
        activeB: false,
        highlight: 'none',
        note: '두 스레드 모두 대기 중. counter = 0',
    },
    {
        counter: 0,
        regA: 0,
        regB: null,
        activeA: true,
        activeB: false,
        highlight: 'a',
        note: 'Thread A가 counter(=0)를 레지스터로 읽음. 아직 쓰지 않음.',
    },
    {
        counter: 0,
        regA: 0,
        regB: 0,
        activeA: false,
        activeB: true,
        highlight: 'b',
        note: '컨텍스트 스위치! Thread B도 counter(=0)를 읽음. A의 결과는 아직 반영 안 됨.',
    },
    {
        counter: 1,
        regA: 0,
        regB: 0,
        activeA: true,
        activeB: false,
        highlight: 'a',
        note: 'Thread A: reg+1=1 을 counter에 씀. counter = 1.',
    },
    {
        counter: 1,
        regA: 0,
        regB: 0,
        activeA: false,
        activeB: true,
        highlight: 'danger',
        note: 'Thread B: reg+1=1 을 counter에 씀. counter = 1 (기댓값 2!). 데이터 손실 발생!',
    },
]

export const raceAnimSteps = [
    { label: '① 초기 상태', description: 'counter=0, Thread A/B 모두 대기' },
    { label: '② Thread A: counter 읽기', description: 'A가 counter=0 읽음 (레지스터에 저장)' },
    {
        label: '③ Thread B: counter 읽기 (컨텍스트 스위치)',
        description: 'B도 counter=0 읽음 (A는 아직 쓰지 않음)',
    },
    { label: '④ Thread A: counter+1 쓰기', description: 'A가 register+1=1을 counter에 씀' },
    {
        label: '⑤ Thread B: counter+1 쓰기 (데이터 손실!)',
        description: 'B도 register+1=1을 counter에 씀 → counter=1 (기댓값 2!)',
    },
]

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const colBase = 'rounded-lg border px-3 py-3 flex flex-col gap-1 min-w-0'

function ThreadBox({
    label,
    regVal,
    active,
    danger,
}: {
    label: string
    regVal: number | null
    active: boolean
    danger: boolean
}) {
    const borderCls = danger
        ? 'border-red-500 bg-red-900/20'
        : active
            ? 'border-blue-500 bg-blue-900/20'
            : 'border-gray-700 bg-gray-800/40'
    const textCls = danger ? 'text-red-400' : active ? 'text-blue-300' : 'text-gray-500'
    return (
        <div className={`${colBase} ${borderCls} flex-1`}>
            <div className={`text-xs font-mono font-bold ${textCls}`}>{label}</div>
            <div className="text-xs text-gray-400 font-mono">
          reg ={' '}
                <span className={regVal !== null ? 'text-yellow-300' : 'text-gray-600'}>
                    {regVal !== null ? regVal : '—'}
                </span>
            </div>
            {active && (
                <div className={`text-[10px] font-mono ${danger ? 'text-red-400' : 'text-green-400'}`}>
                    {danger ? '▶ STORE (충돌!)' : '▶ 실행 중'}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function RaceConditionViz({ step }: { step: number }) {
    const s = raceStates[step]

    const activeA = s.activeA
    const activeB = s.activeB
    const isDanger = s.highlight === 'danger'

    return (
        <div className="flex flex-col gap-3 p-2">
            <div className="flex gap-3 items-stretch">
                {/* Thread A */}
                <ThreadBox
                    label="Thread A"
                    regVal={s.regA}
                    active={activeA}
                    danger={false}
                />

                {/* Shared counter */}
                <div
                    className={`${colBase} flex-1 items-center justify-center ${
                        isDanger
                            ? 'border-red-500 bg-red-900/30'
                            : 'border-yellow-600/60 bg-yellow-900/10'
                    }`}
                >
                    <div className="text-xs font-mono text-yellow-400 font-bold text-center">
            shared counter
                    </div>
                    <div
                        className={`text-2xl font-mono font-bold text-center ${
                            isDanger ? 'text-red-400' : 'text-yellow-300'
                        }`}
                    >
                        {s.counter}
                    </div>
                    {isDanger && (
                        <div className="text-[10px] font-mono text-red-400 text-center">
              기댓값: 2 ← 손실!
                        </div>
                    )}
                </div>

                {/* Thread B */}
                <ThreadBox
                    label="Thread B"
                    regVal={s.regB}
                    active={activeB}
                    danger={isDanger}
                />
            </div>

            <div
                className={`rounded-lg px-3 py-2 text-xs font-mono ${
                    isDanger
                        ? 'bg-red-900/30 text-red-300 border border-red-700/50'
                        : 'bg-gray-800/60 text-gray-400 border border-gray-700/50'
                }`}
            >
                {s.note}
            </div>
        </div>
    )
}

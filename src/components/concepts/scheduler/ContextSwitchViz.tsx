// ── 2.5 컨텍스트 스위치 steps ───────────────────────────────────────────────
const cpuRegs = [
    { owner: 'A', pc: '0x401234', sp: '0x7fff8a10', rax: '0x0000003c', rbx: '0x00000000', note: '' },
    { owner: 'A', pc: '0x401234', sp: '0x7fff8a10', rax: '0x0000003c', rbx: '0x00000000', note: '⚡ IRQ #0' },
    { owner: '...', pc: 'saving...', sp: 'saving...', rax: 'saving...', rbx: 'saving...', note: '→ A의 task_struct' },
    { owner: 'CFS', pc: 'pick_next', sp: 'pick_next', rax: 'pick_next', rbx: 'pick_next', note: '최소 vruntime 선택' },
    { owner: '...', pc: 'loading...', sp: 'loading...', rax: 'loading...', rbx: 'loading...', note: 'B의 task_struct →' },
    { owner: 'B', pc: '0x402a80', sp: '0x7ffe1234', rax: '0x00000001', rbx: '0x00000002', note: '' },
]

const processAStates = ['RUNNING', 'INTERRUPTED', 'SAVING', 'SAVED', 'WAITING', 'WAITING']
const processAColors = ['green', 'orange', 'yellow', 'gray', 'gray', 'gray']
const processAVruntime = ['12.4ms', '12.4ms', '15.1ms', '15.1ms', '15.1ms', '15.1ms']

const processBStates = ['WAITING', 'WAITING', 'WAITING', 'NEXT', 'LOADING', 'RUNNING']
const processBColors = ['gray', 'gray', 'gray', 'blue', 'yellow', 'green']
const processBVruntime = ['8.2ms', '8.2ms', '8.2ms', '8.2ms', '8.2ms', '8.2ms']

function getBlockClasses(color: string) {
    switch (color) {
        case 'green': return 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600'
        case 'orange': return 'bg-orange-100 dark:bg-orange-900/30 border-orange-400 dark:border-orange-600'
        case 'yellow': return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600'
        case 'blue': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600'
        case 'gray':
        default:
            return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
    }
}

function getStateTextColor(color: string) {
    switch (color) {
        case 'green': return 'text-green-700 dark:text-green-300'
        case 'orange': return 'text-orange-700 dark:text-orange-300'
        case 'yellow': return 'text-yellow-700 dark:text-yellow-300'
        case 'blue': return 'text-blue-700 dark:text-blue-300'
        default: return 'text-gray-500 dark:text-gray-400'
    }
}

export function ContextSwitchViz({ step }: { step: number }) {
    const aColor = processAColors[step]
    const bColor = processBColors[step]
    const reg = cpuRegs[step]

    const showArrowAtoC = step === 2
    const showArrowCtoB = step === 4
    const cpuGlow = step === 3

    return (
        <div className="flex flex-col gap-3 p-2">
            <div className="flex items-stretch gap-2">
                {/* Process A */}
                <div className={`flex-1 rounded-lg border-2 p-3 min-h-[160px] transition-all duration-300 ${getBlockClasses(aColor)}`}>
                    <div className="text-xs font-bold font-mono text-gray-500 dark:text-gray-400 mb-2">Process A</div>
                    <div className={`text-sm font-bold font-mono mb-2 ${getStateTextColor(aColor)}`}>
                        {processAStates[step]}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <div><span className="font-mono">PID:</span> 1234</div>
                        <div><span className="font-mono">vruntime:</span> {processAVruntime[step]}</div>
                        <div><span className="font-mono">nice:</span> 0</div>
                    </div>
                    {step === 1 && (
                        <div className="mt-2 text-xs bg-orange-200 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded px-2 py-1 font-mono">
                            ⚡ IRQ #0 수신
                        </div>
                    )}
                </div>

                {/* Arrow A→CPU */}
                <div className="flex flex-col items-center justify-center w-8 shrink-0">
                    <div
                        className="text-blue-400 text-lg transition-opacity duration-300 font-bold"
                        style={{ opacity: showArrowAtoC ? 1 : 0 }}
                    >
                        →
                    </div>
                </div>

                {/* CPU */}
                <div className={`flex-1 rounded-lg border-2 p-3 min-h-[160px] transition-all duration-300 ${
                    cpuGlow
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600'
                        : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
                }`}>
                    <div className="text-xs font-bold font-mono text-gray-500 dark:text-gray-400 mb-2">
                        CPU {cpuGlow ? '(CFS 선택 중)' : `(owner: ${reg.owner})`}
                    </div>
                    <div className="text-xs font-mono space-y-1">
                        <div><span className="text-gray-500 dark:text-gray-400">PC: </span><span className="text-green-600 dark:text-green-400">{reg.pc}</span></div>
                        <div><span className="text-gray-500 dark:text-gray-400">SP: </span><span className="text-green-600 dark:text-green-400">{reg.sp}</span></div>
                        <div><span className="text-gray-500 dark:text-gray-400">RAX:</span><span className="text-yellow-600 dark:text-yellow-400"> {reg.rax}</span></div>
                        <div><span className="text-gray-500 dark:text-gray-400">RBX:</span><span className="text-yellow-600 dark:text-yellow-400"> {reg.rbx}</span></div>
                    </div>
                    {reg.note && (
                        <div className="mt-2 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded px-2 py-1 font-mono">
                            {reg.note}
                        </div>
                    )}
                </div>

                {/* Arrow CPU→B */}
                <div className="flex flex-col items-center justify-center w-8 shrink-0">
                    <div
                        className="text-blue-400 text-lg transition-opacity duration-300 font-bold"
                        style={{ opacity: showArrowCtoB ? 1 : 0 }}
                    >
                        →
                    </div>
                </div>

                {/* Process B */}
                <div className={`flex-1 rounded-lg border-2 p-3 min-h-[160px] transition-all duration-300 ${getBlockClasses(bColor)}`}>
                    <div className="text-xs font-bold font-mono text-gray-500 dark:text-gray-400 mb-2">Process B</div>
                    <div className={`text-sm font-bold font-mono mb-2 ${getStateTextColor(bColor)}`}>
                        {processBStates[step]}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <div><span className="font-mono">PID:</span> 5678</div>
                        <div><span className="font-mono">vruntime:</span> {processBVruntime[step]}</div>
                        <div><span className="font-mono">nice:</span> 0</div>
                    </div>
                    {step === 3 && (
                        <div className="mt-2 text-xs bg-blue-200 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded px-2 py-1 font-mono">
                            ▶ 최소 vruntime
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

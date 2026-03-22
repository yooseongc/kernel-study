interface ZoneProps {
  title: string
  subtitle: string
  active: boolean
  activeClass: string
  activeTitleClass: string
  children: React.ReactNode
}

function SyscallZone({ title, subtitle, active, activeClass, activeTitleClass, children }: ZoneProps) {
    return (
        <div
            className={`rounded-lg p-3 transition-all duration-300 ${
                active
                    ? activeClass
                    : 'bg-gray-800 border border-gray-700 opacity-50'
            }`}
        >
            <div className={`text-xs font-mono mb-2 ${active ? activeTitleClass : 'text-gray-400'}`}>
                {title}
            </div>
            <div className="text-xs text-gray-500 mb-2">{subtitle}</div>
            {children}
        </div>
    )
}

// 각 step에서 활성화되는 영역 인덱스 (0=유저공간, 1=경계, 2=커널진입, 3=커널서브시스템)
const syscallStepZones: number[] = [0, 0, 1, 2, 2, 3, 1]

export function SyscallFlowViz({ step }: { step: number }) {
    const activeZone = syscallStepZones[step]

    return (
        <div className="flex flex-col md:flex-row gap-2 p-4 bg-gray-900 rounded-xl border border-gray-700 min-h-[200px]">
            {/* 유저 공간 */}
            <SyscallZone
                title="유저 공간 (Ring 3)"
                subtitle="User Space"
                active={activeZone === 0}
                activeClass="bg-blue-900/40 border border-blue-500 rounded-lg p-3"
                activeTitleClass="text-xs font-mono text-blue-300"
            >
                <div className="space-y-1.5">
                    <div className={`text-xs font-mono px-2 py-1 rounded transition-all duration-300 ${step === 0 ? 'bg-blue-700/60 text-blue-100 ring-1 ring-blue-400' : 'bg-gray-700/60 text-gray-300'}`}>
            App: write(fd, buf, n)
                    </div>
                    <div className={`text-xs font-mono px-2 py-1 rounded transition-all duration-300 ${step === 1 ? 'bg-blue-700/60 text-blue-100 ring-1 ring-blue-400' : 'bg-gray-700/60 text-gray-300'}`}>
            glibc: mov $1, %rax
                    </div>
                </div>
            </SyscallZone>

            {/* 하드웨어 경계 */}
            <div className="flex md:flex-col items-center justify-center gap-1 px-1">
                <div
                    className={`text-xs font-mono text-center transition-all duration-300 px-2 py-1 rounded ${
                        activeZone === 1
                            ? 'text-orange-300 bg-orange-900/40 border border-orange-500'
                            : 'text-gray-600'
                    }`}
                >
                    <div>{step <= 2 ? '↓' : '↑'}</div>
                    <div className="text-[10px] leading-tight">
                        {step <= 2 ? 'syscall' : 'sysretq'}
                    </div>
                </div>
            </div>

            {/* 커널 진입 */}
            <SyscallZone
                title="커널 진입 (Ring 0)"
                subtitle="Kernel Entry"
                active={activeZone === 2}
                activeClass="bg-purple-900/40 border border-purple-500 rounded-lg p-3"
                activeTitleClass="text-xs font-mono text-purple-300"
            >
                <div className="space-y-1.5">
                    <div className={`text-xs font-mono px-2 py-1 rounded transition-all duration-300 ${step === 3 ? 'bg-purple-700/60 text-purple-100 ring-1 ring-purple-400' : 'bg-gray-700/60 text-gray-300'}`}>
            entry_SYSCALL_64
                    </div>
                    <div className={`text-xs font-mono px-2 py-1 rounded transition-all duration-300 ${step === 4 ? 'bg-purple-700/60 text-purple-100 ring-1 ring-purple-400' : 'bg-gray-700/60 text-gray-300'}`}>
            sys_call_table[rax]
                    </div>
                    <div className={`text-xs font-mono px-2 py-1 rounded transition-all duration-300 ${step === 5 ? 'bg-purple-700/60 text-purple-100 ring-1 ring-purple-400' : 'bg-gray-700/60 text-gray-300'}`}>
            __x64_sys_write()
                    </div>
                </div>
            </SyscallZone>

            {/* 커널 서브시스템 */}
            <SyscallZone
                title="커널 서브시스템"
                subtitle="VFS / Block Layer"
                active={activeZone === 3}
                activeClass="bg-green-900/40 border border-green-500 rounded-lg p-3"
                activeTitleClass="text-xs font-mono text-green-300"
            >
                <div className="space-y-1.5">
                    <div className={`text-xs font-mono px-2 py-1 rounded transition-all duration-300 ${step === 5 ? 'bg-green-700/60 text-green-100 ring-1 ring-green-400' : 'bg-gray-700/60 text-gray-300'}`}>
            vfs_write()
                    </div>
                    <div className={`text-xs font-mono px-2 py-1 rounded transition-all duration-300 ${step === 5 ? 'bg-green-700/40 text-green-200' : 'bg-gray-700/60 text-gray-300'}`}>
            file→f_op→write()
                    </div>
                </div>
            </SyscallZone>
        </div>
    )
}

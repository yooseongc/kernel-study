type IRQZone = 'device' | 'cpu' | 'memory'

interface IRQStepData {
    active: IRQZone[]
    arrow?: { from: IRQZone; to: IRQZone }
    note: string
}

const irqStepData: IRQStepData[] = [
    { active: ['device'], note: 'NIC 등 장치가 패킷 수신 후 IRQ 라인에 신호 전송' },
    {
        active: ['device', 'cpu'],
        arrow: { from: 'device', to: 'cpu' },
        note: 'CPU EFLAGS.IF=0 설정 — 현재 명령어 완료 후 컨텍스트 저장',
    },
    {
        active: ['cpu', 'memory'],
        arrow: { from: 'cpu', to: 'memory' },
        note: 'IDT(Interrupt Descriptor Table)에서 IRQ 번호로 ISR 주소 조회',
    },
    { active: ['cpu'], note: 'Top Half (ISR) 실행: ACK 전송, 데이터 복사 — 최소한의 작업만' },
    {
        active: ['cpu', 'device'],
        arrow: { from: 'cpu', to: 'device' },
        note: 'Softirq/Tasklet 스케줄 예약. EFLAGS.IF=1 (인터럽트 재활성화)',
    },
    {
        active: ['cpu', 'device', 'memory'],
        note: '스케줄러가 적절한 시점에 softirq/workqueue 실행 (Bottom Half)',
    },
]

interface ZoneDef {
    id: IRQZone
    label: string
    sub: string
    color: string
    activeColor: string
    border: string
    activeBorder: string
}

const irqZones: ZoneDef[] = [
    {
        id: 'device',
        label: '장치 (NIC)',
        sub: 'IRQ 라인',
        color: '#1a1f2e',
        activeColor: '#7f1d1d',
        border: '#374151',
        activeBorder: '#ef4444',
    },
    {
        id: 'cpu',
        label: 'CPU / 커널',
        sub: 'ISR · softirq',
        color: '#1a1f2e',
        activeColor: '#1e3a5f',
        border: '#374151',
        activeBorder: '#3b82f6',
    },
    {
        id: 'memory',
        label: '메모리 (IDT/ISR)',
        sub: 'IDT 테이블',
        color: '#1a1f2e',
        activeColor: '#14532d',
        border: '#374151',
        activeBorder: '#22c55e',
    },
]

export function IRQViz({ step }: { step: number }) {
    const current = irqStepData[step]

    return (
        <div className="space-y-4 p-2">
            <div className="flex gap-3">
                {irqZones.map((z, zi) => {
                    const isActive = current.active.includes(z.id)
                    const showArrow =
                        current.arrow?.from === z.id &&
                        irqZones[zi + 1] !== undefined &&
                        current.arrow.to === irqZones[zi + 1].id
                    return (
                        <div key={z.id} className="flex items-center gap-3 flex-1">
                            <div
                                className="flex-1 rounded-xl p-4 text-center transition-all duration-300 min-h-[90px] flex flex-col items-center justify-center gap-1"
                                style={{
                                    background: isActive ? z.activeColor : z.color,
                                    border: `2px solid ${isActive ? z.activeBorder : z.border}`,
                                    boxShadow: isActive ? `0 0 16px ${z.activeBorder}55` : 'none',
                                }}
                            >
                                <div className="text-sm font-bold text-white">{z.label}</div>
                                <div className="text-[10px] text-gray-400">{z.sub}</div>
                                {isActive && (
                                    <div
                                        className="text-[9px] mt-1 font-mono px-2 py-0.5 rounded"
                                        style={{ background: z.activeBorder + '33', color: z.activeBorder }}
                                    >
                                        활성
                                    </div>
                                )}
                            </div>
                            {showArrow && <div className="text-gray-400 text-2xl font-bold select-none">→</div>}
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

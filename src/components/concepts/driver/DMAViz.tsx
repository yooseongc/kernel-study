/* eslint-disable react-refresh/only-export-components */
// NIC DMA flow animated visualisation
// Extracted from src/pages/topic10-drivers/index.tsx

export const dmaSteps = [
    {
        label: '① NIC: 패킷 수신',
        description: '물리 NIC가 이더넷 프레임을 수신합니다.',
    },
    {
        label: '② DMA 서술자 확인',
        description: 'NIC가 드라이버가 준비한 RX 링 버퍼의 DMA 서술자를 확인합니다.',
    },
    {
        label: '③ DMA 전송',
        description: 'NIC가 CPU 개입 없이 패킷을 RAM에 직접 씁니다 (PCIe DMA).',
    },
    {
        label: '④ IRQ 발생',
        description: 'DMA 완료 후 NIC가 CPU에 인터럽트를 전송합니다.',
    },
    {
        label: '⑤ 드라이버 처리',
        description: 'ISR → NAPI poll → sk_buff 생성 → netif_receive_skb().',
    },
]

// ─────────────────────────────────────────────────────────────────────────────
// Types & data
// ─────────────────────────────────────────────────────────────────────────────

type DmaZone = 'nic' | 'pcie' | 'ram'

interface DmaStepData {
    active: DmaZone[]
    arrow?: { from: DmaZone; to: DmaZone }
    note: string
}

const dmaStepData: DmaStepData[] = [
    { active: ['nic'], note: 'NIC 하드웨어: 이더넷 프레임 수신 완료' },
    {
        active: ['nic', 'ram'],
        note: 'NIC → RX 링 버퍼의 DMA 서술자 확인 (buffer_addr, length)',
    },
    {
        active: ['nic', 'pcie', 'ram'],
        arrow: { from: 'nic', to: 'ram' },
        note: 'PCIe DMA: CPU 개입 없이 패킷 데이터를 RAM에 직접 기록',
    },
    {
        active: ['nic', 'pcie'],
        arrow: { from: 'nic', to: 'pcie' },
        note: 'NIC가 DMA 완료 후 CPU에 IRQ 전송',
    },
    {
        active: ['pcie', 'ram'],
        note: 'ISR → NAPI poll → sk_buff 생성 → netif_receive_skb()',
    },
]

interface DmaZoneDef {
    id: DmaZone
    label: string
    sub: string
    color: string
    activeColor: string
    border: string
    activeBorder: string
}

const dmaZones: DmaZoneDef[] = [
    {
        id: 'nic',
        label: 'NIC 하드웨어',
        sub: 'PHY · MAC · DMA 엔진',
        color: '#1a1f2e',
        activeColor: '#450a0a',
        border: '#374151',
        activeBorder: '#ef4444',
    },
    {
        id: 'pcie',
        label: 'PCIe / DMA',
        sub: 'IRQ · 버스 마스터',
        color: '#1a1f2e',
        activeColor: '#78350f',
        border: '#374151',
        activeBorder: '#f59e0b',
    },
    {
        id: 'ram',
        label: 'RAM + 드라이버',
        sub: 'RX 링 버퍼 · sk_buff',
        color: '#1a1f2e',
        activeColor: '#0c1a3a',
        border: '#374151',
        activeBorder: '#3b82f6',
    },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function DMAViz({ step }: { step: number }) {
    const current = dmaStepData[step]

    return (
        <div className="space-y-4 p-2">
            <div className="flex gap-3">
                {dmaZones.map((z, zi) => {
                    const isActive = current.active.includes(z.id)
                    const showArrow =
                        current.arrow?.from === z.id &&
                        dmaZones[zi + 1] !== undefined &&
                        current.arrow.to === dmaZones[zi + 1].id
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
                                <div className="text-sm font-bold text-gray-900 dark:text-white">{z.label}</div>
                                <div className="text-[10px] text-gray-600 dark:text-gray-400">{z.sub}</div>
                                {isActive && (
                                    <div
                                        className="text-[9px] mt-1 font-mono px-2 py-0.5 rounded"
                                        style={{ background: z.activeBorder + '33', color: z.activeBorder }}
                                    >
                                        활성
                                    </div>
                                )}
                            </div>
                            {showArrow && <div className="text-yellow-400 text-2xl font-bold select-none">→</div>}
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

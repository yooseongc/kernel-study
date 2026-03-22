// ─────────────────────────────────────────────────────────────────────────────
// 6.4  L2/L3/L4 처리 흐름 시각화 (AnimatedDiagram용 step 컴포넌트)
// ─────────────────────────────────────────────────────────────────────────────
import { AnimatedDiagram } from '../../../components/viz/AnimatedDiagram'
import { useTheme } from '../../../hooks/useTheme'

const flowSteps = [
    {
        label: 'L2: Ethernet 수신',
        description:
            'eth_type_trans()로 프로토콜 판별. ARP면 arp_rcv(), IP면 ip_rcv()로 전달합니다. sk_buff의 mac_header가 설정됩니다.',
    },
    {
        label: 'L3: IP 수신 (ip_rcv)',
        description:
            'checksum 검증, TTL 감소, 목적지가 자신이면 상위 레이어로 전달. 아니면 라우팅 결정으로 이동합니다.',
    },
    {
        label: 'L3: 라우팅 결정 (ip_route_input)',
        description:
            'FIB(Forwarding Information Base)를 조회하여 FORWARD(포워딩) 또는 LOCAL_IN(로컬 수신)을 결정합니다.',
    },
    {
        label: 'L4: TCP/UDP 디멀티플렉싱',
        description: '목적지 포트 번호로 소켓을 탐색합니다. TCP는 tcp_v4_rcv(), UDP는 udp_rcv()가 처리합니다.',
    },
    {
        label: '소켓 수신 버퍼',
        description:
            'sk_buff를 소켓의 receive queue에 추가합니다 (sk->sk_receive_queue). 소켓이 준비되면 대기 중인 프로세스를 깨웁니다.',
    },
    {
        label: '유저 공간 전달',
        description:
            '프로세스가 recv() 시스템 콜을 호출하면 커널이 receive queue에서 데이터를 사용자 버퍼로 복사합니다 (copy_to_user).',
    },
]

type FlowZone = 'nic' | 'kernel' | 'socket'

interface FlowZoneInfo {
    id: FlowZone
    label: string
    sublabel: string
    activeStep: number[]
    color: string
    activeColor: string
    border: string
    activeBorder: string
}

function getFlowZones(isDark: boolean): FlowZoneInfo[] {
    return [
        {
            id: 'nic',
            label: 'NIC / 드라이버',
            sublabel: 'DMA, NAPI, netif_receive_skb',
            activeStep: [0],
            color: isDark ? '#1c1a0e' : '#f3f4f6',
            activeColor: isDark ? '#451a03' : '#fef3c7',
            border: isDark ? '#374151' : '#d1d5db',
            activeBorder: '#f59e0b',
        },
        {
            id: 'kernel',
            label: '커널 네트워크 스택',
            sublabel: 'L2 → L3 → L4',
            activeStep: [0, 1, 2, 3],
            color: isDark ? '#0f172a' : '#f3f4f6',
            activeColor: isDark ? '#1e1b4b' : '#e0e7ff',
            border: isDark ? '#374151' : '#d1d5db',
            activeBorder: '#6366f1',
        },
        {
            id: 'socket',
            label: '소켓 / 프로세스',
            sublabel: 'receive_queue → copy_to_user',
            activeStep: [4, 5],
            color: isDark ? '#052e16' : '#f3f4f6',
            activeColor: isDark ? '#14532d' : '#dcfce7',
            border: isDark ? '#374151' : '#d1d5db',
            activeBorder: '#22c55e',
        },
    ]
}

interface FlowStepDetail {
    zone: FlowZone
    fn: string
    desc: string
}

const flowStepDetails: FlowStepDetail[] = [
    { zone: 'nic', fn: 'eth_type_trans()', desc: '프로토콜 판별' },
    { zone: 'kernel', fn: 'ip_rcv()', desc: 'checksum, TTL' },
    { zone: 'kernel', fn: 'ip_route_input()', desc: 'FIB 조회' },
    { zone: 'kernel', fn: 'tcp_v4_rcv()', desc: '포트 디멀티플렉싱' },
    { zone: 'socket', fn: 'sk->sk_receive_queue', desc: '수신 큐 추가' },
    { zone: 'socket', fn: 'copy_to_user()', desc: 'recv() 반환' },
]

function NetworkFlowStep({ step }: { step: number }) {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const flowZones = getFlowZones(isDark)
    const detail = flowStepDetails[step]

    return (
        <div className="space-y-3 p-2">
            <div className="grid grid-cols-3 gap-3">
                {flowZones.map((zone) => {
                    const isActive = zone.activeStep.includes(step)
                    return (
                        <div
                            key={zone.id}
                            className="rounded-lg p-3 transition-all duration-300 min-h-[80px] flex flex-col justify-center"
                            style={{
                                background: isActive ? zone.activeColor : zone.color,
                                border: `2px solid ${isActive ? zone.activeBorder : zone.border}`,
                                boxShadow: isActive ? `0 0 16px ${zone.activeBorder}44` : 'none',
                            }}
                        >
                            <div className="text-sm font-bold text-gray-900 dark:text-white text-center">{zone.label}</div>
                            <div className="text-[10px] text-gray-600 dark:text-gray-400 text-center mt-1">{zone.sublabel}</div>
                            {isActive && detail.zone === zone.id && (
                                <div className="mt-2 rounded bg-black/30 px-2 py-1 text-center">
                                    <div className="text-[11px] font-mono text-yellow-700 dark:text-yellow-300">{detail.fn}</div>
                                    <div className="text-[10px] text-gray-700 dark:text-gray-300">{detail.desc}</div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Arrow indicators */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <span
                    className="px-2 py-0.5 rounded font-mono bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-500 text-amber-700 dark:text-amber-200"
                >
                    NIC/드라이버
                </span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded font-mono bg-indigo-100 dark:bg-indigo-950 border border-indigo-300 dark:border-indigo-500 text-indigo-700 dark:text-indigo-200">
                    커널 스택
                </span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded font-mono bg-green-100 dark:bg-green-950 border border-green-300 dark:border-green-500 text-green-700 dark:text-green-200">
                    소켓/프로세스
                </span>
            </div>
        </div>
    )
}

export function NetworkFlowViz() {
    return (
        <AnimatedDiagram
            steps={flowSteps}
            renderStep={(step) => <NetworkFlowStep step={step} />}
            autoPlayInterval={2500}
        />
    )
}

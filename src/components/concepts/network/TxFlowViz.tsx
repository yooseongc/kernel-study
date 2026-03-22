// ─────────────────────────────────────────────────────────────────────────────
// 6.7  TX 경로 시각화 (AnimatedDiagram용 step 컴포넌트)
// ─────────────────────────────────────────────────────────────────────────────
import { AnimatedDiagram } from '../../../components/viz/AnimatedDiagram'

const txSteps = [
    {
        label: 'Step 0: write(fd, buf, len)',
        description:
      '애플리케이션이 시스템 콜을 호출합니다. 유저 공간 데이터가 커널로 진입하는 시작점입니다.',
    },
    {
        label: 'Step 1: tcp_sendmsg()',
        description:
      'TCP 레이어에서 sk_buff를 할당하고 MSS(Maximum Segment Size) 단위로 데이터를 분할합니다. TCP 헤더와 체크섬을 계산합니다.',
    },
    {
        label: 'Step 2: ip_queue_xmit() → ip_output()',
        description:
      '라우팅 테이블(FIB)을 조회하여 출력 인터페이스를 결정합니다. IP 헤더(TTL, 프로토콜 등)를 sk_buff 앞에 추가합니다.',
    },
    {
        label: 'Step 3: dev_queue_xmit() → qdisc',
        description:
      '드라이버 큐(qdisc)에 sk_buff를 넣습니다. pfifo_fast나 HTB 같은 qdisc가 전송 순서와 속도를 제어합니다.',
    },
    {
        label: 'Step 4: NIC 전송 완료',
        description:
      'NIC가 DMA로 sk_buff 데이터를 읽어 실제 패킷을 송출합니다. 전송 완료 후 TX 인터럽트가 발생하고 dev_kfree_skb()로 메모리를 해제합니다.',
    },
]

type TxZone = 'app' | 'driver' | 'nic'

interface TxZoneInfo {
  id: TxZone
  label: string
  sublabel: string
  activeStep: number[]
  color: string
  activeColor: string
  border: string
  activeBorder: string
}

const txZones: TxZoneInfo[] = [
    {
        id: 'app',
        label: '애플리케이션 / TCP-IP',
        sublabel: 'write() → tcp_sendmsg() → ip_output()',
        activeStep: [0, 1, 2],
        color: '#0f1a2e',
        activeColor: '#1e3a5f',
        border: '#374151',
        activeBorder: '#3b82f6',
    },
    {
        id: 'driver',
        label: '드라이버 / qdisc',
        sublabel: 'dev_queue_xmit() → pfifo_fast',
        activeStep: [3],
        color: '#1a1a0e',
        activeColor: '#451a03',
        border: '#374151',
        activeBorder: '#f59e0b',
    },
    {
        id: 'nic',
        label: 'NIC 하드웨어',
        sublabel: 'DMA → 패킷 송출 → TX IRQ',
        activeStep: [4],
        color: '#1a0e0e',
        activeColor: '#450a0a',
        border: '#374151',
        activeBorder: '#ef4444',
    },
]

interface TxStepDetail {
  zone: TxZone
  fn: string
  desc: string
}

const txStepDetails: TxStepDetail[] = [
    { zone: 'app', fn: 'write() syscall', desc: '유저→커널 진입' },
    { zone: 'app', fn: 'tcp_sendmsg()', desc: 'sk_buff 생성, MSS 분할' },
    { zone: 'app', fn: 'ip_queue_xmit()', desc: 'IP 헤더 추가, 라우팅' },
    { zone: 'driver', fn: 'dev_queue_xmit()', desc: 'qdisc 큐잉' },
    { zone: 'nic', fn: 'dev_kfree_skb()', desc: 'TX 완료, 메모리 해제' },
]

function TxFlowStep({ step }: { step: number }) {
    const detail = txStepDetails[step]

    return (
        <div className="space-y-3 p-2">
            <div className="grid grid-cols-3 gap-3">
                {txZones.map((zone) => {
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
                            <div className="text-sm font-bold text-white text-center">{zone.label}</div>
                            <div className="text-[10px] text-gray-400 text-center mt-1">{zone.sublabel}</div>
                            {isActive && detail.zone === zone.id && (
                                <div className="mt-2 rounded bg-black/30 px-2 py-1 text-center">
                                    <div className="text-[11px] font-mono text-yellow-300">{detail.fn}</div>
                                    <div className="text-[10px] text-gray-300">{detail.desc}</div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <span
                    className="px-2 py-0.5 rounded font-mono"
                    style={{ background: '#1e3a5f', border: '1px solid #3b82f6', color: '#bfdbfe' }}
                >
          앱/TCP-IP
                </span>
                <span>→</span>
                <span
                    className="px-2 py-0.5 rounded font-mono"
                    style={{ background: '#451a03', border: '1px solid #f59e0b', color: '#fde68a' }}
                >
          드라이버/qdisc
                </span>
                <span>→</span>
                <span
                    className="px-2 py-0.5 rounded font-mono"
                    style={{ background: '#450a0a', border: '1px solid #ef4444', color: '#fecaca' }}
                >
          NIC 하드웨어
                </span>
            </div>
        </div>
    )
}

export function TxFlowViz() {
    return (
        <AnimatedDiagram
            steps={txSteps}
            renderStep={(step) => <TxFlowStep step={step} />}
            autoPlayInterval={2500}
        />
    )
}

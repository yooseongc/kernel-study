import { useCallback } from 'react'
import { CodeBlock } from '../../components/viz/CodeBlock'
import { D3Container } from '../../components/viz/D3Container'
import { AnimatedDiagram } from '../../components/viz/AnimatedDiagram'
import { useTheme } from '../../hooks/useTheme'
import * as d3 from 'd3'
import { themeColors } from '../../lib/colors'
import { T } from '../../components/ui/GlossaryTooltip'
import { Section } from '../../components/ui/Section'
import { Prose } from '../../components/ui/Prose'
import { LearningCard } from '../../components/ui/LearningCard'

// ─────────────────────────────────────────────────────────────────────────────
// 5.2  IRQ 처리 흐름 — AnimatedDiagram 시각화 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

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

function IRQViz({ step }: { step: number }) {
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
                            {showArrow && (
                                <div className="text-gray-400 text-2xl font-bold select-none">→</div>
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

// ─────────────────────────────────────────────────────────────────────────────
// 5.4  Deferred Work 계층 D3 시각화
// ─────────────────────────────────────────────────────────────────────────────

interface DeferredStage {
  title: string
  sub: string
  items: string[]
  fill: string
  stroke: string
  titleColor: string
}

function buildDeferredStages(isDark: boolean): DeferredStage[] {
    const c = themeColors(isDark)
    return [
        {
            title: '하드웨어 인터럽트',
            sub: 'Top Half (ISR)',
            items: ['IRQ 핸들러', 'ACK 전송', '데이터 복사', 'NAPI 스케줄'],
            fill: c.redFill,
            stroke: c.redStroke,
            titleColor: c.redText,
        },
        {
            title: 'Softirq / Tasklet',
            sub: 'Bottom Half (softirq ctx)',
            items: ['NET_RX_SOFTIRQ', 'NET_TX_SOFTIRQ', 'TIMER_SOFTIRQ', 'Tasklet'],
            fill: c.amberFill,
            stroke: c.amberStroke,
            titleColor: c.amberText,
        },
        {
            title: 'Workqueue',
            sub: 'Bottom Half (process ctx)',
            items: ['system_wq', 'system_long_wq', 'RT workqueue', 'sleep 가능'],
            fill: c.blueFill,
            stroke: c.blueStroke,
            titleColor: c.blueText,
        },
    ]
}

function renderDeferredWorkFlow(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number,
    isDark: boolean,
) {
    const c = themeColors(isDark)
    const textFill = c.text
    const subFill = c.textMuted
    const arrowColor = c.textMuted
    const labelColor = c.textMuted

    const PAD = 24
    const GAP = 40
    const boxW = Math.floor((width - PAD * 2 - GAP * 2) / 3)
    const boxH = 148
    const boxY = Math.floor((height - boxH) / 2)

    const stages = buildDeferredStages(isDark)

    const defs = svg.append('defs')
    defs
        .append('marker')
        .attr('id', 'dw-arrow')
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 9)
        .attr('refY', 5)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')
        .attr('fill', arrowColor)

    stages.forEach((s, i) => {
        const x = PAD + i * (boxW + GAP)

        svg
            .append('rect')
            .attr('x', x)
            .attr('y', boxY)
            .attr('width', boxW)
            .attr('height', boxH)
            .attr('rx', 10)
            .attr('fill', s.fill)
            .attr('stroke', s.stroke)
            .attr('stroke-width', 1.5)

        svg
            .append('text')
            .attr('x', x + boxW / 2)
            .attr('y', boxY + 22)
            .attr('text-anchor', 'middle')
            .attr('fill', s.titleColor)
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .attr('font-family', 'sans-serif')
            .text(s.title)

        svg
            .append('text')
            .attr('x', x + boxW / 2)
            .attr('y', boxY + 38)
            .attr('text-anchor', 'middle')
            .attr('fill', subFill)
            .attr('font-size', '9px')
            .attr('font-family', 'monospace')
            .text(s.sub)

        svg
            .append('line')
            .attr('x1', x + 12)
            .attr('x2', x + boxW - 12)
            .attr('y1', boxY + 47)
            .attr('y2', boxY + 47)
            .attr('stroke', s.stroke)
            .attr('stroke-width', 0.8)
            .attr('opacity', 0.5)

        s.items.forEach((item, ii) => {
            svg
                .append('text')
                .attr('x', x + 14)
                .attr('y', boxY + 64 + ii * 19)
                .attr('fill', textFill)
                .attr('font-size', '10px')
                .attr('font-family', 'monospace')
                .text(`• ${item}`)
        })

        if (i < stages.length - 1) {
            const ax1 = x + boxW + 4
            const ax2 = x + boxW + GAP - 4
            const ay = boxY + boxH / 2

            svg
                .append('line')
                .attr('x1', ax1)
                .attr('y1', ay)
                .attr('x2', ax2)
                .attr('y2', ay)
                .attr('stroke', arrowColor)
                .attr('stroke-width', 1.5)
                .attr('marker-end', 'url(#dw-arrow)')

            svg
                .append('text')
                .attr('x', (ax1 + ax2) / 2)
                .attr('y', ay - 8)
                .attr('text-anchor', 'middle')
                .attr('fill', labelColor)
                .attr('font-size', '9px')
                .attr('font-family', 'sans-serif')
                .text('스케줄링')
        }
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// Code snippets
// ─────────────────────────────────────────────────────────────────────────────

const topBottomHalfCode = `/* Top Half — NIC 인터럽트 핸들러 (간략화) */
irqreturn_t e1000_intr(int irq, void *data) {
    struct e1000_adapter *adapter = data;

    /* 1. 인터럽트 ACK (장치에 신호 처리 완료 알림) */
    E1000_WRITE_REG(&adapter->hw, ICR, icr);

    /* 2. NAPI 스케줄 — rx 처리를 Bottom Half로 예약 */
    if (napi_schedule_prep(&adapter->napi))
        __napi_schedule(&adapter->napi);

    return IRQ_HANDLED;  /* Top Half 종료 */
}

/* Bottom Half — NAPI poll (softirq 컨텍스트) */
int e1000_clean(struct napi_struct *napi, int budget) {
    /* 실제 패킷 처리, netif_receive_skb() 호출 등 */
    ...
}`

const threadedIrqCode = `/* Threaded IRQ 등록 */
ret = request_threaded_irq(
    irq,
    my_irq_handler,        /* Top Half: 빠른 확인, IRQ_WAKE_THREAD 반환 */
    my_thread_handler,     /* Bottom Half: 커널 스레드에서 실행 */
    IRQF_SHARED,
    "my_device",
    dev
);

/* Top Half — 가능한 짧게 */
static irqreturn_t my_irq_handler(int irq, void *dev_id)
{
    struct my_dev *dev = dev_id;

    /* 이 장치의 인터럽트인지 확인 */
    if (!(readl(dev->base + STATUS) & IRQ_FLAG))
        return IRQ_NONE;

    /* 하드웨어 인터럽트 clear */
    writel(IRQ_FLAG, dev->base + STATUS);

    /* 스레드 핸들러 깨우기 */
    return IRQ_WAKE_THREAD;
}

/* Thread Handler — 슬립 가능 */
static irqreturn_t my_thread_handler(int irq, void *dev_id)
{
    struct my_dev *dev = dev_id;

    /* mutex 사용 가능, 슬립 가능 */
    mutex_lock(&dev->lock);
    process_data(dev);         /* 시간이 걸려도 OK */
    mutex_unlock(&dev->lock);

    return IRQ_HANDLED;
}`

const threadedIrqCheckCode = `# irq 스레드 목록 확인
ps aux | grep "irq/"
# 예: irq/16-ahci  irq/27-eth0  irq/29-xhci_hcd

# 스레드 우선순위 조정 (RT 우선순위 50으로)
chrt -f -p 50 $(pgrep "irq/27-eth0")

# 또는 /proc/irq/<n>/... 으로 확인
cat /proc/irq/27/actions   # eth0`

const irqAffinityCode = `# 현재 IRQ 분포 확인
cat /proc/interrupts

# IRQ 27번을 CPU 2번에 고정 (비트마스크: 0x4 = CPU2)
echo 4 > /proc/irq/27/smp_affinity

# CPU 0,1에 IRQ 분산 허용 (비트마스크: 0x3 = CPU0+CPU1)
echo 3 > /proc/irq/27/smp_affinity

# irqbalance 데몬: 자동으로 IRQ를 코어에 분산
systemctl start irqbalance

# NIC 큐별 IRQ 어피니티 자동 설정 스크립트
set_irq_affinity.sh eth0`

const hrtimerCode = `/* hrtimer 예제 */
struct hrtimer my_timer;

enum hrtimer_restart my_callback(struct hrtimer *timer) {
    /* 타이머 만료 시 호출 */
    do_something();

    /* 다음 만료: 지금으로부터 10ms 후 */
    hrtimer_forward_now(timer, ms_to_ktime(10));
    return HRTIMER_RESTART;  /* 반복 */
}

void setup_timer(void) {
    hrtimer_init(&my_timer, CLOCK_MONOTONIC, HRTIMER_MODE_REL);
    my_timer.function = my_callback;
    hrtimer_start(&my_timer, ms_to_ktime(10), HRTIMER_MODE_REL);
}`

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedDiagram steps
// ─────────────────────────────────────────────────────────────────────────────

const irqSteps = [
    {
        label: '① 장치 → IRQ 신호',
        description: 'NIC 등 장치가 패킷 수신 후 IRQ 라인에 신호 전송',
    },
    {
        label: '② CPU: IRQ 감지, 인터럽트 비활성화',
        description: 'CPU가 EFLAGS.IF=0 설정. 현재 명령어 완료 후 현재 컨텍스트 저장',
    },
    {
        label: '③ IDT → ISR 조회',
        description: 'Interrupt Descriptor Table에서 IRQ 번호로 ISR(Interrupt Service Routine) 주소 조회',
    },
    {
        label: '④ Top Half 실행 (ISR)',
        description: '최소한의 작업만 (ACK 전송, 데이터 복사). 가능한 한 빠르게 종료',
    },
    {
        label: '⑤ Softirq/Tasklet 스케줄',
        description: '나머지 처리를 Bottom Half에 예약. EFLAGS.IF=1 (인터럽트 재활성화)',
    },
    {
        label: '⑥ Bottom Half 처리',
        description: '스케줄러가 적절한 시점에 softirq/workqueue 실행',
    },
]

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI helpers
// ─────────────────────────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
    return (
        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-800/60">
            {children}
        </th>
    )
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
    return (
        <td
            className={`px-3 py-2 text-sm text-gray-300 border-t border-gray-700/50 ${mono ? 'font-mono text-xs' : ''}`}
        >
            {children}
        </td>
    )
}

function SubTitle({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-base font-semibold text-gray-200 mb-3 mt-6">{children}</h3>
    )
}

type BadgeColor = 'blue' | 'red' | 'amber' | 'green' | 'purple'

function Badge({ children, color = 'blue' }: { children: React.ReactNode; color?: BadgeColor }) {
    const map: Record<BadgeColor, string> = {
        blue: 'bg-blue-900/40 text-blue-300 border-blue-700/50',
        red: 'bg-red-900/40 text-red-300 border-red-700/50',
        amber: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
        green: 'bg-green-900/40 text-green-300 border-green-700/50',
        purple: 'bg-purple-900/40 text-purple-300 border-purple-700/50',
    }
    return (
        <span
            className={`inline-block text-xs font-mono px-2 py-0.5 rounded border ${map[color]}`}
        >
            {children}
        </span>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.9  IRQ Coalescing — coalescing 파라미터 카드 및 트레이드오프 데이터
// ─────────────────────────────────────────────────────────────────────────────

const coalescingParams = [
    {
        name: 'rx-usecs',
        dir: 'RX',
        default: '50–100 μs',
        color: 'border-blue-700/60',
        titleColor: 'text-blue-300',
        desc: 'RX 인터럽트 합치기 시간(μs). 낮추면 레이턴시↓ 처리량↓, 높이면 레이턴시↑ 처리량↑',
    },
    {
        name: 'rx-frames',
        dir: 'RX',
        default: '0 (비활성)',
        color: 'border-cyan-700/60',
        titleColor: 'text-cyan-300',
        desc: 'N개 프레임이 쌓이면 인터럽트 발생. rx-usecs와 OR 조건으로 동작',
    },
    {
        name: 'tx-usecs',
        dir: 'TX',
        default: '50 μs',
        color: 'border-amber-700/60',
        titleColor: 'text-amber-300',
        desc: 'TX 완료 인터럽트 합치기 시간. 송신 처리량 최적화에 사용',
    },
    {
        name: 'tx-frames',
        dir: 'TX',
        default: '0 (비활성)',
        color: 'border-orange-700/60',
        titleColor: 'text-orange-300',
        desc: 'TX 방향 프레임 수 기준 인터럽트. tx-usecs와 OR 조건',
    },
    {
        name: 'adaptive-rx',
        dir: 'RX',
        default: 'on (지원 시)',
        color: 'border-green-700/60',
        titleColor: 'text-green-300',
        desc: '드라이버가 트래픽 패턴을 분석해 coalescing 값을 자동 조정 (Intel ixgbe 등 지원)',
    },
]

const coalescingTradeoff = [
    { usecs: 0, label: '0 μs', throughput: 20, latency: 5 },
    { usecs: 50, label: '50 μs', throughput: 55, latency: 30 },
    { usecs: 200, label: '200 μs', throughput: 75, latency: 55 },
    { usecs: 500, label: '500 μs', throughput: 88, latency: 75 },
    { usecs: 1000, label: '1000 μs', throughput: 96, latency: 92 },
]

const irqCoalescingCode = `# 현재 coalescing 설정 확인
ethtool -c eth0
# Coalesce parameters for eth0:
# Adaptive RX: on  TX: on
# rx-usecs: 50    rx-frames: 0
# tx-usecs: 50    tx-frames: 0

# 저레이턴시 설정 (HFT, 실시간 게임)
ethtool -C eth0 rx-usecs 0 rx-frames 1

# 고처리량 설정 (스트리밍, 파일 전송)
ethtool -C eth0 rx-usecs 1000 rx-frames 256

# Adaptive coalescing 활성화
ethtool -C eth0 adaptive-rx on adaptive-tx on

# NAPI poll 통계 확인
cat /proc/net/softnet_stat
# 열 1: 처리된 패킷 수
# 열 2: 드롭된 패킷 수 (budget 소진)
# 열 3: throttled 횟수 (CPU 과부하)

# IRQ 분배 확인 (RPS/RFS)
cat /proc/irq/*/smp_affinity`

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function Topic04() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const renderDeferredWork = useCallback(
        (
            svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
            width: number,
            height: number,
        ) => {
            renderDeferredWorkFlow(svg, width, height, isDark)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [theme],
    )

    return (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">
            <header className="space-y-3">
                <p className="text-xs font-mono text-blue-500 dark:text-blue-400 uppercase tracking-widest">
                    Topic 05
                </p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    인터럽트, 예외, Deferred Work
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    Interrupts, Exceptions &amp; Deferred Work
                </p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                    IRQ 처리, Top/Bottom Half, Softirq, Tasklet, Workqueue, hrtimer, Threaded IRQ
                </p>
            </header>

            <LearningCard
                topicId="05-interrupts"
                items={[
                    '하드웨어 인터럽트와 예외의 차이, IRQ 처리 흐름 전체를 이해합니다',
                    'Top Half/Bottom Half 분리로 인터럽트 지연을 최소화하는 설계를 배웁니다',
                    'Softirq, Tasklet, Workqueue의 차이와 적절한 사용 시나리오를 파악합니다',
                ]}
            />

            <Section id="s551" title="5.1  인터럽트와 예외의 차이">

                <Prose>
                    <strong className="text-gray-200">인터럽트(Interrupt)</strong>는 NIC, 키보드, 타이머 등
          외부 장치가 CPU에 보내는 비동기 신호입니다. 반면{' '}
                    <strong className="text-gray-200">예외(Exception)</strong>는 CPU가 명령어를 실행하는
          도중 내부에서 발생하는 동기적 이벤트입니다 (page fault, divide-by-zero 등).
                </Prose>

                <div className="rounded-xl overflow-hidden border border-gray-700 mb-6">
                    <table className="w-full">
                        <thead>
                            <tr>
                                <Th>구분</Th>
                                <Th>인터럽트</Th>
                                <Th>예외</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {(
                [
                    ['발생 원인', '외부 장치 (NIC, 키보드, 타이머)', 'CPU 내부 (page fault, divide-by-zero)'],
                    ['동기성', '비동기 (언제든 발생)', '동기 (명령어 실행 중 발생)'],
                    ['처리 후', '중단된 코드로 복귀', '복구 가능 / SIGSEGV 등'],
                    ['예시', 'IRQ #9 (NIC), IRQ #0 (타이머)', '#PF (page fault), #GP (general protection)'],
                ] as [string, string, string][]
                            ).map(([label, intCol, excCol]) => (
                                <tr key={label}>
                                    <Td>
                                        <span className="font-semibold text-gray-300">{label}</span>
                                    </Td>
                                    <Td mono>{intCol}</Td>
                                    <Td mono>{excCol}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <SubTitle>예외 세분화: Fault / Trap / Abort</SubTitle>
                <div className="rounded-xl overflow-hidden border border-gray-700">
                    <table className="w-full">
                        <thead>
                            <tr>
                                <Th>종류</Th>
                                <Th>설명</Th>
                                <Th>복귀 위치</Th>
                                <Th>대표 예</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {(
                [
                    ['Fault', '복구 가능 — 원인 해결 후 재실행', '오류 발생 명령어 재실행', '#PF, #GP'],
                    ['Trap', '의도된 예외 (디버깅 등)', '다음 명령어로 복귀', '#BP (int3), #DB'],
                    ['Abort', '복구 불가 — 시스템 종료', '복귀 불가', '#DF, MCE'],
                ] as [string, string, string, string][]
                            ).map(([type, desc, ret, ex]) => (
                                <tr key={type}>
                                    <Td>
                                        <Badge
                                            color={
                                                type === 'Fault' ? 'amber' : type === 'Trap' ? 'blue' : 'red'
                                            }
                                        >
                                            {type}
                                        </Badge>
                                    </Td>
                                    <Td>{desc}</Td>
                                    <Td mono>{ret}</Td>
                                    <Td mono>{ex}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>

            <Section id="s552" title="5.2  IRQ 처리 흐름">
                <Prose>
                    <T id="irq">IRQ</T>가 발생하면 CPU는 현재 실행을 잠깐 멈추고 IDT를 통해 ISR을 호출합니다.
          ISR은 가능한 한 빠르게 종료(Top Half)하고, 나머지 처리는 Bottom Half로 예약합니다.
                </Prose>
                <AnimatedDiagram
                    steps={irqSteps}
                    renderStep={(step) => <IRQViz step={step} />}
                    autoPlayInterval={2200}
                />
            </Section>

            <Section id="s553" title="5.3  Top Half / Bottom Half">
                <Prose>
          인터럽트 처리는 두 단계로 분리됩니다.{' '}
                    <strong className="text-gray-200">Top Half</strong>는 <T id="irq">IRQ</T> 발생 직후 인터럽트가
          비활성화된 상태에서 최소한의 작업(ACK, 데이터 복사)만 수행합니다.{' '}
                    <strong className="text-gray-200">Bottom Half</strong>는 인터럽트를 재활성화한 뒤
          나머지 무거운 처리(프로토콜 스택, 패킷 분류 등)를 수행합니다.
                </Prose>

                <div className="rounded-xl overflow-hidden border border-gray-700 mb-6">
                    <table className="w-full">
                        <thead>
                            <tr>
                                <Th>항목</Th>
                                <Th>Top Half</Th>
                                <Th>Bottom Half</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {(
                [
                    ['실행 시점', 'IRQ 발생 즉시', '나중에 (인터럽트 활성화 상태)'],
                    ['인터럽트 상태', '비활성화', '활성화'],
                    ['실행 시간', '최소 (수 µs)', '상대적으로 길어도 됨'],
                    ['컨텍스트', '인터럽트 컨텍스트 (sleep 불가)', '다양 (workqueue는 sleep 가능)'],
                    ['목적', 'ACK, 데이터 복사', '프로토콜 처리, 네트워크 스택'],
                ] as [string, string, string][]
                            ).map(([label, top, bot]) => (
                                <tr key={label}>
                                    <Td>
                                        <span className="font-semibold text-gray-300">{label}</span>
                                    </Td>
                                    <Td mono>{top}</Td>
                                    <Td mono>{bot}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <CodeBlock
                    code={topBottomHalfCode}
                    language="c"
                    filename="drivers/net/ethernet/intel/e1000/e1000_main.c"
                />
            </Section>

            <Section id="s554" title="5.4  Softirq, Tasklet, Workqueue 비교">
                <Prose>
          Bottom Half 메커니즘은 요구사항(컨텍스트, sleep 가능 여부, 우선순위)에 따라
                    <T id="softirq">Softirq</T>, <T id="tasklet">Tasklet</T>, <T id="workqueue">Workqueue</T> 세 가지로 구분됩니다. 네트워크 RX/TX처럼 성능이 중요한
          경로는 <T id="softirq">Softirq</T>, 드라이버의 일반 지연 처리는 <T id="tasklet">Tasklet</T>, 파일시스템 등 sleep이 필요한
          작업은 <T id="workqueue">Workqueue</T>를 사용합니다.
                </Prose>

                <div className="rounded-xl overflow-hidden border border-gray-700 mb-6">
                    <table className="w-full">
                        <thead>
                            <tr>
                                <Th>메커니즘</Th>
                                <Th>컨텍스트</Th>
                                <Th>sleep 가능</Th>
                                <Th>우선순위</Th>
                                <Th>주요 용도</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {(
                                [
                                    {
                                        name: 'Softirq',
                                        ctx: 'softirq',
                                        sleep: '불가',
                                        prio: '높음',
                                        use: '네트워크 RX/TX, 타이머',
                                        color: 'red' as BadgeColor,
                                    },
                                    {
                                        name: 'Tasklet',
                                        ctx: 'softirq (직렬화)',
                                        sleep: '불가',
                                        prio: '중간',
                                        use: '드라이버 Bottom Half',
                                        color: 'amber' as BadgeColor,
                                    },
                                    {
                                        name: 'Workqueue (system)',
                                        ctx: '프로세스',
                                        sleep: '가능',
                                        prio: '낮음',
                                        use: '지연 작업, 파일시스템',
                                        color: 'blue' as BadgeColor,
                                    },
                                    {
                                        name: 'Workqueue (RT)',
                                        ctx: 'RT 프로세스',
                                        sleep: '가능',
                                        prio: '높음',
                                        use: '실시간 커널 스레드',
                                        color: 'blue' as BadgeColor,
                                    },
                                ]
                            ).map((r) => (
                                <tr key={r.name}>
                                    <Td>
                                        <Badge color={r.color}>{r.name}</Badge>
                                    </Td>
                                    <Td mono>{r.ctx}</Td>
                                    <Td>
                                        <span
                                            className={
                                                r.sleep === '불가' ? 'text-red-400 text-xs' : 'text-green-400 text-xs'
                                            }
                                        >
                                            {r.sleep}
                                        </span>
                                    </Td>
                                    <Td>{r.prio}</Td>
                                    <Td>{r.use}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <SubTitle>Softirq 우선순위 (벡터 번호 순)</SubTitle>
                <div className="rounded-xl overflow-hidden border border-gray-700 mb-6">
                    <table className="w-full">
                        <thead>
                            <tr>
                                <Th>번호</Th>
                                <Th>이름</Th>
                                <Th>설명</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {(
                [
                    [0, 'HI_SOFTIRQ', '가장 높은 우선순위, tasklet_hi'],
                    [1, 'TIMER_SOFTIRQ', '타이머 만료 처리'],
                    [2, 'NET_TX_SOFTIRQ', '네트워크 패킷 송신'],
                    [3, 'NET_RX_SOFTIRQ', '네트워크 패킷 수신 (NAPI)'],
                    [4, 'BLOCK_SOFTIRQ', '블록 I/O 완료'],
                    [5, 'IRQ_POLL_SOFTIRQ', 'I/O 폴링'],
                    [6, 'TASKLET_SOFTIRQ', '일반 tasklet'],
                    [7, 'SCHED_SOFTIRQ', '스케줄러 (load balancing)'],
                    [8, 'HRTIMER_SOFTIRQ', '고해상도 타이머 (deprecated)'],
                    [9, 'RCU_SOFTIRQ', 'RCU 콜백 처리'],
                ] as [number, string, string][]
                            ).map(([num, name, desc]) => (
                                <tr key={num}>
                                    <Td>
                                        <span className="font-mono text-amber-400">{num}</span>
                                    </Td>
                                    <Td mono>{name}</Td>
                                    <Td>{desc}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <SubTitle>Deferred Work 계층 흐름</SubTitle>
                <D3Container renderFn={renderDeferredWork} height={200} deps={[theme]} />
            </Section>

            <Section id="s555" title="5.5  타이머와 비동기 처리">

                <Prose>
          리눅스 커널은 두 가지 타이머 시스템을 제공합니다. jiffies 기반의 저해상도 타이머와
          HPET/TSC를 사용하는 고해상도 hrtimer입니다.
                </Prose>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {(
                        [
                            {
                                title: 'jiffies',
                                color: 'border-gray-600',
                                titleColor: 'text-gray-300',
                                points: [
                                    '부팅 이후 틱(tick) 횟수',
                                    'CONFIG_HZ=250 → 4ms 해상도',
                                    'CONFIG_HZ=1000 → 1ms 해상도',
                                    '낮은 해상도 타이머에 사용',
                                ],
                            },
                            {
                                title: 'hrtimer',
                                color: 'border-blue-700/60',
                                titleColor: 'text-blue-300',
                                points: [
                                    '나노초 단위 고해상도',
                                    'HPET / TSC 하드웨어 기반',
                                    'ktime_t 타입 사용',
                                    'sleep, nanosleep 내부 사용',
                                ],
                            },
                            {
                                title: 'Timer Wheel',
                                color: 'border-amber-700/60',
                                titleColor: 'text-amber-300',
                                points: [
                                    '낮은 해상도 타이머 관리',
                                    '계층적 버킷 구조',
                                    'O(1) 삽입/삭제',
                                    'jiffies 기반 만료 관리',
                                ],
                            },
                        ]
                    ).map((card) => (
                        <div
                            key={card.title}
                            className={`rounded-xl border ${card.color} bg-gray-900/50 p-4`}
                        >
                            <div className={`font-bold text-sm mb-3 ${card.titleColor}`}>{card.title}</div>
                            <ul className="space-y-1">
                                {card.points.map((p) => (
                                    <li key={p} className="text-xs text-gray-400 flex gap-2">
                                        <span className="text-gray-600">·</span>
                                        {p}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <CodeBlock
                    code={hrtimerCode}
                    language="c"
                    filename="kernel/hrtimer_example.c"
                />
            </Section>

            <Section id="s556" title="5.6  Threaded IRQ — 인터럽트의 스레드화">

                <Prose>
          전통적인 Bottom Half(<T id="softirq">Softirq</T>/<T id="tasklet">Tasklet</T>)는 인터럽트 컨텍스트에서 실행되어 슬립이
          불가합니다. Linux 2.6.30부터 도입된{' '}
                    <strong className="text-gray-200">Threaded IRQ</strong>는 핸들러를 전용 커널
          스레드로 실행해 슬립 가능하고 우선순위를 조정할 수 있습니다.
                </Prose>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 mb-6">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                        <div className="text-sm font-bold text-gray-200 mb-3">전통적 방식</div>
                        <ul className="space-y-1">
                            {[
                                '하드웨어 인터럽트 → request_irq() 핸들러',
                                '인터럽트 컨텍스트 (슬립 불가)',
                                '우선순위 조정 불가',
                                '긴 처리는 workqueue로 defer',
                            ].map((p) => (
                                <li key={p} className="text-xs text-gray-400 flex gap-2">
                                    <span className="text-gray-600">·</span>
                                    {p}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-gray-800 rounded-xl border border-blue-700/50 p-4">
                        <div className="text-sm font-bold text-blue-300 mb-3"><T id="threaded_irq">Threaded IRQ</T> (현대)</div>
                        <ul className="space-y-1">
                            {[
                                '하드웨어 인터럽트 → 빠른 top-half 확인',
                                'irq/<n>-<name> 커널 스레드로 bottom-half 실행',
                                '슬립 가능 (mutex 사용 가능)',
                                'nice/RT 우선순위 조정 가능',
                                'PREEMPT_RT 커널과 완벽 호환',
                            ].map((p) => (
                                <li key={p} className="text-xs text-gray-400 flex gap-2">
                                    <span className="text-blue-600">·</span>
                                    {p}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <CodeBlock
                    code={threadedIrqCode}
                    language="c"
                    filename="drivers/my_driver.c"
                />

                <SubTitle>Threaded IRQ 스레드 확인</SubTitle>
                <CodeBlock
                    code={threadedIrqCheckCode}
                    language="bash"
                    filename="# 실전 확인"
                />
            </Section>

            <Section id="s557" title="5.7  인터럽트 어피니티 — CPU 코어 배정">

                <Prose>
          특정 NIC의 인터럽트를 항상 같은 CPU가 처리하면 캐시 효율이 높아집니다.{' '}
                    <code className="font-mono text-blue-300 text-xs">/proc/irq/&lt;n&gt;/smp_affinity</code>로
          어느 CPU 코어가 해당 <T id="irq">IRQ</T>를 처리할지 지정할 수 있습니다.
                </Prose>

                <CodeBlock
                    code={irqAffinityCode}
                    language="bash"
                    filename="# IRQ 어피니티 설정"
                />

                <SubTitle>어피니티 전략</SubTitle>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        {
                            title: '단일 CPU 고정',
                            color: 'border-gray-600',
                            titleColor: 'text-gray-300',
                            desc: '캐시 친화성 극대화. 단일 고성능 서버에서 특정 NIC 전용으로 배정할 때 사용합니다.',
                        },
                        {
                            title: 'CPU 분산',
                            color: 'border-blue-700/60',
                            titleColor: 'text-blue-300',
                            desc: 'IRQ를 여러 CPU에 나눠 처리. 대용량 트래픽 서버에서 병목을 줄이는 전략입니다.',
                        },
                        {
                            title: 'NUMA 인식',
                            color: 'border-amber-700/60',
                            titleColor: 'text-amber-300',
                            desc: 'IRQ를 NIC와 같은 NUMA 노드 CPU에 배정해 PCIe 버스 지역성을 유지합니다.',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className={`rounded-xl border ${card.color} bg-gray-900/50 p-4`}
                        >
                            <div className={`font-bold text-sm mb-2 ${card.titleColor}`}>{card.title}</div>
                            <p className="text-xs text-gray-400 leading-relaxed">{card.desc}</p>
                        </div>
                    ))}
                </div>
            </Section>

            <Section id="s558" title="5.8  PREEMPT_RT — 실시간 리눅스 커널">

                <Prose>
          표준 Linux 커널은 일부 경우 인터럽트를 비활성화하거나 스핀락을 보유한 채
          선점 불가 구간이 존재합니다.{' '}
                    <strong className="text-gray-200">PREEMPT_RT 패치</strong>는 이런 구간을 최소화해
          최악 지연(worst-case latency)을 수십 마이크로초 이내로 줄입니다. 산업용 로봇,
          오디오 처리, 자동차 제어 시스템에서 사용됩니다.
                </Prose>

                <SubTitle>핵심 변경사항</SubTitle>
                <div className="rounded-xl overflow-hidden border border-gray-700 mb-6">
                    <table className="w-full">
                        <thead>
                            <tr>
                                <Th>기능</Th>
                                <Th>일반 커널</Th>
                                <Th>PREEMPT_RT</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {(
                [
                    ['spinlock', '선점 불가 바쁜 대기', 'rt_mutex 기반 (슬립 가능)'],
                    ['인터럽트 핸들러', '하드 IRQ 컨텍스트', 'Threaded IRQ (kthread)'],
                    ['softirq', '인터럽트 컨텍스트', 'ksoftirqd 스레드로 분리'],
                    ['타이머', '인터럽트 컨텍스트', 'hrtimer 스레드화'],
                    ['최악 지연', '수ms~수십ms', '수십μs 이하'],
                ] as [string, string, string][]
                            ).map(([feat, normal, rt]) => (
                                <tr key={feat}>
                                    <Td>
                                        <span className="font-semibold text-gray-300 font-mono text-xs">{feat}</span>
                                    </Td>
                                    <Td mono>{normal}</Td>
                                    <Td mono>{rt}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <CodeBlock
                    code={`# PREEMPT_RT 커널 확인
uname -v | grep PREEMPT_RT
cat /sys/kernel/realtime  # 1이면 RT 커널

# 실시간 우선순위로 프로세스 실행
chrt -f 99 ./my_realtime_app

# 최악 지연 측정 (cyclictest)
cyclictest -l 10000 -m -n -a 0 -t 1 -p 99 -i 1000
# -p 99: RT 우선순위 99, -i 1000: 1ms 인터벌
# Histogram으로 지연 분포 확인

# 커널 선점성 확인
cat /sys/kernel/debug/sched/preempt  # 선점 통계`}
                    language="bash"
                    filename="# PREEMPT_RT 확인 및 latency 측정"
                />

                <SubTitle>RT 커널 사용 사례</SubTitle>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {[
                        {
                            title: '산업용 제어',
                            color: 'border-red-700/60',
                            titleColor: 'text-red-300',
                            desc: '로봇 팔, CNC 기계 — 1ms 이하 응답 보장, Xenomai/PREEMPT_RT',
                        },
                        {
                            title: '오디오 처리',
                            color: 'border-blue-700/60',
                            titleColor: 'text-blue-300',
                            desc: '전문 DAW (JACK Audio) — 버퍼 언더런 없는 실시간 오디오 처리',
                        },
                        {
                            title: '자동차/항공',
                            color: 'border-amber-700/60',
                            titleColor: 'text-amber-300',
                            desc: 'AUTOSAR Adaptive, 드론 비행 제어 — 결정론적 응답 시간 필수',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className={`bg-gray-800 rounded-xl border ${card.color} p-4`}
                        >
                            <div className={`font-bold text-sm mb-2 ${card.titleColor}`}>{card.title}</div>
                            <p className="text-xs text-gray-400 leading-relaxed">{card.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="rounded-xl border border-amber-700/50 bg-amber-900/10 p-4">
                    <div className="flex items-start gap-3">
                        <span className="text-amber-400 text-sm font-bold mt-0.5">!</span>
                        <p className="text-sm text-amber-200/80 leading-relaxed">
              PREEMPT_RT는 평균 처리량(throughput)을 희생하고 최악 지연을 줄입니다.
              일반 서버에서는 표준 커널이 더 높은 처리량을 제공합니다.
                        </p>
                    </div>
                </div>
            </Section>

            <Section id="s559" title="5.9  IRQ Coalescing — 인터럽트 합치기와 NAPI 폴링">

                <Prose>
          고속 NIC에서 패킷이 초당 수백만 건 수신되면 패킷마다 인터럽트를 발생시킬 경우
          CPU가 인터럽트 처리에만 매몰되는{' '}
                    <strong className="text-gray-200">interrupt storm</strong>이 발생합니다.
          IRQ coalescing은 <strong className="text-gray-200">N개 패킷 또는 T μs마다 한 번</strong>만
          인터럽트를 발생시켜 처리량과 레이턴시를 균형 있게 조절합니다.
                </Prose>

                <SubTitle>NAPI 폴링 모드 동작 흐름</SubTitle>
                <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-5 mb-6 space-y-3">
                    {[
                        {
                            step: '①',
                            color: 'text-blue-400',
                            border: 'border-blue-700/50',
                            text: '첫 패킷 도착 → 인터럽트 발생 → IRQ handler: 인터럽트 비활성화 + softirq 스케줄',
                        },
                        {
                            step: '②',
                            color: 'text-cyan-400',
                            border: 'border-cyan-700/50',
                            text: 'NET_RX_SOFTIRQ 실행 → napi_poll() → 최대 budget(기본 300)개 패킷을 폴링으로 처리',
                        },
                        {
                            step: '③',
                            color: 'text-green-400',
                            border: 'border-green-700/50',
                            text: 'budget 소진 또는 큐가 비면 → 인터럽트 재활성화 → 다음 패킷 대기',
                        },
                    ].map((item) => (
                        <div
                            key={item.step}
                            className={`flex items-start gap-3 rounded-lg border ${item.border} bg-gray-800/60 p-3`}
                        >
                            <span className={`font-bold text-sm shrink-0 ${item.color}`}>{item.step}</span>
                            <p className="text-sm text-gray-300 leading-relaxed">{item.text}</p>
                        </div>
                    ))}
                </div>

                <SubTitle>Coalescing 파라미터</SubTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {coalescingParams.map((p) => (
                        <div
                            key={p.name}
                            className={`rounded-xl border ${p.color} bg-gray-900/50 p-4`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`font-mono font-bold text-sm ${p.titleColor}`}>{p.name}</span>
                                <span className="text-xs text-gray-500 border border-gray-700 rounded px-1.5 py-0.5">{p.dir}</span>
                            </div>
                            <div className="text-xs text-gray-500 mb-2">기본값: {p.default}</div>
                            <p className="text-xs text-gray-400 leading-relaxed">{p.desc}</p>
                        </div>
                    ))}
                </div>

                <SubTitle>레이턴시 vs 처리량 트레이드오프</SubTitle>
                <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-5 mb-6">
                    <div className="flex items-center gap-6 mb-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-3 h-3 rounded-sm bg-blue-500/70"></span>처리량 (높을수록 좋음)
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-3 h-3 rounded-sm bg-red-500/70"></span>레이턴시 (낮을수록 좋음)
                        </span>
                    </div>
                    <div className="space-y-3">
                        {coalescingTradeoff.map((row) => (
                            <div key={row.label} className="grid grid-cols-[80px_1fr] gap-3 items-center">
                                <span className="text-xs font-mono text-gray-400 text-right">{row.label}</span>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="h-3 rounded-sm bg-blue-500/70"
                                            style={{ width: `${row.throughput}%` }}
                                        />
                                        <span className="text-xs text-gray-500">{row.throughput}%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="h-3 rounded-sm bg-red-500/70"
                                            style={{ width: `${row.latency}%` }}
                                        />
                                        <span className="text-xs text-gray-500">{row.latency}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                        * 처리량과 레이턴시는 상대 수치(%). coalescing 시간이 길수록 처리량은 증가하나 레이턴시도 함께 증가합니다.
                    </p>
                </div>

                <CodeBlock
                    code={irqCoalescingCode}
                    language="bash"
                    filename="# IRQ Coalescing 설정 및 NAPI 통계 확인"
                />

                <div className="rounded-xl border border-blue-700/50 bg-blue-900/10 p-4 mt-4">
                    <div className="flex items-start gap-3">
                        <span className="text-blue-400 text-sm font-bold mt-0.5 shrink-0">tip</span>
                        <p className="text-sm text-blue-200/80 leading-relaxed">
                            HFT(초고빈도 거래) 또는 실시간 게임 서버는{' '}
                            <strong className="text-blue-300">rx-usecs 0, rx-frames 1</strong>로
                            인터럽트를 즉시 발생시켜 레이턴시를 최소화합니다.
                            반대로 스트리밍·파일 전송 서버는 rx-usecs 1000 이상으로 설정해
                            CPU 사용률을 낮추고 처리량을 극대화합니다.
                        </p>
                    </div>
                </div>

            </Section>

            <nav className="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 flex items-center justify-between">
                <div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">이전 토픽</div>
                    <a href="#/topic/04-filesystem" className="font-semibold text-gray-900 dark:text-gray-200 text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        ← 04 · VFS와 파일시스템
                    </a>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">다음 토픽</div>
                    <a href="#/topic/06-network-stack" className="font-semibold text-gray-900 dark:text-gray-200 text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        06 · 네트워크 스택의 전체 흐름 →
                    </a>
                </div>
            </nav>
        </div>
    )
}

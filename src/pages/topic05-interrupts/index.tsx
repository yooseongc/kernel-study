import { useCallback } from 'react'
import * as d3 from 'd3'
import { KernelRef } from '../../components/ui/KernelRef'
import { IRQViz } from '../../components/concepts/interrupt/IRQViz'
import { renderDeferredWorkFlow } from '../../components/concepts/interrupt/DeferredWorkFlow'
import * as snippets from './codeSnippets'
import { Alert, AnimatedDiagram, CardGrid, CodeBlock, D3Container, InfoBox, InfoTable, Prose, Section, SubSection, T, TopicPage, useTheme } from '@study-ui/components'
import type { TableColumn } from '@study-ui/components'

// ─────────────────────────────────────────────────────────────────────────────
// Code snippets
// ─────────────────────────────────────────────────────────────────────────────

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

type BadgeColor = 'blue' | 'red' | 'amber' | 'green' | 'purple'

function Badge({ children, color = 'blue' }: { children: React.ReactNode; color?: BadgeColor }) {
    const map: Record<BadgeColor, string> = {
        blue: 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/50',
        red: 'bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700/50',
        amber: 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/50',
        green: 'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700/50',
        purple: 'bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700/50',
    }
    return <span className={`inline-block text-xs px-2 py-0.5 rounded border ${map[color]}`}>{children}</span>
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.9  IRQ Coalescing — coalescing 파라미터 카드 및 트레이드오프 데이터
// ─────────────────────────────────────────────────────────────────────────────

const coalescingParams = [
    {
        name: 'rx-usecs',
        dir: 'RX',
        default: '50–100 μs',
        color: 'border-blue-200 dark:border-blue-700/60',
        titleColor: 'text-blue-700 dark:text-blue-300',
        desc: 'RX 인터럽트 합치기 시간(μs). 낮추면 레이턴시↓ 처리량↓, 높이면 레이턴시↑ 처리량↑',
    },
    {
        name: 'rx-frames',
        dir: 'RX',
        default: '0 (비활성)',
        color: 'border-cyan-200 dark:border-cyan-700/60',
        titleColor: 'text-cyan-700 dark:text-cyan-300',
        desc: 'N개 프레임이 쌓이면 인터럽트 발생. rx-usecs와 OR 조건으로 동작',
    },
    {
        name: 'tx-usecs',
        dir: 'TX',
        default: '50 μs',
        color: 'border-amber-200 dark:border-amber-700/60',
        titleColor: 'text-amber-700 dark:text-amber-300',
        desc: 'TX 완료 인터럽트 합치기 시간. 송신 처리량 최적화에 사용',
    },
    {
        name: 'tx-frames',
        dir: 'TX',
        default: '0 (비활성)',
        color: 'border-orange-200 dark:border-orange-700/60',
        titleColor: 'text-orange-700 dark:text-orange-300',
        desc: 'TX 방향 프레임 수 기준 인터럽트. tx-usecs와 OR 조건',
    },
    {
        name: 'adaptive-rx',
        dir: 'RX',
        default: 'on (지원 시)',
        color: 'border-green-200 dark:border-green-700/60',
        titleColor: 'text-green-700 dark:text-green-300',
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

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function Topic04() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const renderDeferredWork = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => {
            renderDeferredWorkFlow(svg, width, height, isDark)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [theme],
    )

    return (
        <TopicPage topicId="05-interrupts" learningItems={[
                    '하드웨어 인터럽트와 예외의 차이, IRQ 처리 흐름 전체를 이해합니다',
                    'Top Half/Bottom Half 분리로 인터럽트 지연을 최소화하는 설계를 배웁니다',
                    'Softirq, Tasklet, Workqueue의 차이와 적절한 사용 시나리오를 파악합니다',
                ]}>

            <Section id="s551" title="5.1  인터럽트와 예외의 차이">
                <Prose>
                    <strong className="text-gray-800 dark:text-gray-200">인터럽트(Interrupt)</strong>는 NIC, 키보드, 타이머 등 외부 장치가
                    CPU에 보내는 비동기 신호입니다. 반면 <strong className="text-gray-800 dark:text-gray-200">예외(Exception)</strong>는
                    CPU가 명령어를 실행하는 도중 내부에서 발생하는 동기적 이벤트입니다 (<T id="page_fault">page fault</T>, divide-by-zero 등).
                </Prose>

                <InfoTable
                    className="mb-6"
                    headers={[
                        { header: '구분', cellClassName: 'text-gray-800 dark:text-gray-300 font-semibold' },
                        { header: '인터럽트', cellClassName: 'text-gray-700 dark:text-gray-300' },
                        { header: '예외', cellClassName: 'text-gray-700 dark:text-gray-300' },
                    ] satisfies TableColumn[]}
                    rows={[
                        { cells: ['발생 원인', '외부 장치 (NIC, 키보드, 타이머)', 'CPU 내부 (page fault, divide-by-zero)'] },
                        { cells: ['동기성', '비동기 (언제든 발생)', '동기 (명령어 실행 중 발생)'] },
                        { cells: ['처리 후', '중단된 코드로 복귀', '복구 가능 / SIGSEGV 등'] },
                        { cells: ['예시', 'IRQ #9 (NIC), IRQ #0 (타이머)', '#PF (page fault), #GP (general protection)'] },
                    ]}
                />

                <SubSection>예외 세분화: Fault / Trap / Abort</SubSection>
                <InfoTable
                    headers={[
                        { header: '종류', cellClassName: 'text-gray-700 dark:text-gray-300' },
                        { header: '설명', cellClassName: 'text-gray-700 dark:text-gray-300' },
                        { header: '복귀 위치', cellClassName: 'text-gray-700 dark:text-gray-300' },
                        { header: '대표 예', mono: true, cellClassName: 'text-gray-700 dark:text-gray-300' },
                    ] satisfies TableColumn[]}
                    rows={[
                        { cells: [<Badge color="amber" key="f">Fault</Badge>, '복구 가능 — 원인 해결 후 재실행', '오류 발생 명령어 재실행', '#PF, #GP'] },
                        { cells: [<Badge color="blue" key="t">Trap</Badge>, '의도된 예외 (디버깅 등)', '다음 명령어로 복귀', '#BP (int3), #DB'] },
                        { cells: [<Badge color="red" key="a">Abort</Badge>, '복구 불가 — 시스템 종료', '복귀 불가', '#DF, MCE'] },
                    ]}
                />
            </Section>

            <Section id="s552" title="5.2  IRQ 처리 흐름">
                <Prose>
                    <T id="irq">IRQ</T>가 발생하면 CPU는 현재 실행을 잠깐 멈추고 <T id="idt">IDT</T>를 통해 ISR을 호출합니다. ISR은
                    가능한 한 빠르게 종료(Top Half)하고, 나머지 처리는 Bottom Half로 예약합니다.{' '}
                    <KernelRef path="kernel/irq/manage.c" sym="request_irq" />
                </Prose>
                <AnimatedDiagram
                    steps={irqSteps}
                    renderStep={(step) => <IRQViz step={step} />}
                    autoPlayInterval={2200}
                />
            </Section>

            <Section id="s553" title="5.3  Top Half / Bottom Half">
                <Prose>
                    인터럽트 처리는 두 단계로 분리됩니다. <strong className="text-gray-800 dark:text-gray-200">Top Half</strong>는{' '}
                    <T id="irq">IRQ</T> 발생 직후 인터럽트가 비활성화된 상태에서 최소한의 작업(ACK, 데이터 복사)만
                    수행합니다. <strong className="text-gray-800 dark:text-gray-200">Bottom Half</strong>는 인터럽트를 재활성화한 뒤 나머지
                    무거운 처리(프로토콜 스택, 패킷 분류 등)를 수행합니다.
                </Prose>

                <InfoTable
                    className="mb-6"
                    headers={[
                        { header: '항목', cellClassName: 'text-gray-800 dark:text-gray-300 font-semibold' },
                        { header: 'Top Half', cellClassName: 'text-gray-700 dark:text-gray-300' },
                        { header: 'Bottom Half', cellClassName: 'text-gray-700 dark:text-gray-300' },
                    ] satisfies TableColumn[]}
                    rows={[
                        { cells: ['실행 시점', 'IRQ 발생 즉시', '나중에 (인터럽트 활성화 상태)'] },
                        { cells: ['인터럽트 상태', '비활성화', '활성화'] },
                        { cells: ['실행 시간', '최소 (수 µs)', '상대적으로 길어도 됨'] },
                        { cells: ['컨텍스트', '인터럽트 컨텍스트 (sleep 불가)', '다양 (workqueue는 sleep 가능)'] },
                        { cells: ['목적', 'ACK, 데이터 복사', '프로토콜 처리, 네트워크 스택'] },
                    ]}
                />

                <CodeBlock
                    code={snippets.topBottomHalfCode}
                    language="c"
                    filename="drivers/net/ethernet/intel/e1000/e1000_main.c"
                />
            </Section>

            <Section id="s554" title="5.4  Softirq, Tasklet, Workqueue 비교">
                <Prose>
                    Bottom Half 메커니즘은 요구사항(컨텍스트, sleep 가능 여부, 우선순위)에 따라
                    <T id="softirq">Softirq</T>, <T id="tasklet">Tasklet</T>, <T id="workqueue">Workqueue</T> 세 가지로
                    구분됩니다. 네트워크 RX/TX처럼 성능이 중요한 경로는 <T id="softirq">Softirq</T>,{' '}
                    <KernelRef path="kernel/softirq.c" sym="__do_softirq" /> 드라이버의 일반
                    지연 처리는 <T id="tasklet">Tasklet</T>, 파일시스템 등 sleep이 필요한 작업은{' '}
                    <T id="workqueue">Workqueue</T>를 사용합니다.{' '}
                    <KernelRef path="kernel/workqueue.c" sym="queue_work" />
                </Prose>

                <InfoTable
                    className="mb-6"
                    headers={['메커니즘', '컨텍스트', 'sleep 가능', '우선순위', '주요 용도']}
                    rows={[
                        { cells: [<Badge color="red" key="s">Softirq</Badge>, 'softirq', <span key="s1" className="text-red-400">불가</span>, '높음', '네트워크 RX/TX, 타이머'] },
                        { cells: [<Badge color="amber" key="t">Tasklet</Badge>, 'softirq (직렬화)', <span key="t1" className="text-red-400">불가</span>, '중간', '드라이버 Bottom Half'] },
                        { cells: [<Badge color="blue" key="w">Workqueue (system)</Badge>, '프로세스', <span key="w1" className="text-green-400">가능</span>, '낮음', '지연 작업, 파일시스템'] },
                        { cells: [<Badge color="blue" key="r">Workqueue (RT)</Badge>, 'RT 프로세스', <span key="r1" className="text-green-400">가능</span>, '높음', '실시간 커널 스레드'] },
                    ]}
                />

                <SubSection>Softirq 우선순위 (벡터 번호 순)</SubSection>
                <InfoTable
                    className="mb-6"
                    headers={[
                        { header: '번호', mono: true, cellClassName: 'text-amber-600 dark:text-amber-400' },
                        { header: '이름', mono: true, cellClassName: 'text-blue-600 dark:text-blue-400 font-semibold' },
                        { header: '설명', cellClassName: 'text-gray-700 dark:text-gray-300' },
                    ] satisfies TableColumn[]}
                    rows={[
                        { cells: ['0', 'HI_SOFTIRQ', '가장 높은 우선순위, tasklet_hi'] },
                        { cells: ['1', 'TIMER_SOFTIRQ', '타이머 만료 처리'] },
                        { cells: ['2', 'NET_TX_SOFTIRQ', '네트워크 패킷 송신'] },
                        { cells: ['3', 'NET_RX_SOFTIRQ', '네트워크 패킷 수신 (NAPI)'] },
                        { cells: ['4', 'BLOCK_SOFTIRQ', '블록 I/O 완료'] },
                        { cells: ['5', 'IRQ_POLL_SOFTIRQ', 'I/O 폴링'] },
                        { cells: ['6', 'TASKLET_SOFTIRQ', '일반 tasklet'] },
                        { cells: ['7', 'SCHED_SOFTIRQ', '스케줄러 (load balancing)'] },
                        { cells: ['8', 'HRTIMER_SOFTIRQ', '고해상도 타이머 (deprecated)'] },
                        { cells: ['9', 'RCU_SOFTIRQ', 'RCU 콜백 처리'] },
                    ]}
                />

                <SubSection>Deferred Work 계층 흐름</SubSection>
                <D3Container renderFn={renderDeferredWork} height={200} deps={[theme]} />
            </Section>

            <Section id="s555" title="5.5  타이머와 비동기 처리">
                <Prose>
                    리눅스 커널은 두 가지 타이머 시스템을 제공합니다. jiffies 기반의 저해상도 타이머와 HPET/TSC를
                    사용하는 고해상도 hrtimer입니다.
                </Prose>

                <CardGrid cols={3} className="mb-6">
                    {[
                        {
                            title: 'jiffies',
                            color: 'border-gray-200 dark:border-gray-600',
                            titleColor: 'text-gray-800 dark:text-gray-300',
                            points: [
                                '부팅 이후 틱(tick) 횟수',
                                'CONFIG_HZ=250 → 4ms 해상도',
                                'CONFIG_HZ=1000 → 1ms 해상도',
                                '낮은 해상도 타이머에 사용',
                            ],
                        },
                        {
                            title: 'hrtimer',
                            color: 'border-blue-200 dark:border-blue-700/60',
                            titleColor: 'text-blue-700 dark:text-blue-300',
                            points: [
                                '나노초 단위 고해상도',
                                'HPET / TSC 하드웨어 기반',
                                'ktime_t 타입 사용',
                                'sleep, nanosleep 내부 사용',
                            ],
                        },
                        {
                            title: 'Timer Wheel',
                            color: 'border-amber-200 dark:border-amber-700/60',
                            titleColor: 'text-amber-700 dark:text-amber-300',
                            points: [
                                '낮은 해상도 타이머 관리',
                                '계층적 버킷 구조',
                                'O(1) 삽입/삭제',
                                'jiffies 기반 만료 관리',
                            ],
                        },
                    ].map((card) => (
                        <div key={card.title} className={`rounded-xl border ${card.color} bg-white dark:bg-gray-900/50 p-4`}>
                            <div className={`font-bold text-sm mb-3 ${card.titleColor}`}>{card.title}</div>
                            <ul className="space-y-1">
                                {card.points.map((p) => (
                                    <li key={p} className="text-xs text-gray-600 dark:text-gray-400 flex gap-2">
                                        <span className="text-gray-600">·</span>
                                        {p}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </CardGrid>

                <CodeBlock code={snippets.hrtimerCode} language="c" filename="kernel/hrtimer_example.c" />
            </Section>

            <Section id="s556" title="5.6  Threaded IRQ — 인터럽트의 스레드화">
                <Prose>
                    전통적인 Bottom Half(<T id="softirq">Softirq</T>/<T id="tasklet">Tasklet</T>)는 인터럽트
                    컨텍스트에서 실행되어 슬립이 불가합니다. Linux 2.6.30부터 도입된{' '}
                    <strong className="text-gray-800 dark:text-gray-200">Threaded IRQ</strong>는 핸들러를 전용 커널 스레드로 실행해 슬립
                    가능하고 우선순위를 조정할 수 있습니다.{' '}
                    <KernelRef path="kernel/irq/manage.c" sym="request_threaded_irq" />
                </Prose>

                <CardGrid cols={2} className="mt-4 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">전통적 방식</div>
                        <ul className="space-y-1">
                            {[
                                '하드웨어 인터럽트 → request_irq() 핸들러',
                                '인터럽트 컨텍스트 (슬립 불가)',
                                '우선순위 조정 불가',
                                '긴 처리는 workqueue로 defer',
                            ].map((p) => (
                                <li key={p} className="text-xs text-gray-600 dark:text-gray-400 flex gap-2">
                                    <span className="text-gray-600">·</span>
                                    {p}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-blue-50 dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-700/50 p-4">
                        <div className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-3">
                            <T id="threaded_irq">Threaded IRQ</T> (현대)
                        </div>
                        <ul className="space-y-1">
                            {[
                                '하드웨어 인터럽트 → 빠른 top-half 확인',
                                'irq/<n>-<name> 커널 스레드로 bottom-half 실행',
                                '슬립 가능 (mutex 사용 가능)',
                                'nice/RT 우선순위 조정 가능',
                                'PREEMPT_RT 커널과 완벽 호환',
                            ].map((p) => (
                                <li key={p} className="text-xs text-gray-600 dark:text-gray-400 flex gap-2">
                                    <span className="text-blue-600">·</span>
                                    {p}
                                </li>
                            ))}
                        </ul>
                    </div>
                </CardGrid>

                <CodeBlock code={snippets.threadedIrqCode} language="c" filename="drivers/my_driver.c" />

                <SubSection>Threaded IRQ 스레드 확인</SubSection>
                <CodeBlock code={snippets.threadedIrqCheckCode} language="bash" filename="# 실전 확인" />
            </Section>

            <Section id="s557" title="5.7  인터럽트 어피니티 — CPU 코어 배정">
                <Prose>
                    특정 NIC의 인터럽트를 항상 같은 CPU가 처리하면 캐시 효율이 높아집니다.{' '}
                    <code className="font-mono text-blue-700 dark:text-blue-300 text-xs">/proc/irq/&lt;n&gt;/smp_affinity</code>로 어느 CPU
                    코어가 해당 <T id="irq">IRQ</T>를 처리할지 지정할 수 있습니다.
                </Prose>

                <CodeBlock code={snippets.irqAffinityCode} language="bash" filename="# IRQ 어피니티 설정" />

                <SubSection>어피니티 전략</SubSection>
                <CardGrid cols={3}>
                    <InfoBox color="gray" title="단일 CPU 고정">
                        캐시 친화성 극대화. 단일 고성능 서버에서 특정 NIC 전용으로 배정할 때 사용합니다.
                    </InfoBox>
                    <InfoBox color="blue" title="CPU 분산">
                        IRQ를 여러 CPU에 나눠 처리. 대용량 트래픽 서버에서 병목을 줄이는 전략입니다.
                    </InfoBox>
                    <InfoBox color="amber" title="NUMA 인식">
                        IRQ를 NIC와 같은 NUMA 노드 CPU에 배정해 PCIe 버스 지역성을 유지합니다.
                    </InfoBox>
                </CardGrid>
            </Section>

            <Section id="s558" title="5.8  PREEMPT_RT — 실시간 리눅스 커널">
                <Prose>
                    표준 Linux 커널은 일부 경우 인터럽트를 비활성화하거나 <T id="spinlock">스핀락</T>을 보유한 채 선점 불가 구간이
                    존재합니다. <strong className="text-gray-800 dark:text-gray-200">PREEMPT_RT 패치</strong>는 이런 구간을 최소화해 최악
                    지연(worst-case latency)을 수십 마이크로초 이내로 줄입니다. 산업용 로봇, 오디오 처리, 자동차 제어
                    시스템에서 사용됩니다.
                </Prose>

                <SubSection>핵심 변경사항</SubSection>
                <InfoTable
                    className="mb-6"
                    headers={[
                        { header: '기능', cellClassName: 'text-gray-800 dark:text-gray-300 font-semibold' },
                        { header: '일반 커널', cellClassName: 'text-gray-700 dark:text-gray-300' },
                        { header: 'PREEMPT_RT', cellClassName: 'text-gray-700 dark:text-gray-300' },
                    ] satisfies TableColumn[]}
                    rows={[
                        { cells: ['spinlock', '선점 불가 바쁜 대기', 'rt_mutex 기반 (슬립 가능)'] },
                        { cells: ['인터럽트 핸들러', '하드 IRQ 컨텍스트', 'Threaded IRQ (kthread)'] },
                        { cells: ['softirq', '인터럽트 컨텍스트', 'ksoftirqd 스레드로 분리'] },
                        { cells: ['타이머', '인터럽트 컨텍스트', 'hrtimer 스레드화'] },
                        { cells: ['최악 지연', '수ms~수십ms', '수십μs 이하'] },
                    ]}
                />

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

                <SubSection>RT 커널 사용 사례</SubSection>
                <CardGrid cols={3}>
                    <InfoBox color="red" title="산업용 제어">
                        로봇 팔, CNC 기계 — 1ms 이하 응답 보장, Xenomai/PREEMPT_RT
                    </InfoBox>
                    <InfoBox color="blue" title="오디오 처리">
                        전문 DAW (JACK Audio) — 버퍼 언더런 없는 실시간 오디오 처리
                    </InfoBox>
                    <InfoBox color="amber" title="자동차/항공">
                        AUTOSAR Adaptive, 드론 비행 제어 — 결정론적 응답 시간 필수
                    </InfoBox>
                </CardGrid>

                <Alert variant="warning" title="트레이드오프:">
                    PREEMPT_RT는 평균 처리량(throughput)을 희생하고 최악 지연을 줄입니다. 일반 서버에서는 표준
                    커널이 더 높은 처리량을 제공합니다.
                </Alert>
            </Section>

            <Section id="s559" title="5.9  IRQ Coalescing — 인터럽트 합치기와 NAPI 폴링">
                <Prose>
                    고속 NIC에서 패킷이 초당 수백만 건 수신되면 패킷마다 인터럽트를 발생시킬 경우 CPU가 인터럽트
                    처리에만 매몰되는 <strong className="text-gray-800 dark:text-gray-200">interrupt storm</strong>이 발생합니다. <T id="irq_coalescing">IRQ
                    coalescing</T>은 <strong className="text-gray-800 dark:text-gray-200">N개 패킷 또는 T μs마다 한 번</strong>만 인터럽트를
                    발생시켜 처리량과 레이턴시를 균형 있게 조절합니다.
                </Prose>

                <SubSection>NAPI 폴링 모드 동작 흐름</SubSection>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-5 mb-6 space-y-3">
                    {[
                        {
                            step: '①',
                            color: 'text-blue-600 dark:text-blue-400',
                            border: 'border-blue-200 dark:border-blue-700/50',
                            text: '첫 패킷 도착 → 인터럽트 발생 → IRQ handler: 인터럽트 비활성화 + softirq 스케줄',
                        },
                        {
                            step: '②',
                            color: 'text-cyan-600 dark:text-cyan-400',
                            border: 'border-cyan-200 dark:border-cyan-700/50',
                            text: 'NET_RX_SOFTIRQ 실행 → napi_poll() → 최대 budget(기본 300)개 패킷을 폴링으로 처리',
                        },
                        {
                            step: '③',
                            color: 'text-green-600 dark:text-green-400',
                            border: 'border-green-200 dark:border-green-700/50',
                            text: 'budget 소진 또는 큐가 비면 → 인터럽트 재활성화 → 다음 패킷 대기',
                        },
                    ].map((item) => (
                        <div
                            key={item.step}
                            className={`flex items-start gap-3 rounded-lg border ${item.border} bg-white dark:bg-gray-800/60 p-3`}
                        >
                            <span className={`font-bold text-sm shrink-0 ${item.color}`}>{item.step}</span>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{item.text}</p>
                        </div>
                    ))}
                </div>

                <SubSection>Coalescing 파라미터</SubSection>
                <CardGrid cols={2} className="mb-6">
                    {coalescingParams.map((p) => (
                        <div key={p.name} className={`rounded-xl border ${p.color} bg-white dark:bg-gray-900/50 p-4`}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`font-mono font-bold text-sm ${p.titleColor}`}>{p.name}</span>
                                <span className="text-xs text-gray-500 border border-gray-300 dark:border-gray-700 rounded px-1.5 py-0.5">
                                    {p.dir}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 mb-2">기본값: {p.default}</div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{p.desc}</p>
                        </div>
                    ))}
                </CardGrid>

                <SubSection>레이턴시 vs 처리량 트레이드오프</SubSection>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-5 mb-6">
                    <div className="flex items-center gap-6 mb-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-3 h-3 rounded-sm bg-blue-500/70"></span>처리량 (높을수록
                            좋음)
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-3 h-3 rounded-sm bg-red-500/70"></span>레이턴시 (낮을수록
                            좋음)
                        </span>
                    </div>
                    <div className="space-y-3">
                        {coalescingTradeoff.map((row) => (
                            <div key={row.label} className="grid grid-cols-[80px_1fr] gap-3 items-center">
                                <span className="text-xs font-mono text-gray-500 dark:text-gray-400 text-right">{row.label}</span>
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
                        * 처리량과 레이턴시는 상대 수치(%). coalescing 시간이 길수록 처리량은 증가하나 레이턴시도 함께
                        증가합니다.
                    </p>
                </div>

                <CodeBlock
                    code={snippets.irqCoalescingCode}
                    language="bash"
                    filename="# IRQ Coalescing 설정 및 NAPI 통계 확인"
                />

                <Alert variant="tip" title="실무 가이드:">
                    HFT(초고빈도 거래) 또는 실시간 게임 서버는{' '}
                    <strong>rx-usecs 0, rx-frames 1</strong>로 인터럽트를 즉시
                    발생시켜 레이턴시를 최소화합니다. 반대로 스트리밍·파일 전송 서버는 rx-usecs 1000 이상으로
                    설정해 CPU 사용률을 낮추고 처리량을 극대화합니다.
                </Alert>
            </Section>

            {/* ── 5.10 관련 커널 파라미터 ─────────────────────────────────── */}
            <Section id="s5510" title="5.10  관련 커널 파라미터">
                <Prose>
                    인터럽트 처리 및 <T id="napi">NAPI</T> 동작에 영향을 미치는 주요 커널 파라미터입니다.
                    IRQ 친화도는 <code>/proc/irq</code>에서, 나머지는 <code>sysctl</code>로 조정합니다.
                </Prose>

                <InfoTable
                    headers={['파라미터', '기본값', '설명']}
                    rows={[
                        { cells: ['/proc/irq/N/smp_affinity', '(전체 CPU)', 'IRQ N의 CPU 친화도 비트마스크 (16진수)'] },
                        { cells: ['/proc/irq/N/smp_affinity_list', '(전체)', 'IRQ 친화도 (CPU 번호 목록)'] },
                        { cells: ['kernel.softlockup_panic', '0', '1이면 soft lockup 감지 시 패닉'] },
                        { cells: ['kernel.softlockup_all_cpu_backtrace', '0', '1이면 soft lockup 시 모든 CPU 백트레이스'] },
                        { cells: ['kernel.hung_task_timeout_secs', '120', 'TASK_UNINTERRUPTIBLE 상태로 이 시간 초과 시 경고'] },
                        { cells: ['net.core.netdev_budget', '300', 'NAPI 폴링 한 주기에서 처리하는 최대 패킷 수'] },
                        { cells: ['net.core.netdev_budget_usecs', '2000', 'NAPI 폴링 한 주기 최대 시간(μs)'] },
                    ]}
                />

                <CodeBlock code={snippets.irqParamsCode} language="bash" filename="인터럽트 파라미터 확인/변경" />
            </Section>
        </TopicPage>
    )
}

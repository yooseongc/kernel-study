import * as snippets from './codeSnippets'
import { KernelRef } from '../../components/ui/KernelRef'
import { NetworkLayerDiagram } from '../../components/concepts/network/NetworkLayerDiagram'
import { NapiCompare } from '../../components/concepts/network/NapiCompare'
import { SkbuffLayout } from '../../components/concepts/network/SkbuffLayout'
import { NetworkFlowViz } from '../../components/concepts/network/NetworkFlowViz'
import { TxFlowViz } from '../../components/concepts/network/TxFlowViz'
import { CodeBlock, InfoBox, InfoTable, Prose, Section, T, TopicPage, useTheme } from '@study-ui/components'
import type { TableColumn } from '@study-ui/components'

// ─────────────────────────────────────────────────────────────────────────────
// 6.5  소켓 시스템 콜 표
// ─────────────────────────────────────────────────────────────────────────────
interface SyscallRow {
    syscall: string
    kernelFn: string
    desc: string
}

const syscallRows: SyscallRow[] = [
    { syscall: 'socket()', kernelFn: 'sock_create()', desc: '소켓 객체 생성' },
    { syscall: 'bind()', kernelFn: 'inet_bind()', desc: '로컬 주소/포트 바인딩' },
    { syscall: 'connect()', kernelFn: 'tcp_v4_connect()', desc: '3-way handshake 시작' },
    { syscall: 'send() / write()', kernelFn: 'tcp_sendmsg()', desc: 'sk_buff 생성, 전송 큐 추가' },
    { syscall: 'recv() / read()', kernelFn: 'tcp_recvmsg()', desc: 'receive queue에서 복사' },
    { syscall: 'epoll_wait()', kernelFn: 'ep_poll()', desc: '이벤트 대기 (소켓 준비 시 wake up)' },
]

// ─────────────────────────────────────────────────────────────────────────────
// 6.6  net_cls cgroup
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 6.8  TSO / GSO 데이터
// ─────────────────────────────────────────────────────────────────────────────
interface TsoGsoRow {
    name: string
    location: string
    direction: 'TX' | 'RX'
    effect: string
}

const tsoGsoRows: TsoGsoRow[] = [
    {
        name: 'TSO',
        location: 'NIC 하드웨어',
        direction: 'TX',
        effect: 'CPU가 MSS 분할 안 해도 됨 — NIC가 직접 분할',
    },
    {
        name: 'GSO',
        location: '소프트웨어 (드라이버 직전)',
        direction: 'TX',
        effect: 'TSO 미지원 NIC에서 지연 분할 — 스택 오버헤드 감소',
    },
    {
        name: 'LRO',
        location: 'NIC 하드웨어',
        direction: 'RX',
        effect: '패킷 합산으로 인터럽트 감소 — TCP/IP 재조립 부담 줄임',
    },
    {
        name: 'GRO',
        location: '소프트웨어 (NAPI)',
        direction: 'RX',
        effect: 'LRO와 같은 효과, 더 안전 — netfilter 등과 호환',
    },
]

// ─────────────────────────────────────────────────────────────────────────────
// 6.9  RSS / RPS / RFS 데이터
// ─────────────────────────────────────────────────────────────────────────────
interface RssMode {
    name: string
    subtitle: string
    color: string
    flow: string[]
    note: string
}

const rssModes: RssMode[] = [
    {
        name: 'RSS',
        subtitle: 'Receive Side Scaling',
        color: 'text-blue-600 dark:text-blue-400',
        flow: [
            'NIC 하드웨어',
            '5-튜플 해시 (src/dst IP·Port, proto)',
            '여러 RX 하드웨어 큐로 분산',
            '코어별 독립 NAPI poll()',
        ],
        note: 'NIC 하드웨어 지원 필요. 가장 효율적.',
    },
    {
        name: 'RPS',
        subtitle: 'Receive Packet Steering',
        color: 'text-purple-600 dark:text-purple-400',
        flow: [
            '단일 RX 큐 (NIC RSS 미지원)',
            '소프트웨어 해시 계산',
            'IPI(Inter-Processor Interrupt) 전송',
            'ksoftirqd[n]으로 분산 처리',
        ],
        note: 'RSS 없는 NIC를 위한 순수 소프트웨어 대안.',
    },
    {
        name: 'RFS',
        subtitle: 'Receive Flow Steering',
        color: 'text-green-600 dark:text-green-400',
        flow: [
            'RPS 확장',
            'socket affinity 테이블 참조',
            '해당 flow를 처리 중인 CPU 추적',
            '수신 + 처리 같은 CPU에서 실행',
        ],
        note: 'L3 캐시 히트 향상. RPS와 함께 활성화.',
    },
]

// ─────────────────────────────────────────────────────────────────────────────
// 6.10  Zero-copy — sendfile과 splice
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// 6.11  SO_REUSEPORT와 네트워크 네임스페이스
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 6.13  TCP 혼잡 제어 — CUBIC과 BBR
// ─────────────────────────────────────────────────────────────────────────────

interface CongCtrlCard {
    name: string
    subtitle: string
    color: string
    items: string[]
    kernel: string
}

const congCtrlCards: CongCtrlCard[] = [
    {
        name: 'CUBIC',
        subtitle: '손실 기반 (Loss-based)',
        color: 'blue',
        items: [
            '패킷 손실 = 혼잡 신호',
            '창 크기를 cubic 함수로 증가 (손실 후 빠른 회복)',
            '기본 리눅스 알고리즘 (2.6.19+)',
            '공정성 우수: 여러 TCP 흐름이 공평하게 대역폭 공유',
            '고레이턴시 링크에서 under-utilization 가능 (버퍼가 차야 감지)',
        ],
        kernel: 'tcp_cubic.c',
    },
    {
        name: 'BBR',
        subtitle: '대역폭 기반 (Bandwidth-based)',
        color: 'green',
        items: [
            'RTT 측정 + 전송률로 bottleneck BW 추정',
            '손실이 아닌 지연(delay) 증가를 혼잡 신호로 사용',
            '버퍼 충만 없이도 최대 대역폭 활용 가능',
            'Google 내부 테스트: 장거리 링크에서 CUBIC 대비 최대 25% 처리량 향상',
            '커널 4.9+, BBR v3은 6.8+',
        ],
        kernel: 'tcp_bbr.c',
    },
]

interface CongCompareRow {
    item: string
    cubic: string
    bbr: string
}

const congCompareRows: CongCompareRow[] = [
    { item: '혼잡 감지', cubic: '패킷 손실', bbr: 'RTT + 대역폭 추정' },
    { item: '버퍼 사용', cubic: '버퍼 풀 채움', bbr: '최소 버퍼 유지' },
    { item: '레이턴시', cubic: '버퍼 풀 시 증가', bbr: '낮게 유지' },
    { item: '공정성', cubic: 'CUBIC 간 공정', bbr: 'CUBIC 흐름과 공유 어려울 수 있음' },
    { item: '적합 환경', cubic: '일반 인터넷', bbr: '장거리(위성·DC간), 고손실 링크' },
    { item: '기본값', cubic: 'Linux 2.6.19+', bbr: '선택 설정 필요' },
]

// ─────────────────────────────────────────────────────────────────────────────
// UI Helpers
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function Topic05() {
    const { theme } = useTheme()
    void theme

    return (
        <TopicPage topicId="06-network-stack" learningItems={[
                    'NIC 드라이버에서 소켓까지 패킷이 이동하는 전체 경로를 이해합니다',
                    'sk_buff 구조체가 어떻게 네트워크 데이터를 표현하는지, NAPI 폴링을 배웁니다',
                    'L2→L3→L4 각 레이어에서 일어나는 헤더 처리와 라우팅 결정을 파악합니다',
                ]}>

            <Section id="s661" title="6.1  패킷이 커널에 들어오는 과정">
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    외부에서 패킷이 도착하면 NIC → 드라이버 → 커널 네트워크 스택 → 소켓 버퍼 → 사용자 프로세스까지 긴
                    여정을 거칩니다. 각 레이어는 <T id="sk_buff">sk_buff</T>를 전달받아 자신의 역할을 수행하고 상위
                    레이어로 넘깁니다.
                </p>

                {/* ── 단계별 수신 과정 설명 ── */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">패킷 수신 7단계</div>
                    <ol className="space-y-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed list-decimal list-inside">
                        <li>
                            <span className="font-semibold text-red-600 dark:text-red-400">NIC 수신 &amp; DMA 복사</span>{' '}
                            &mdash; 네트워크 카드가 전기 신호를 프레임으로 조립하고,{' '}
                            <T id="dma">DMA</T>로
                            메인 메모리의 RX <T id="ring_buffer">링 버퍼</T>에 복사합니다. CPU 개입 없이 하드웨어가 직접 수행합니다.
                        </li>
                        <li>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">IRQ → NAPI poll</span>{' '}
                            &mdash; NIC가 <T id="irq">IRQ</T>를 발생시키면, 드라이버의 인터럽트 핸들러가{' '}
                            <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-yellow-600 dark:text-yellow-300">napi_schedule()</code>을
                            호출하여 NAPI 폴링을 등록합니다. 이후 <T id="softirq">softirq</T> 컨텍스트에서{' '}
                            <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-yellow-600 dark:text-yellow-300">napi_poll()</code>이
                            링 버퍼의 패킷들을 <T id="sk_buff">sk_buff</T>로 변환합니다.
                        </li>
                        <li>
                            <span className="font-semibold text-pink-600 dark:text-pink-400">L2 처리 (Data Link)</span>{' '}
                            &mdash;{' '}
                            <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-yellow-600 dark:text-yellow-300">netif_receive_skb()</code>가
                            호출되면{' '}
                            <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-yellow-600 dark:text-yellow-300">eth_type_trans()</code>로
                            Ethernet 헤더를 파싱하여 상위 프로토콜(IP, ARP 등)을 결정합니다.
                        </li>
                        <li>
                            <span className="font-semibold text-purple-600 dark:text-purple-400">L3 처리 (Network)</span>{' '}
                            &mdash;{' '}
                            <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-yellow-600 dark:text-yellow-300">ip_rcv()</code>에서
                            IP 헤더 검증, TTL 체크, 라우팅 테이블 조회를 수행합니다. 이 패킷이 로컬 호스트 대상인지,
                            포워딩 대상인지 결정합니다.
                        </li>
                        <li>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">L4 처리 (Transport)</span>{' '}
                            &mdash;{' '}
                            <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-yellow-600 dark:text-yellow-300">tcp_v4_rcv()</code> 또는{' '}
                            <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-yellow-600 dark:text-yellow-300">udp_rcv()</code>에서
                            포트 번호로 소켓을 찾고, TCP의 경우 시퀀스 번호 확인 및 ACK 처리를 합니다.
                        </li>
                        <li>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">소켓 수신 큐</span>{' '}
                            &mdash; 매칭된 소켓의{' '}
                            <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-yellow-600 dark:text-yellow-300">sk_receive_queue</code>에
                            sk_buff를 추가하고, 대기 중인 프로세스를 깨웁니다.
                        </li>
                        <li>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">사용자 프로세스</span>{' '}
                            &mdash;{' '}
                            <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-yellow-600 dark:text-yellow-300">recv()</code> 또는{' '}
                            <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-yellow-600 dark:text-yellow-300">read()</code>
                            시스템 콜로 커널의 수신 큐에서 사용자 버퍼로 데이터를 복사합니다.
                        </li>
                    </ol>
                </div>

                {/* ── 레이어 시각화 (아래→위 방향) ── */}
                <div className="text-xs text-center text-gray-500 dark:text-gray-500 mt-2 mb-1">
                    아래(NIC)에서 위(사용자)로 패킷이 올라가며 각 레이어의 함수가 처리합니다
                </div>
                <NetworkLayerDiagram />

                <div className="grid grid-cols-3 gap-3 text-xs">
                    {[
                        {
                            label: 'L2 (Data Link)',
                            color: 'bg-violet-50 dark:bg-violet-900/40 border-violet-200 dark:border-violet-700/50 text-violet-700 dark:text-violet-300',
                            desc: 'Ethernet, ARP, MAC 주소 처리',
                        },
                        {
                            label: 'L3 (Network)',
                            color: 'bg-purple-50 dark:bg-purple-900/40 border-purple-200 dark:border-purple-700/50 text-purple-700 dark:text-purple-300',
                            desc: 'IP 주소, 라우팅, TTL, 단편화',
                        },
                        {
                            label: 'L4 (Transport)',
                            color: 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-700/50 text-indigo-700 dark:text-indigo-300',
                            desc: 'TCP/UDP 포트, 연결 상태 관리',
                        },
                    ].map((item) => (
                        <div key={item.label} className={`rounded-lg border px-3 py-2 ${item.color}`}>
                            <div className="font-semibold mb-1">{item.label}</div>
                            <div className="text-gray-500 dark:text-gray-400">{item.desc}</div>
                        </div>
                    ))}
                </div>

                {/* ── NAPI 핵심 포인트 InfoBox ── */}
                <InfoBox color="amber" title="NAPI가 중요한 이유">
                    <p>
                        과거에는 패킷마다 하드웨어 인터럽트(IRQ)가 발생했습니다. 10Gbps 환경에서는 초당 수백만 개의
                        패킷이 도착하므로 CPU가 인터럽트 처리에만 소모되는{' '}
                        <strong>인터럽트 폭풍(interrupt storm)</strong>이 발생합니다.
                    </p>
                    <p className="mt-1">
                        <strong>NAPI</strong>는 첫 패킷의 인터럽트 이후 <strong>폴링(polling) 모드</strong>로
                        전환하여, softirq 컨텍스트에서 budget(기본 64)만큼 한꺼번에 처리합니다.
                        큐가 비면 다시 인터럽트 모드로 복귀합니다. 이 방식으로 인터럽트 오버헤드를 극적으로 줄이고
                        throughput을 최적화합니다.
                    </p>
                </InfoBox>
            </Section>

            <Section id="s662" title="6.2  NIC 드라이버와 NAPI">
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <p>
                        <span className="font-semibold text-red-600 dark:text-red-400">과거 인터럽트 방식:</span> 패킷마다{' '}
                        <T id="irq">IRQ</T>가 발생하여 고속 트래픽 환경에서 인터럽트 폭풍(interrupt storm)이 발생합니다.
                        CPU가 인터럽트 처리에만 소모되어 실제 작업이 불가능해집니다.
                    </p>
                    <p>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                            <T id="napi">NAPI</T> (New API):
                        </span>{' '}
                        첫 패킷에서만 인터럽트를 발생시키고, 이후에는 polling 방식으로 전환합니다.{' '}
                        <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-yellow-600 dark:text-yellow-300">budget</code> 파라미터로
                        poll()이 한 번에 처리할 최대 패킷 수를 제한합니다 (기본값: 64).
                    </p>
                </div>

                <NapiCompare />

                <CodeBlock code={snippets.napiPollCode} language="c" filename="drivers/net/my_driver.c" />

                <InfoBox color="gray" title="관련 커널 소스">
                    <div className="flex flex-wrap gap-2">
                        <KernelRef path="net/core/dev.c" sym="napi_poll" />
                        <KernelRef path="include/linux/netdevice.h" sym="napi_struct" />
                        <KernelRef path="net/core/dev.c" sym="netif_receive_skb" />
                    </div>
                </InfoBox>
            </Section>

            <Section id="s663" title="6.3  sk_buff 구조">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <code className="font-mono bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-300 px-1 rounded">sk_buff</code>
                    (소켓 버퍼)는 패킷이 커널을 통과하는 내내 동반하는 메타데이터 구조체입니다. 실제 데이터를 복사하지
                    않고 포인터만 이동시켜 헤더 추가/제거를 O(1)에 처리합니다.
                </p>

                <CodeBlock code={snippets.skbuffCode} language="c" filename="include/linux/skbuff.h" />

                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">메모리 레이아웃 시각화</div>
                    <SkbuffLayout />
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                    <KernelRef path="include/linux/skbuff.h" sym="sk_buff" label="sk_buff" />
                    <KernelRef path="include/linux/netdevice.h" sym="net_device" label="net_device" />
                </div>

                <div className="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                    <span className="font-bold">핵심 포인트:</span> 레이어를 이동할 때마다{' '}
                    <code className="font-mono">data</code> 포인터를 앞으로 당기거나 뒤로 밀어 헤더를 노출/숨깁니다.
                    실제 메모리 복사는 일어나지 않습니다.
                </div>

                <InfoBox color="gray" title="관련 커널 소스">
                    <div className="flex flex-wrap gap-2">
                        <KernelRef path="include/linux/skbuff.h" sym="sk_buff" />
                        <KernelRef path="net/core/skbuff.c" sym="alloc_skb" />
                        <KernelRef path="include/linux/netdevice.h" sym="net_device" />
                    </div>
                </InfoBox>
            </Section>

            <Section id="s664" title="6.4  L2 / L3 / L4 처리 흐름">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    패킷이 NIC 드라이버에서 사용자 프로세스까지 도달하는 각 단계를 애니메이션으로 살펴봅니다. 각
                    레이어에서 어떤 커널 함수가 실행되는지 확인하세요.
                </p>

                <NetworkFlowViz />
            </Section>

            <Section id="s665" title="6.5  소켓 계층과 시스템 콜">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    사용자 프로그램은 소켓 API를 통해 네트워크에 접근합니다. 각 시스템 콜은 커널 내부의 특정 함수로
                    연결되어 소켓 객체와 <T id="sk_buff">sk_buff</T>를 조작합니다.
                </p>

                <InfoTable
                    striped
                    headers={[
                        { header: '시스템 콜', mono: true, cellClassName: 'text-blue-600 dark:text-blue-400' },
                        { header: '커널 함수', mono: true, cellClassName: 'text-purple-600 dark:text-purple-400' },
                        { header: '동작', cellClassName: 'text-gray-700 dark:text-gray-300' },
                    ] satisfies TableColumn[]}
                    rows={syscallRows.map((row) => ({ cells: [row.syscall, row.kernelFn, row.desc] }))}
                />

                <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/20 p-3">
                        <div className="font-semibold text-blue-600 dark:text-blue-400 mb-1">송신 경로 (TX)</div>
                        <div className="font-mono text-gray-500 dark:text-gray-400 space-y-0.5">
                            <div>send() → tcp_sendmsg()</div>
                            <div>→ ip_queue_xmit()</div>
                            <div>→ dev_queue_xmit()</div>
                            <div>→ NIC DMA 전송</div>
                        </div>
                    </div>
                    <div className="rounded-lg border border-green-200 dark:border-green-800/40 bg-green-50 dark:bg-green-950/20 p-3">
                        <div className="font-semibold text-green-600 dark:text-green-400 mb-1">수신 경로 (RX)</div>
                        <div className="font-mono text-gray-500 dark:text-gray-400 space-y-0.5">
                            <div>NIC IRQ → NAPI poll()</div>
                            <div>→ netif_receive_skb()</div>
                            <div>→ ip_rcv() → tcp_v4_rcv()</div>
                            <div>→ recv() 반환</div>
                        </div>
                    </div>
                </div>
            </Section>

            <Section id="s666" title="6.6  net_cls cgroup — 네트워크와 cgroup 연결">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <code className="font-mono bg-gray-100 dark:bg-gray-800 text-green-600 dark:text-green-300 px-1 rounded">net_cls</code> 서브시스템은 특정
                    cgroup에 속한 프로세스의 패킷에 classid 태그를 부여합니다. TC(Traffic Control)는 이 태그를 기반으로
                    대역폭을 제한하거나 우선순위를 설정할 수 있습니다.
                </p>

                <div className="rounded-lg border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <div className="font-semibold text-gray-800 dark:text-gray-200 mb-2">동작 원리</div>
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 flex items-center justify-center text-xs text-green-700 dark:text-green-300 shrink-0 mt-0.5">
                            1
                        </div>
                        <div>
                            프로세스가 cgroup에 할당됨 → 해당 프로세스가 생성한 <T id="sk_buff">sk_buff</T>에 classid가
                            자동으로 태깅됨
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 flex items-center justify-center text-xs text-blue-700 dark:text-blue-300 shrink-0 mt-0.5">
                            2
                        </div>
                        <div>TC filter가 classid를 읽어 해당 패킷을 특정 qdisc class로 분류</div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 border border-purple-300 dark:border-purple-700 flex items-center justify-center text-xs text-purple-700 dark:text-purple-300 shrink-0 mt-0.5">
                            3
                        </div>
                        <div>HTB(Hierarchical Token Bucket)로 대역폭 제한 적용</div>
                    </div>
                </div>

                <CodeBlock code={snippets.netClsCode} language="bash" filename="net_cls cgroup + tc 설정" />
            </Section>

            <Section id="s667" title="6.7  TX 경로 — 송신 패킷의 여정">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    RX(수신) 경로와 반대로, 애플리케이션이 데이터를 쓰면 TCP/IP 스택이 <T id="sk_buff">sk_buff</T>를
                    생성하고 <T id="qdisc">qdisc</T>(큐 디시플린)를 거쳐 NIC 하드웨어까지 전달됩니다. 각 레이어에서 헤더를 추가하고
                    라우팅을 결정한 뒤 드라이버가 DMA로 실제 전송합니다.
                </p>

                <TxFlowViz />

                <CodeBlock code={snippets.txCode} language="c" filename="net/ipv4/tcp.c" />
            </Section>

            <Section id="s668" title="6.8  TSO / GSO — 세그멘테이션 오프로드">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">TSO (TCP Segmentation Offload)</span>: 커널이 큰 TCP
                    버퍼를 통째로 NIC에 넘기고, NIC 하드웨어가 MSS 단위로 분할합니다. CPU 부담을 크게 줄입니다.{' '}
                    <span className="font-semibold text-purple-600 dark:text-purple-400">GSO (Generic Segmentation Offload)</span>: TSO를
                    지원하지 않는 NIC를 위한 소프트웨어 대안으로, 드라이버 직전 단계에서 지연 분할합니다.{' '}
                    <span className="font-semibold text-green-600 dark:text-green-400">LRO / GRO</span>: 수신 시 작은 패킷 여럿을 큰 하나로
                    합쳐 CPU 인터럽트 오버헤드를 줄입니다 (LRO는 NIC 하드웨어, GRO는 <T id="napi">NAPI</T> 소프트웨어).
                </p>

                <InfoTable
                    striped
                    headers={[
                        { header: '기법', cellClassName: 'text-blue-600 dark:text-blue-400 font-bold' },
                        { header: '처리 위치', cellClassName: 'text-gray-700 dark:text-gray-300' },
                        { header: '방향', cellClassName: 'text-gray-700 dark:text-gray-300' },
                        { header: '효과', cellClassName: 'text-gray-500 dark:text-gray-400' },
                    ] satisfies TableColumn[]}
                    rows={tsoGsoRows.map((row) => ({
                        cells: [row.name, row.location, row.direction, row.effect],
                    }))}
                />

                <CodeBlock code={snippets.tsoCheckCode} language="bash" filename="ethtool — TSO/GSO/GRO 확인" />
            </Section>

            <Section id="s669" title="6.9  RSS / RPS / RFS — 멀티코어 수신 분산">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    단일 CPU가 모든 수신 패킷을 처리하면 병목이 됩니다. 리눅스는 하드웨어/소프트웨어 두 수준에서 패킷을
                    여러 CPU 코어에 분산하는 메커니즘을 제공합니다.
                </p>

                <div className="grid grid-cols-3 gap-4">
                    {rssModes.map((mode) => (
                        <div
                            key={mode.name}
                            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2"
                        >
                            <div className={`text-sm font-bold ${mode.color}`}>{mode.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{mode.subtitle}</div>
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 space-y-1">
                                {mode.flow.map((step, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400"
                                    >
                                        {i > 0 && <span className="text-gray-400 dark:text-gray-600">↓</span>}
                                        <span className={i > 0 ? 'ml-3' : ''}>{step}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="text-[11px] text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-2">
                                {mode.note}
                            </div>
                        </div>
                    ))}
                </div>

                <CodeBlock code={snippets.rssConfigCode} language="bash" filename="RSS / RPS / RFS 설정" />
            </Section>

            <Section id="s6610" title="6.10  Zero-copy — sendfile과 splice">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    일반 <code className="font-mono text-blue-600 dark:text-blue-400">read()+write()</code> 방식은 데이터를
                    커널→유저→커널로 두 번 복사합니다. <code className="font-mono text-purple-600 dark:text-purple-400">sendfile()</code>과{' '}
                    <code className="font-mono text-green-600 dark:text-green-400">splice()</code>는 유저공간을 거치지 않고 커널 내에서 직접
                    전달합니다. Nginx, Apache의 정적 파일 서빙 성능의 핵심인 <T id="zero_copy">zero-copy</T> 기법입니다.
                </p>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                        <div className="text-sm font-bold text-red-600 dark:text-red-400">일반 read+write (복사 4회)</div>
                        <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 font-mono">
                            <div>1. disk → 페이지 캐시 (DMA)</div>
                            <div>2. 페이지 캐시 → 유저 버퍼 (CPU 복사)</div>
                            <div>3. 유저 버퍼 → 소켓 버퍼 (CPU 복사)</div>
                            <div>4. 소켓 버퍼 → NIC (DMA)</div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-2">
                            syscall 2번, CPU 복사 2번
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                        <div className="text-sm font-bold text-green-600 dark:text-green-400">sendfile (복사 2회 → 0회)</div>
                        <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 font-mono">
                            <div>1. disk → 페이지 캐시 (DMA)</div>
                            <div>2. 페이지 캐시 → NIC (DMA, NIC가 scatter-gather 지원 시)</div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-2">
                            syscall 1번, CPU 복사 0회 (NIC SG-DMA 지원 시)
                        </div>
                    </div>
                </div>

                <CodeBlock code={snippets.sendfileCode} language="c" filename="# sendfile / splice 사용법" />

                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400">페이지 캐시 공유</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                            <code className="font-mono">sendfile</code>은 파일의 페이지 캐시를 소켓 버퍼에 참조로 등록.
                            복사 없이 포인터만 전달
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-purple-600 dark:text-purple-400">SG-DMA</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                            NIC가 Scatter-Gather DMA를 지원하면 불연속 페이지를 직접 읽어 전송 → CPU 개입 0
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-green-600 dark:text-green-400">tcp_nopush + sendfile</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                            Nagle 알고리즘 비슷하게 작동 — 파일 전체가 준비될 때까지 모아서 한 번에 전송
                        </div>
                    </div>
                </div>
            </Section>

            <Section id="s6611" title="6.11  SO_REUSEPORT와 네트워크 네임스페이스">
                {/* 파트 A: SO_REUSEPORT */}
                <div className="space-y-3">
                    <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">
                        파트 A: SO_REUSEPORT — 멀티코어 서버 성능
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        전통적으로 하나의 포트에는 하나의 소켓만 바인딩할 수 있었습니다.{' '}
                        <code className="font-mono text-blue-600 dark:text-blue-400">SO_REUSEPORT</code>는 여러 소켓(각자 다른
                        스레드/프로세스)이 같은 포트를 바인딩하고, 커널이 패킷을 분산시킵니다.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                            <div className="text-sm font-bold text-red-600 dark:text-red-400">SO_REUSEPORT 없이</div>
                            <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                <li>• 포트 80에 소켓 1개</li>
                                <li>• accept() 경쟁 → lock contention</li>
                                <li>• 멀티코어 활용 불가</li>
                                <li>• epoll + 스레드로 우회 (복잡)</li>
                            </ul>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                            <div className="text-sm font-bold text-green-600 dark:text-green-400">SO_REUSEPORT</div>
                            <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                <li>• 포트 80에 소켓 N개 (CPU당 1개)</li>
                                <li>• 커널이 5-tuple 해시로 균등 분산</li>
                                <li>• lock 없이 각 코어 독립 처리</li>
                                <li>• Nginx, HAProxy 기본 설정</li>
                            </ul>
                        </div>
                    </div>

                    <CodeBlock code={snippets.reuseportCode} language="c" filename="# SO_REUSEPORT 소켓 설정" />
                </div>

                {/* 파트 B: 네트워크 네임스페이스 */}
                <div className="space-y-3">
                    <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">
                        파트 B: 네트워크 네임스페이스 — 컨테이너 네트워크 격리
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        <T id="namespace">네트워크 네임스페이스</T>는 네트워크 스택(인터페이스, 라우팅 테이블, iptables 규칙, 소켓)을 독립된
                        공간으로 분리합니다. Docker/K8s 컨테이너 네트워크의 기반입니다.
                    </p>

                    <CodeBlock code={snippets.netnsCode} language="bash" filename="# 네트워크 네임스페이스 실전" />

                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">veth pair</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                가상 이더넷 케이블. 한쪽에 넣으면 다른 쪽으로 나옴. 컨테이너↔호스트 연결
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                            <div className="text-sm font-bold text-purple-600 dark:text-purple-400">브리지 (docker0)</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                Docker가 기본 생성. 여러 veth를 하나의 L2 스위치로 연결
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                            <div className="text-sm font-bold text-green-600 dark:text-green-400">Overlay 네트워크</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                VXLAN으로 여러 호스트의 컨테이너를 같은 L2처럼 연결 (K8s Flannel/Calico)
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            <Section id="s6612" title="6.12  io_uring — 비동기 I/O의 새로운 표준">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <code className="font-mono text-blue-600 dark:text-blue-400">io_uring</code>은 Linux 5.1(2019)에 도입된 비동기 I/O
                    인터페이스입니다. 전통적인 epoll+read/write 방식의 syscall 오버헤드를 공유 링 버퍼로 최소화해,
                    네트워크 서버의 성능을 크게 향상시킵니다. Nginx, Redis, RocksDB가 도입 중입니다.
                </p>

                {/* epoll vs io_uring 비교 */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-red-600 dark:text-red-400">전통적 epoll + read/write</div>
                        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                            <li>• 이벤트 감지: epoll_wait() syscall</li>
                            <li>• 데이터 읽기: read() syscall</li>
                            <li>• 데이터 쓰기: write() syscall</li>
                            <li>• 요청당 최소 2~3번 syscall</li>
                            <li>• 커널↔유저 컨텍스트 전환 비용 발생</li>
                        </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-green-600 dark:text-green-400">io_uring</div>
                        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                            <li>• 제출: SQ(Submission Queue) 링 버퍼에 직접 쓰기</li>
                            <li>• 완료: CQ(Completion Queue) 링 버퍼에서 직접 읽기</li>
                            <li>• syscall 없이 배치 처리 (IORING_SETUP_SQPOLL 시)</li>
                            <li>• 커널 스레드가 SQ를 폴링 → 유저 syscall 불필요</li>
                            <li>• 네트워크 + 파일 I/O 통합 인터페이스</li>
                        </ul>
                    </div>
                </div>

                {/* 링 버퍼 구조 시각화 */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
                        <div className="text-xs font-mono text-blue-600 dark:text-blue-300 mb-2">SQ Ring (Submission)</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">유저 → 커널</div>
                        <div className="mt-2 space-y-1 font-mono text-xs">
                            <div className="bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 rounded px-2 py-1">SQE: IORING_OP_RECV, fd=5</div>
                            <div className="bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 rounded px-2 py-1">SQE: IORING_OP_SEND, fd=6</div>
                            <div className="bg-gray-100 dark:bg-gray-800/50 rounded px-2 py-1 text-gray-500">(빈 슬롯)</div>
                        </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl p-4">
                        <div className="text-xs font-mono text-green-600 dark:text-green-300 mb-2">CQ Ring (Completion)</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">커널 → 유저</div>
                        <div className="mt-2 space-y-1 font-mono text-xs">
                            <div className="bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-200 rounded px-2 py-1">CQE: res=1024 (읽은 바이트)</div>
                            <div className="bg-gray-100 dark:bg-gray-800/50 rounded px-2 py-1 text-gray-500">(대기 중)</div>
                        </div>
                    </div>
                </div>

                <CodeBlock code={snippets.ioUringCode} language="c" filename="# io_uring 기본 사용법 (liburing)" />
                <CodeBlock code={snippets.ioUringCheckCode} language="bash" filename="# io_uring 지원 확인" />

                {/* 성능 수치 카드 */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400">syscall 감소</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                            epoll+read/write = 요청당 3 syscall. <T id="io_uring">io_uring</T> batching = 수백 요청당 1
                            syscall
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-purple-600 dark:text-purple-400">SQPOLL 모드</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                            syscall 0. 커널 폴링 스레드(<code className="font-mono">io_uring-sq</code>)가 SQ를 지속
                            감시. CPU 1코어 상시 사용
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-green-600 dark:text-green-400">도입 사례</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                            Redis 7.0+ (io_uring 옵션), RocksDB, Nginx (실험적). Cloudflare quiche(QUIC)
                        </div>
                    </div>
                </div>
            </Section>

            {/* ─── 6.13  TCP 혼잡 제어 ─────────────────────────────────────────── */}
            <Section id="s6613" title="6.13  TCP 혼잡 제어 — CUBIC과 BBR">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    TCP 혼잡 제어는 네트워크 혼잡을 감지하고 전송 속도를 조절하는 메커니즘입니다. 리눅스에서{' '}
                    <code className="font-mono text-blue-600 dark:text-blue-400">net.ipv4.tcp_congestion_control</code>로 알고리즘을
                    선택하며, 대표 알고리즘은 기본값인 <strong>CUBIC</strong>과 Google이 개발한 <strong>BBR</strong>
                    입니다.
                </p>

                {/* CUBIC vs BBR 비교 카드 */}
                <div className="grid grid-cols-2 gap-4">
                    {congCtrlCards.map((card) => (
                        <div
                            key={card.name}
                            className={`bg-white dark:bg-gray-900 rounded-xl border p-4 space-y-3 ${
                                card.color === 'blue'
                                    ? 'border-blue-300 dark:border-blue-700'
                                    : 'border-green-300 dark:border-green-700'
                            }`}
                        >
                            <div className="space-y-0.5">
                                <div
                                    className={`text-sm font-bold ${card.color === 'blue' ? 'text-blue-500 dark:text-blue-400' : 'text-green-500 dark:text-green-400'}`}
                                >
                                    {card.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{card.subtitle}</div>
                            </div>
                            <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                {card.items.map((item, i) => (
                                    <li key={i}>• {item}</li>
                                ))}
                            </ul>
                            <div
                                className={`text-xs font-mono px-2 py-1 rounded ${
                                    card.color === 'blue'
                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
                                        : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
                                }`}
                            >
                                {card.kernel}
                            </div>
                        </div>
                    ))}
                </div>

                {/* 비교 표 */}
                <InfoTable
                    striped
                    headers={[
                        { header: '항목', cellClassName: 'text-gray-700 dark:text-gray-300 font-medium' },
                        { header: 'CUBIC', headerClassName: 'text-blue-600 dark:text-blue-400', cellClassName: 'text-gray-600 dark:text-gray-400' },
                        { header: 'BBR', headerClassName: 'text-green-600 dark:text-green-400', cellClassName: 'text-gray-600 dark:text-gray-400' },
                    ] satisfies TableColumn[]}
                    rows={congCompareRows.map((row) => ({ cells: [row.item, row.cubic, row.bbr] }))}
                />

                {/* Slow Start → Congestion Avoidance 상태 설명 */}
                <div className="space-y-2">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">혼잡 제어 상태 전이</div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-3 space-y-1">
                            <div className="text-xs font-bold text-yellow-600 dark:text-yellow-400">Slow Start</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                cwnd를 ACK마다 2배 증가 (지수적 증가). ssthresh 도달 전까지 지속.
                            </div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3 space-y-1">
                            <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                Congestion Avoidance
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                ssthresh 도달 후 선형 증가. 매 RTT마다 cwnd += 1 MSS.
                            </div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3 space-y-1">
                            <div className="text-xs font-bold text-red-600 dark:text-red-400">
                                Fast Retransmit / Recovery
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                손실 감지 시: ssthresh = cwnd / 2, 빠른 재전송 후 회복 단계 진입.
                            </div>
                        </div>
                    </div>
                </div>

                <CodeBlock code={snippets.congCtrlCode} language="bash" filename="# TCP 혼잡 제어 설정 및 확인" />
            </Section>

            {/* 6.14 관련 커널 파라미터 */}
            <Section id="s6614" title="6.14  관련 커널 파라미터">
                <Prose>
                    네트워크 스택의 동작을 제어하는 주요 커널 파라미터입니다.{' '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">sysctl</code>로
                    런타임에 조정할 수 있으며, 고성능 서버에서는 튜닝이 필수입니다.
                </Prose>

                <InfoTable
                    headers={['파라미터', '기본값', '설명']}
                    rows={[
                        { cells: ['net.core.rmem_max', '212992', '소켓 수신 버퍼 최대 크기(바이트)'] },
                        { cells: ['net.core.wmem_max', '212992', '소켓 송신 버퍼 최대 크기(바이트)'] },
                        { cells: ['net.core.somaxconn', '4096', 'listen() 백로그 큐 최대 길이'] },
                        { cells: ['net.core.netdev_max_backlog', '1000', 'NAPI 이전 NIC→커널 패킷 큐 최대 길이'] },
                        { cells: ['net.ipv4.tcp_congestion_control', 'cubic', 'TCP 혼잡 제어 알고리즘 (cubic/bbr/reno)'] },
                        { cells: ['net.ipv4.tcp_max_syn_backlog', '1024', 'SYN 대기열 최대 크기'] },
                        { cells: ['net.ipv4.tcp_tw_reuse', '2', 'TIME_WAIT 소켓 재사용 (0=비활성, 1=활성, 2=loopback만)'] },
                        { cells: ['net.ipv4.tcp_fin_timeout', '60', 'FIN_WAIT2 타임아웃(초)'] },
                        { cells: ['net.ipv4.ip_local_port_range', '32768 60999', '로컬 포트 할당 범위'] },
                        { cells: ['net.core.busy_poll', '0', 'busy polling 타임아웃(μs). 0이면 비활성'] },
                    ]}
                />

                <CodeBlock code={snippets.kernelParamsCode} language="bash" filename="# 네트워크 파라미터 확인 및 튜닝" />
            </Section>
        </TopicPage>
    )
}

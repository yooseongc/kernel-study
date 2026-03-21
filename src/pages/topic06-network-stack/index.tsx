import { useState, useCallback } from 'react'
import { CodeBlock } from '../../components/viz/CodeBlock'
import { D3Container } from '../../components/viz/D3Container'
import { AnimatedDiagram } from '../../components/viz/AnimatedDiagram'
import { useTheme } from '../../contexts/ThemeContext'
import * as d3 from 'd3'
import { themeColors } from '../../lib/colors'
import { T } from '../../components/ui/GlossaryTooltip'

// ─────────────────────────────────────────────────────────────────────────────
// 6.1  네트워크 레이어 다이어그램 (D3)
// ─────────────────────────────────────────────────────────────────────────────
interface LayerInfo {
  label: string
  fn: string
  fill: string
  stroke: string
  textColor: string
  fnColor: string
}

function getNetworkLayers(isDark: boolean): LayerInfo[] {
    const c = themeColors(isDark)
    return [
        {
            label: 'User Process',
            fn: 'recv() / read()',
            fill: isDark ? 'oklch(22% 0.06 250)' : 'oklch(93% 0.02 250)',
            stroke: isDark ? 'oklch(62% 0.20 250)' : 'oklch(50% 0.20 250)',
            textColor: c.text,
            fnColor: c.textMuted,
        },
        {
            label: 'Socket Layer',
            fn: 'sock_recvmsg()',
            fill: c.blueFill,
            stroke: c.blueStroke,
            textColor: c.blueText,
            fnColor: c.blueStroke,
        },
        {
            label: 'Transport Layer L4',
            fn: 'tcp_v4_rcv() / udp_rcv()',
            fill: c.indigoFill,
            stroke: c.indigoStroke,
            textColor: c.indigoText,
            fnColor: c.indigoStroke,
        },
        {
            label: 'Network Layer L3',
            fn: 'ip_rcv() / ip_route_input()',
            fill: c.purpleFill,
            stroke: c.purpleStroke,
            textColor: c.purpleText,
            fnColor: c.purpleStroke,
        },
        {
            label: 'Link Layer L2',
            fn: 'eth_type_trans() / arp_rcv()',
            fill: c.pinkFill,
            stroke: c.pinkStroke,
            textColor: c.pinkText,
            fnColor: c.pinkStroke,
        },
        {
            label: 'Driver / NAPI',
            fn: 'netif_receive_skb() / napi_poll()',
            fill: c.amberFill,
            stroke: c.amberStroke,
            textColor: c.amberText,
            fnColor: c.amberStroke,
        },
        {
            label: 'NIC Hardware',
            fn: 'DMA Ring Buffer / IRQ',
            fill: c.redFill,
            stroke: c.redStroke,
            textColor: c.redText,
            fnColor: c.redStroke,
        },
    ]
}

function renderNetworkLayers(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number
) {
    const isDark = document.documentElement.classList.contains('dark')
    const c = themeColors(isDark)
    const networkLayers = getNetworkLayers(isDark)
    const padX = 56
    const padTop = 16
    const padBottom = 16
    const arrowAreaW = 44
    const layerAreaX = padX + arrowAreaW
    const layerAreaW = width - layerAreaX - 8
    const n = networkLayers.length
    const totalH = height - padTop - padBottom
    const layerH = totalH / n
    const rx = 8

    // Draw "패킷 ↑" arrow on the left
    const arrowX = padX + arrowAreaW / 2
    const arrowTop = padTop + 12
    const arrowBottom = padTop + totalH - 12

    svg
        .append('defs')
        .append('marker')
        .attr('id', 'arrow-up')
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('refX', 5)
        .attr('refY', 3)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,6 L5,0 L10,6')
        .attr('fill', 'none')
        .attr('stroke', c.textMuted)
        .attr('stroke-width', 1.5)

    svg
        .append('line')
        .attr('x1', arrowX)
        .attr('y1', arrowBottom)
        .attr('x2', arrowX)
        .attr('y2', arrowTop + 10)
        .attr('stroke', c.textMuted)
        .attr('stroke-width', 2)
        .attr('marker-end', 'url(#arrow-up)')

    svg
        .append('text')
        .attr('x', arrowX)
        .attr('y', arrowBottom + 14)
        .attr('text-anchor', 'middle')
        .attr('fill', c.textMuted)
        .attr('font-size', 11)
        .text('패킷')

    svg
        .append('text')
        .attr('x', arrowX)
        .attr('y', arrowTop - 4)
        .attr('text-anchor', 'middle')
        .attr('fill', c.textMuted)
        .attr('font-size', 14)
        .text('↑')

    // Draw layers (top = user, bottom = hardware)
    networkLayers.forEach((layer, i) => {
        const y = padTop + i * layerH

        const g = svg.append('g')

        g.append('rect')
            .attr('x', layerAreaX)
            .attr('y', y)
            .attr('width', layerAreaW)
            .attr('height', layerH - 2)
            .attr('rx', rx)
            .attr('fill', layer.fill)
            .attr('stroke', layer.stroke)
            .attr('stroke-width', 1.5)

        // Layer label (left aligned)
        g.append('text')
            .attr('x', layerAreaX + 14)
            .attr('y', y + layerH / 2 - 2)
            .attr('dominant-baseline', 'auto')
            .attr('fill', layer.textColor)
            .attr('font-size', 13)
            .attr('font-weight', '600')
            .text(layer.label)

        // Function name (right side, smaller)
        g.append('text')
            .attr('x', layerAreaX + layerAreaW - 14)
            .attr('y', y + layerH / 2 + 10)
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'auto')
            .attr('fill', layer.fnColor)
            .attr('font-size', 10)
            .attr('font-family', 'monospace')
            .text(layer.fn)
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// 6.2  NAPI 동작 흐름 비교 (JSX)
// ─────────────────────────────────────────────────────────────────────────────
interface NapiStep {
  text: string
  highlight?: boolean
}

const interruptSteps: NapiStep[] = [
    { text: '패킷 1 도착' },
    { text: 'IRQ 발생', highlight: true },
    { text: '인터럽트 핸들러 실행' },
    { text: '패킷 2 도착' },
    { text: 'IRQ 발생 (또 발생!)', highlight: true },
    { text: '인터럽트 핸들러 실행' },
    { text: '패킷 N 도착 → IRQ 폭풍 발생', highlight: true },
]

const napiSteps: NapiStep[] = [
    { text: '패킷 1 도착' },
    { text: '첫 IRQ 발생 (1회만)', highlight: true },
    { text: 'IRQ 비활성화 + NAPI 등록' },
    { text: '패킷 2, 3, ... 도착' },
    { text: 'poll() — 최대 64개 일괄 처리', highlight: true },
    { text: '큐 비면 IRQ 다시 활성화' },
    { text: '다음 패킷 대기' },
]

function NapiCompare() {
    return (
        <div className="grid grid-cols-2 gap-4">
            {/* Interrupt mode */}
            <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-4">
                <div className="text-sm font-bold text-red-400 mb-3">인터럽트 방식 (Legacy)</div>
                <div className="space-y-1.5">
                    {interruptSteps.map((s, i) => (
                        <div
                            key={i}
                            className={`flex items-center gap-2 text-xs font-mono px-2 py-1 rounded ${
                                s.highlight
                                    ? 'bg-red-900/60 text-red-300 border border-red-700/50'
                                    : 'text-gray-400'
                            }`}
                        >
                            <span className="text-gray-600 w-4 text-right">{i + 1}.</span>
                            <span>{s.text}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-3 text-[11px] text-red-400/80 border-t border-red-800/40 pt-2">
          고속 트래픽 시 CPU가 인터럽트 처리에만 소모됨
                </div>
            </div>

            {/* NAPI mode */}
            <div className="rounded-xl border border-green-800/50 bg-green-950/30 p-4">
                <div className="text-sm font-bold text-green-400 mb-3">NAPI 방식 (New API)</div>
                <div className="space-y-1.5">
                    {napiSteps.map((s, i) => (
                        <div
                            key={i}
                            className={`flex items-center gap-2 text-xs font-mono px-2 py-1 rounded ${
                                s.highlight
                                    ? 'bg-green-900/60 text-green-300 border border-green-700/50'
                                    : 'text-gray-400'
                            }`}
                        >
                            <span className="text-gray-600 w-4 text-right">{i + 1}.</span>
                            <span>{s.text}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-3 text-[11px] text-green-400/80 border-t border-green-800/40 pt-2">
          budget 단위 일괄 처리 → CPU 효율 극대화
                </div>
            </div>
        </div>
    )
}

const napiPollCode = `/* NAPI poll 콜백 (드라이버가 구현) */
int driver_poll(struct napi_struct *napi, int budget) {
    struct my_adapter *adapter = container_of(napi, ...);
    int work_done = 0;

    while (work_done < budget) {
        struct sk_buff *skb = get_next_rx_skb(adapter);
        if (!skb) break;

        /* sk_buff를 네트워크 스택으로 전달 */
        netif_receive_skb(skb);
        work_done++;
    }

    /* budget 미달 = 큐가 비었음 → 인터럽트 모드로 복귀 */
    if (work_done < budget) {
        napi_complete_done(napi, work_done);
        enable_irq(adapter->irq);
    }

    return work_done;
}`

// ─────────────────────────────────────────────────────────────────────────────
// 6.3  sk_buff 구조
// ─────────────────────────────────────────────────────────────────────────────
const skbuffCode = `/* include/linux/skbuff.h (핵심 필드만 발췌) */
struct sk_buff {
    /* ── 데이터 포인터 ── */
    unsigned char   *head;      /* 할당된 버퍼 시작 */
    unsigned char   *data;      /* 현재 데이터 시작 (헤더 제거 시 증가) */
    unsigned char   *tail;      /* 현재 데이터 끝 */
    unsigned char   *end;       /* 할당된 버퍼 끝 */

    /* ── 메타데이터 ── */
    __u32           len;        /* 데이터 길이 */
    __u16           protocol;   /* ETH_P_IP, ETH_P_IPV6, ... */
    __u8            pkt_type;   /* PACKET_HOST, BROADCAST, ... */

    /* ── 네트워크 계층 ── */
    struct net_device *dev;     /* 수신/송신 장치 */
    sk_buff_data_t  transport_header;  /* L4 헤더 오프셋 */
    sk_buff_data_t  network_header;    /* L3 헤더 오프셋 */
    sk_buff_data_t  mac_header;        /* L2 헤더 오프셋 */

    /* ── 소켓 연결 ── */
    struct sock     *sk;        /* 이 패킷을 소유한 소켓 (수신 시 설정) */

    /* ── Netfilter ── */
    __u8            nf_trace:1;
    __u32           mark;       /* fwmark (라우팅, TC에 사용) */
};`

interface SkbRow {
  label: string
  sublabel: string
  size: string
  color: string
  textColor: string
  pointer?: string
  pointerColor?: string
}

const skbRows: SkbRow[] = [
    {
        label: 'headroom',
        sublabel: '여유 공간 (헤더 추가용)',
        size: '가변',
        color: 'bg-gray-800/60',
        textColor: 'text-gray-500',
        pointer: 'head',
        pointerColor: 'text-orange-400',
    },
    {
        label: 'Ethernet header (14B)',
        sublabel: 'mac_header',
        size: '14 B',
        color: 'bg-violet-900/60',
        textColor: 'text-violet-200',
        pointer: 'data',
        pointerColor: 'text-green-400',
    },
    {
        label: 'IP header (20B)',
        sublabel: 'network_header',
        size: '20 B',
        color: 'bg-blue-900/60',
        textColor: 'text-blue-200',
    },
    {
        label: 'TCP header (20B)',
        sublabel: 'transport_header',
        size: '20 B',
        color: 'bg-indigo-900/60',
        textColor: 'text-indigo-200',
    },
    {
        label: 'Payload data',
        sublabel: '실제 사용자 데이터',
        size: '가변',
        color: 'bg-emerald-900/60',
        textColor: 'text-emerald-200',
        pointer: 'tail',
        pointerColor: 'text-yellow-400',
    },
    {
        label: 'tailroom',
        sublabel: '여유 공간 (뒤쪽)',
        size: '가변',
        color: 'bg-gray-800/60',
        textColor: 'text-gray-500',
        pointer: 'end',
        pointerColor: 'text-red-400',
    },
]

function SkbuffLayout() {
    return (
        <div className="flex gap-6 items-start">
            {/* Memory layout bars */}
            <div className="flex-1">
                <div className="text-xs text-gray-400 mb-2 font-mono">sk_buff 메모리 레이아웃</div>
                <div className="flex flex-col border border-gray-700 rounded-lg overflow-hidden text-xs font-mono">
                    {skbRows.map((row, i) => (
                        <div
                            key={i}
                            className={`relative flex items-center px-3 py-2 ${row.color}`}
                            style={{ minHeight: '36px' }}
                        >
                            <div className="flex-1">
                                <div className={`font-semibold ${row.textColor}`}>{row.label}</div>
                                <div className="text-gray-500 text-[10px]">{row.sublabel}</div>
                            </div>
                            <div className="text-gray-600 text-[10px]">{row.size}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pointer labels */}
            <div className="w-36 flex flex-col text-xs font-mono">
                <div className="text-gray-400 mb-2">포인터</div>
                <div className="space-y-1">
                    {skbRows
                        .filter((r) => r.pointer)
                        .map((r, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className={`font-bold ${r.pointerColor}`}>{r.pointer}</span>
                                <span className="text-gray-600">──→</span>
                                <span className="text-gray-400 text-[10px]">{r.sublabel}</span>
                            </div>
                        ))}
                </div>
                <div className="mt-4 rounded-lg border border-blue-800/40 bg-blue-950/30 p-2 text-[10px] text-blue-300">
          데이터 이동 시 포인터만 변경. 복사 없음!
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 6.4  L2/L3/L4 처리 흐름 (AnimatedDiagram)
// ─────────────────────────────────────────────────────────────────────────────
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
        description:
      '목적지 포트 번호로 소켓을 탐색합니다. TCP는 tcp_v4_rcv(), UDP는 udp_rcv()가 처리합니다.',
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

const flowZones: FlowZoneInfo[] = [
    {
        id: 'nic',
        label: 'NIC / 드라이버',
        sublabel: 'DMA, NAPI, netif_receive_skb',
        activeStep: [0],
        color: '#1c1a0e',
        activeColor: '#451a03',
        border: '#374151',
        activeBorder: '#f59e0b',
    },
    {
        id: 'kernel',
        label: '커널 네트워크 스택',
        sublabel: 'L2 → L3 → L4',
        activeStep: [0, 1, 2, 3],
        color: '#0f172a',
        activeColor: '#1e1b4b',
        border: '#374151',
        activeBorder: '#6366f1',
    },
    {
        id: 'socket',
        label: '소켓 / 프로세스',
        sublabel: 'receive_queue → copy_to_user',
        activeStep: [4, 5],
        color: '#052e16',
        activeColor: '#14532d',
        border: '#374151',
        activeBorder: '#22c55e',
    },
]

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

function NetworkFlowViz({ step }: { step: number }) {
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

            {/* Arrow indicators */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <span
                    className="px-2 py-0.5 rounded font-mono"
                    style={{ background: '#451a03', border: '1px solid #f59e0b', color: '#fde68a' }}
                >
          NIC/드라이버
                </span>
                <span>→</span>
                <span
                    className="px-2 py-0.5 rounded font-mono"
                    style={{ background: '#1e1b4b', border: '1px solid #6366f1', color: '#c7d2fe' }}
                >
          커널 스택
                </span>
                <span>→</span>
                <span
                    className="px-2 py-0.5 rounded font-mono"
                    style={{ background: '#14532d', border: '1px solid #22c55e', color: '#bbf7d0' }}
                >
          소켓/프로세스
                </span>
            </div>
        </div>
    )
}

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
// ─────────────────────────────────────────────────────────────────────="────
const netClsCode = `# myapp cgroup의 패킷에 classid 1:10 태그
echo 0x00010010 > /sys/fs/cgroup/myapp/net_cls.classid

# tc로 classid 1:10에 100Mbps 제한
tc qdisc add dev eth0 root handle 1: htb default 30
tc class add dev eth0 parent 1: classid 1:10 htb rate 100mbit
tc filter add dev eth0 parent 1: handle 0x10 cgroup`

// ─────────────────────────────────────────────────────────────────────────────
// 6.7  TX 경로 데이터 및 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────
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

function TxFlowViz({ step }: { step: number }) {
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

const txCode = `/* TCP 송신 경로 핵심 함수 */
int tcp_sendmsg(struct sock *sk, struct msghdr *msg, size_t size)
{
    /* 1. 데이터를 MSS 단위로 sk_buff에 복사 */
    skb = sk_stream_alloc_skb(sk, 0, sk->sk_allocation, false);
    skb_add_data_nocache(sk, skb, &msg->msg_iter, copy);

    /* 2. TCP 헤더 + 체크섬 계산 */
    tcp_push(sk, flags, mss_now, nonagle, size_goal);
}

/* IP 레이어 송신 */
int ip_queue_xmit(struct sock *sk, struct sk_buff *skb, struct flowi *fl)
{
    /* 라우팅 테이블 조회 */
    rt = (struct rtable *)__sk_dst_check(sk, 0);

    /* IP 헤더 설정 */
    iph = ip_hdr(skb);
    iph->protocol = sk->sk_protocol;
    iph->ttl      = ip_select_ttl(inet, &rt->dst);

    return ip_local_out(net, sk, skb);
}

/* 드라이버 큐로 전달 */
int dev_queue_xmit(struct sk_buff *skb)
{
    txq = netdev_pick_tx(dev, skb, NULL);
    q = rcu_dereference_bh(txq->qdisc);  /* pfifo_fast, etc. */
    return __dev_xmit_skb(skb, q, dev, txq);
}`

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

const tsoCheckCode = `# TSO/GSO/GRO 상태 확인
ethtool -k eth0 | grep -E "tcp-segmentation|generic-segmentation|generic-receive"

# TSO 비활성화 (디버깅 목적)
ethtool -K eth0 tso off

# 큰 sk_buff 전송 허용 크기 확인
ip link show eth0  # mtu 1500 부분
cat /proc/sys/net/ipv4/tcp_gso_max_size`

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
        color: 'text-blue-400',
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
        color: 'text-purple-400',
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
        color: 'text-green-400',
        flow: [
            'RPS 확장',
            'socket affinity 테이블 참조',
            '해당 flow를 처리 중인 CPU 추적',
            '수신 + 처리 같은 CPU에서 실행',
        ],
        note: 'L3 캐시 히트 향상. RPS와 함께 활성화.',
    },
]

const rssConfigCode = `# RSS: NIC 큐 수 확인 / 설정
ethtool -l eth0                          # 현재 큐 수
ethtool -L eth0 combined 8               # 8개 큐로 설정

# RPS: 소프트웨어 CPU 분산 (큐가 1개인 경우)
echo f > /sys/class/net/eth0/queues/rx-0/rps_cpus  # 모든 CPU 사용

# RFS: flow를 처리 중인 CPU로 스티어링
echo 32768 > /sys/class/net/eth0/queues/rx-0/rps_flow_cnt
echo 32768 > /proc/sys/net/core/rps_sock_flow_entries

# IRQ 어피니티 확인 (RSS와 연계)
cat /proc/interrupts | grep eth0`

// ─────────────────────────────────────────────────────────────────────────────
// 6.10  Zero-copy — sendfile과 splice
// ─────────────────────────────────────────────────────────────────────────────
const sendfileCode = `/* sendfile — 파일을 소켓으로 zero-copy 전송 */
#include <sys/sendfile.h>

int file_fd = open("index.html", O_RDONLY);
off_t offset = 0;
ssize_t sent = sendfile(sock_fd,    /* 출력: 소켓 */
                         file_fd,   /* 입력: 파일 */
                         &offset,   /* 시작 오프셋 */
                         file_size);/* 전송 크기 */
/* → 커널이 페이지 캐시에서 NIC로 직접 전달 */

/* splice — 임의 fd 간 zero-copy (pipe를 통해) */
int pipefd[2];
pipe(pipefd);

/* 파일 → pipe (zero-copy) */
splice(file_fd, &offset, pipefd[1], NULL, chunk_size, SPLICE_F_MOVE);
/* pipe → 소켓 (zero-copy) */
splice(pipefd[0], NULL, sock_fd, NULL, chunk_size, SPLICE_F_MOVE);

/* Nginx의 sendfile 활성화 */
/* nginx.conf: sendfile on; tcp_nopush on; */`

// ─────────────────────────────────────────────────────────────────────────────
// 6.11  SO_REUSEPORT와 네트워크 네임스페이스
// ─────────────────────────────────────────────────────────────────────────────
const reuseportCode = `int sock = socket(AF_INET, SOCK_STREAM, 0);

/* SO_REUSEPORT 활성화 */
int opt = 1;
setsockopt(sock, SOL_SOCKET, SO_REUSEPORT, &opt, sizeof(opt));

/* 모든 워커 프로세스/스레드가 같은 포트에 bind 가능 */
struct sockaddr_in addr = { .sin_port = htons(80), .sin_addr.s_addr = INADDR_ANY };
bind(sock, (struct sockaddr *)&addr, sizeof(addr));
listen(sock, SOMAXCONN);

/* 각 소켓에서 독립적으로 accept() — 경쟁 없음 */
accept(sock, ...);

/* Nginx 설정 예시: */
/* worker_processes auto;  # CPU 수만큼 */
/* reuseport 옵션은 listen 지시어에 자동 적용 */`

const netnsCode = `# 새 네임스페이스 생성
ip netns add myns

# 네임스페이스 내에서 명령 실행
ip netns exec myns ip addr    # 격리된 인터페이스 확인
ip netns exec myns ping 8.8.8.8  # 초기에는 외부 통신 불가

# veth pair로 두 네임스페이스 연결
ip link add veth0 type veth peer name veth1
ip link set veth1 netns myns        # veth1을 myns로 이동

# IP 설정
ip addr add 10.0.0.1/24 dev veth0
ip netns exec myns ip addr add 10.0.0.2/24 dev veth1
ip link set veth0 up
ip netns exec myns ip link set veth1 up

# 이제 통신 가능
ping 10.0.0.2

# 네임스페이스 목록
ip netns list
lsns -t net

# Docker 컨테이너의 네임스페이스 진입
PID=$(docker inspect -f '{{.State.Pid}}' my_container)
nsenter -t $PID -n ip addr`

const ioUringCode = `#include <liburing.h>

/* io_uring 초기화 */
struct io_uring ring;
io_uring_queue_init(256, &ring, 0);  /* 256 엔트리 큐 */

/* 비동기 수신 요청 제출 */
struct io_uring_sqe *sqe = io_uring_get_sqe(&ring);
io_uring_prep_recv(sqe, client_fd, buf, sizeof(buf), 0);
sqe->user_data = (uint64_t)client_fd;  /* 식별자 */
io_uring_submit(&ring);  /* SQ → 커널 (syscall 1번) */

/* 여러 요청을 한 번에 제출 (배치) */
for (int i = 0; i < n_clients; i++) {
    sqe = io_uring_get_sqe(&ring);
    io_uring_prep_recv(sqe, clients[i].fd, clients[i].buf, BUF_SIZE, 0);
}
io_uring_submit(&ring);  /* syscall 1번으로 n개 요청 */

/* 완료 대기 및 처리 */
struct io_uring_cqe *cqe;
io_uring_wait_cqe(&ring, &cqe);  /* 완료 대기 */
int bytes = cqe->res;             /* 읽은 바이트 수 */
int fd    = (int)cqe->user_data;
io_uring_cqe_seen(&ring, cqe);   /* CQ 슬롯 반환 */

/* SQPOLL 모드: syscall 완전 제거 */
struct io_uring_params params = { .flags = IORING_SETUP_SQPOLL };
io_uring_queue_init_params(256, &ring, &params);
/* 커널 스레드(io_uring-sq)가 SQ를 폴링 → io_uring_submit() 불필요 */`

const ioUringCheckCode = `# 커널 버전 확인 (5.1 이상 필요)
uname -r

# io_uring 지원 조작 확인
cat /proc/sys/kernel/io_uring_disabled  # 0: 활성, 1: 비활성

# io_uring 사용 중인 프로세스
cat /proc/*/fdinfo/* 2>/dev/null | grep "sq_ring"

# liburing 설치
apt install liburing-dev  # Ubuntu`

// ─────────────────────────────────────────────────────────────────────────────
// UI Helpers
// ─────────────────────────────────────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    return (
        <section id={id} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                {title}
            </h2>
            {children}
        </section>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function Topic05() {
    const { theme } = useTheme()
    const [_step, setStep] = useState(0)
    void _step

    const renderLayers = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => {
            renderNetworkLayers(svg, width, height)
        },
        [theme]
    )

    return (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">
            <header className="space-y-3">
                <p className="text-xs font-mono text-blue-500 dark:text-blue-400 uppercase tracking-widest">
                    Topic 06
                </p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    네트워크 스택의 전체 흐름
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    Network Stack End-to-End
                </p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                    패킷 수신·송신 경로, NIC/NAPI, sk_buff, L2/L3/L4, 소켓, Zero-copy, SO_REUSEPORT
                </p>
            </header>

            <Section id="s661" title="6.1  패킷이 커널에 들어오는 과정">
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
          외부에서 패킷이 도착하면 NIC → 드라이버 → 커널 네트워크 스택 → 소켓 버퍼 → 사용자
          프로세스까지 긴 여정을 거칩니다. 각 레이어는 <T id="sk_buff">sk_buff</T>를 전달받아 자신의 역할을 수행하고
          상위 레이어로 넘깁니다.
                </p>

                <D3Container
                    renderFn={renderLayers}
                    deps={[theme]}
                    height={340}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-950"
                />

                <div className="grid grid-cols-3 gap-3 text-xs">
                    {[
                        { label: 'L2 (Data Link)', color: 'bg-violet-900/40 border-violet-700/50 text-violet-300', desc: 'Ethernet, ARP, MAC 주소 처리' },
                        { label: 'L3 (Network)', color: 'bg-purple-900/40 border-purple-700/50 text-purple-300', desc: 'IP 주소, 라우팅, TTL, 단편화' },
                        { label: 'L4 (Transport)', color: 'bg-indigo-900/40 border-indigo-700/50 text-indigo-300', desc: 'TCP/UDP 포트, 연결 상태 관리' },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className={`rounded-lg border px-3 py-2 ${item.color}`}
                        >
                            <div className="font-semibold mb-1">{item.label}</div>
                            <div className="text-gray-400">{item.desc}</div>
                        </div>
                    ))}
                </div>
            </Section>

            <Section id="s662" title="6.2  NIC 드라이버와 NAPI">
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <p>
                        <span className="font-semibold text-red-400">과거 인터럽트 방식:</span> 패킷마다 <T id="irq">IRQ</T>가
            발생하여 고속 트래픽 환경에서 인터럽트 폭풍(interrupt storm)이 발생합니다. CPU가
            인터럽트 처리에만 소모되어 실제 작업이 불가능해집니다.
                    </p>
                    <p>
                        <span className="font-semibold text-green-400"><T id="napi">NAPI</T> (New API):</span> 첫 패킷에서만
            인터럽트를 발생시키고, 이후에는 polling 방식으로 전환합니다.{' '}
                        <code className="font-mono bg-gray-800 px-1 rounded text-yellow-300">budget</code>{' '}
            파라미터로 poll()이 한 번에 처리할 최대 패킷 수를 제한합니다 (기본값: 64).
                    </p>
                </div>

                <NapiCompare />

                <CodeBlock code={napiPollCode} language="c" filename="drivers/net/my_driver.c" />
            </Section>

            <Section id="s663" title="6.3  sk_buff 구조">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <code className="font-mono bg-gray-800 text-blue-300 px-1 rounded">sk_buff</code>
          (소켓 버퍼)는 패킷이 커널을 통과하는 내내 동반하는 메타데이터 구조체입니다. 실제
          데이터를 복사하지 않고 포인터만 이동시켜 헤더 추가/제거를 O(1)에 처리합니다.
                </p>

                <CodeBlock code={skbuffCode} language="c" filename="include/linux/skbuff.h" />

                <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                    <div className="text-sm font-semibold text-gray-300 mb-3">메모리 레이아웃 시각화</div>
                    <SkbuffLayout />
                </div>

                <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
                    <span className="font-bold">핵심 포인트:</span> 레이어를 이동할 때마다{' '}
                    <code className="font-mono">data</code> 포인터를 앞으로 당기거나 뒤로 밀어 헤더를
          노출/숨깁니다. 실제 메모리 복사는 일어나지 않습니다.
                </div>
            </Section>

            <Section id="s664" title="6.4  L2 / L3 / L4 처리 흐름">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          패킷이 NIC 드라이버에서 사용자 프로세스까지 도달하는 각 단계를 애니메이션으로 살펴봅니다.
          각 레이어에서 어떤 커널 함수가 실행되는지 확인하세요.
                </p>

                <AnimatedDiagram
                    steps={flowSteps}
                    renderStep={(step) => {
                        setStep(step)
                        return <NetworkFlowViz step={step} />
                    }}
                    autoPlayInterval={2500}
                />
            </Section>

            <Section id="s665" title="6.5  소켓 계층과 시스템 콜">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          사용자 프로그램은 소켓 API를 통해 네트워크에 접근합니다. 각 시스템 콜은 커널 내부의
          특정 함수로 연결되어 소켓 객체와 <T id="sk_buff">sk_buff</T>를 조작합니다.
                </p>

                <div className="rounded-xl border border-gray-700 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-800 text-gray-300">
                                <th className="text-left px-4 py-2 font-semibold font-mono">시스템 콜</th>
                                <th className="text-left px-4 py-2 font-semibold font-mono">커널 함수</th>
                                <th className="text-left px-4 py-2 font-semibold">동작</th>
                            </tr>
                        </thead>
                        <tbody>
                            {syscallRows.map((row, i) => (
                                <tr
                                    key={i}
                                    className={`border-t border-gray-700 ${
                                        i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-900/50'
                                    }`}
                                >
                                    <td className="px-4 py-2.5 font-mono text-blue-400">{row.syscall}</td>
                                    <td className="px-4 py-2.5 font-mono text-purple-400">{row.kernelFn}</td>
                                    <td className="px-4 py-2.5 text-gray-300">{row.desc}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-blue-800/40 bg-blue-950/20 p-3">
                        <div className="font-semibold text-blue-400 mb-1">송신 경로 (TX)</div>
                        <div className="font-mono text-gray-400 space-y-0.5">
                            <div>send() → tcp_sendmsg()</div>
                            <div>→ ip_queue_xmit()</div>
                            <div>→ dev_queue_xmit()</div>
                            <div>→ NIC DMA 전송</div>
                        </div>
                    </div>
                    <div className="rounded-lg border border-green-800/40 bg-green-950/20 p-3">
                        <div className="font-semibold text-green-400 mb-1">수신 경로 (RX)</div>
                        <div className="font-mono text-gray-400 space-y-0.5">
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
                    <code className="font-mono bg-gray-800 text-green-300 px-1 rounded">net_cls</code>{' '}
          서브시스템은 특정 cgroup에 속한 프로세스의 패킷에 classid 태그를 부여합니다. TC(Traffic
          Control)는 이 태그를 기반으로 대역폭을 제한하거나 우선순위를 설정할 수 있습니다.
                </p>

                <div className="rounded-lg border border-gray-700/50 bg-gray-900/50 px-4 py-3 text-sm text-gray-300 space-y-1">
                    <div className="font-semibold text-gray-200 mb-2">동작 원리</div>
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-900 border border-green-700 flex items-center justify-center text-xs text-green-300 shrink-0 mt-0.5">1</div>
                        <div>프로세스가 cgroup에 할당됨 → 해당 프로세스가 생성한 <T id="sk_buff">sk_buff</T>에 classid가 자동으로 태깅됨</div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-900 border border-blue-700 flex items-center justify-center text-xs text-blue-300 shrink-0 mt-0.5">2</div>
                        <div>TC filter가 classid를 읽어 해당 패킷을 특정 qdisc class로 분류</div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-purple-900 border border-purple-700 flex items-center justify-center text-xs text-purple-300 shrink-0 mt-0.5">3</div>
                        <div>HTB(Hierarchical Token Bucket)로 대역폭 제한 적용</div>
                    </div>
                </div>

                <CodeBlock code={netClsCode} language="bash" filename="net_cls cgroup + tc 설정" />
            </Section>

            <Section id="s667" title="6.7  TX 경로 — 송신 패킷의 여정">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          RX(수신) 경로와 반대로, 애플리케이션이 데이터를 쓰면 TCP/IP 스택이 <T id="sk_buff">sk_buff</T>를 생성하고
          qdisc(큐 디시플린)를 거쳐 NIC 하드웨어까지 전달됩니다. 각 레이어에서 헤더를 추가하고
          라우팅을 결정한 뒤 드라이버가 DMA로 실제 전송합니다.
                </p>

                <AnimatedDiagram
                    steps={txSteps}
                    renderStep={(step) => <TxFlowViz step={step} />}
                    autoPlayInterval={2500}
                />

                <CodeBlock code={txCode} language="c" filename="net/ipv4/tcp.c" />
            </Section>

            <Section id="s668" title="6.8  TSO / GSO — 세그멘테이션 오프로드">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <span className="font-semibold text-blue-400">TSO (TCP Segmentation Offload)</span>: 커널이 큰
          TCP 버퍼를 통째로 NIC에 넘기고, NIC 하드웨어가 MSS 단위로 분할합니다. CPU 부담을 크게
          줄입니다.{' '}
                    <span className="font-semibold text-purple-400">GSO (Generic Segmentation Offload)</span>:
          TSO를 지원하지 않는 NIC를 위한 소프트웨어 대안으로, 드라이버 직전 단계에서 지연 분할합니다.{' '}
                    <span className="font-semibold text-green-400">LRO / GRO</span>: 수신 시 작은 패킷 여럿을
          큰 하나로 합쳐 CPU 인터럽트 오버헤드를 줄입니다 (LRO는 NIC 하드웨어, GRO는 <T id="napi">NAPI</T> 소프트웨어).
                </p>

                <div className="rounded-xl border border-gray-700 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-800 text-gray-300">
                                <th className="text-left px-4 py-2 font-semibold">기법</th>
                                <th className="text-left px-4 py-2 font-semibold">처리 위치</th>
                                <th className="text-left px-4 py-2 font-semibold">방향</th>
                                <th className="text-left px-4 py-2 font-semibold">효과</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tsoGsoRows.map((row, i) => (
                                <tr
                                    key={i}
                                    className={`border-t border-gray-700 ${i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-900/50'}`}
                                >
                                    <td className="px-4 py-2.5 font-mono font-bold text-blue-400">{row.name}</td>
                                    <td className="px-4 py-2.5 text-gray-300">{row.location}</td>
                                    <td className="px-4 py-2.5">
                                        <span
                                            className={`px-2 py-0.5 rounded text-xs font-mono ${
                                                row.direction === 'TX'
                                                    ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
                                                    : 'bg-green-900/50 text-green-300 border border-green-700/50'
                                            }`}
                                        >
                                            {row.direction}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-gray-400 text-xs">{row.effect}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <CodeBlock code={tsoCheckCode} language="bash" filename="ethtool — TSO/GSO/GRO 확인" />
            </Section>

            <Section id="s669" title="6.9  RSS / RPS / RFS — 멀티코어 수신 분산">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          단일 CPU가 모든 수신 패킷을 처리하면 병목이 됩니다. 리눅스는 하드웨어/소프트웨어 두 수준에서
          패킷을 여러 CPU 코어에 분산하는 메커니즘을 제공합니다.
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
                                    <div key={i} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
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

                <CodeBlock code={rssConfigCode} language="bash" filename="RSS / RPS / RFS 설정" />
            </Section>

            <Section id="s6610" title="6.10  Zero-copy — sendfile과 splice">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          일반 <code className="font-mono text-blue-400">read()+write()</code> 방식은 데이터를 커널→유저→커널로 두 번 복사합니다.{' '}
                    <code className="font-mono text-purple-400">sendfile()</code>과{' '}
                    <code className="font-mono text-green-400">splice()</code>는 유저공간을 거치지 않고 커널 내에서 직접 전달합니다.
          Nginx, Apache의 정적 파일 서빙 성능의 핵심인 <T id="zero_copy">zero-copy</T> 기법입니다.
                </p>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                        <div className="text-sm font-bold text-red-400">일반 read+write (복사 4회)</div>
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
                        <div className="text-sm font-bold text-green-400">sendfile (복사 2회 → 0회)</div>
                        <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 font-mono">
                            <div>1. disk → 페이지 캐시 (DMA)</div>
                            <div>2. 페이지 캐시 → NIC (DMA, NIC가 scatter-gather 지원 시)</div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-2">
              syscall 1번, CPU 복사 0회 (NIC SG-DMA 지원 시)
                        </div>
                    </div>
                </div>

                <CodeBlock code={sendfileCode} language="c" filename="# sendfile / splice 사용법" />

                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-blue-400">페이지 캐시 공유</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                            <code className="font-mono">sendfile</code>은 파일의 페이지 캐시를 소켓 버퍼에 참조로 등록. 복사 없이 포인터만 전달
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-purple-400">SG-DMA</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
              NIC가 Scatter-Gather DMA를 지원하면 불연속 페이지를 직접 읽어 전송 → CPU 개입 0
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-green-400">tcp_nopush + sendfile</div>
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
                        <code className="font-mono text-blue-400">SO_REUSEPORT</code>는 여러 소켓(각자 다른 스레드/프로세스)이
            같은 포트를 바인딩하고, 커널이 패킷을 분산시킵니다.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                            <div className="text-sm font-bold text-red-400">SO_REUSEPORT 없이</div>
                            <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                <li>• 포트 80에 소켓 1개</li>
                                <li>• accept() 경쟁 → lock contention</li>
                                <li>• 멀티코어 활용 불가</li>
                                <li>• epoll + 스레드로 우회 (복잡)</li>
                            </ul>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                            <div className="text-sm font-bold text-green-400">SO_REUSEPORT</div>
                            <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                <li>• 포트 80에 소켓 N개 (CPU당 1개)</li>
                                <li>• 커널이 5-tuple 해시로 균등 분산</li>
                                <li>• lock 없이 각 코어 독립 처리</li>
                                <li>• Nginx, HAProxy 기본 설정</li>
                            </ul>
                        </div>
                    </div>

                    <CodeBlock code={reuseportCode} language="c" filename="# SO_REUSEPORT 소켓 설정" />
                </div>

                {/* 파트 B: 네트워크 네임스페이스 */}
                <div className="space-y-3">
                    <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">
            파트 B: 네트워크 네임스페이스 — 컨테이너 네트워크 격리
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            네트워크 네임스페이스는 네트워크 스택(인터페이스, 라우팅 테이블, iptables 규칙, 소켓)을 독립된 공간으로 분리합니다.
            Docker/K8s 컨테이너 네트워크의 기반입니다.
                    </p>

                    <CodeBlock code={netnsCode} language="bash" filename="# 네트워크 네임스페이스 실전" />

                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                            <div className="text-sm font-bold text-blue-400">veth pair</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                가상 이더넷 케이블. 한쪽에 넣으면 다른 쪽으로 나옴. 컨테이너↔호스트 연결
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                            <div className="text-sm font-bold text-purple-400">브리지 (docker0)</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                Docker가 기본 생성. 여러 veth를 하나의 L2 스위치로 연결
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                            <div className="text-sm font-bold text-green-400">Overlay 네트워크</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                VXLAN으로 여러 호스트의 컨테이너를 같은 L2처럼 연결 (K8s Flannel/Calico)
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            <Section id="s6612" title="6.12  io_uring — 비동기 I/O의 새로운 표준">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <code className="font-mono text-blue-400">io_uring</code>은 Linux 5.1(2019)에 도입된 비동기 I/O 인터페이스입니다.
          전통적인 epoll+read/write 방식의 syscall 오버헤드를 공유 링 버퍼로 최소화해,
          네트워크 서버의 성능을 크게 향상시킵니다. Nginx, Redis, RocksDB가 도입 중입니다.
                </p>

                {/* epoll vs io_uring 비교 */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-red-400">전통적 epoll + read/write</div>
                        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                            <li>• 이벤트 감지: epoll_wait() syscall</li>
                            <li>• 데이터 읽기: read() syscall</li>
                            <li>• 데이터 쓰기: write() syscall</li>
                            <li>• 요청당 최소 2~3번 syscall</li>
                            <li>• 커널↔유저 컨텍스트 전환 비용 발생</li>
                        </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-green-400">io_uring</div>
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
                    <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-4">
                        <div className="text-xs font-mono text-blue-300 mb-2">SQ Ring (Submission)</div>
                        <div className="text-xs text-gray-400">유저 → 커널</div>
                        <div className="mt-2 space-y-1 font-mono text-xs">
                            <div className="bg-blue-800/50 rounded px-2 py-1">SQE: IORING_OP_RECV, fd=5</div>
                            <div className="bg-blue-800/50 rounded px-2 py-1">SQE: IORING_OP_SEND, fd=6</div>
                            <div className="bg-gray-800/50 rounded px-2 py-1 text-gray-500">(빈 슬롯)</div>
                        </div>
                    </div>
                    <div className="bg-green-900/30 border border-green-700 rounded-xl p-4">
                        <div className="text-xs font-mono text-green-300 mb-2">CQ Ring (Completion)</div>
                        <div className="text-xs text-gray-400">커널 → 유저</div>
                        <div className="mt-2 space-y-1 font-mono text-xs">
                            <div className="bg-green-800/50 rounded px-2 py-1">CQE: res=1024 (읽은 바이트)</div>
                            <div className="bg-gray-800/50 rounded px-2 py-1 text-gray-500">(대기 중)</div>
                        </div>
                    </div>
                </div>

                <CodeBlock code={ioUringCode} language="c" filename="# io_uring 기본 사용법 (liburing)" />
                <CodeBlock code={ioUringCheckCode} language="bash" filename="# io_uring 지원 확인" />

                {/* 성능 수치 카드 */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-blue-400">syscall 감소</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
              epoll+read/write = 요청당 3 syscall. <T id="io_uring">io_uring</T> batching = 수백 요청당 1 syscall
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-purple-400">SQPOLL 모드</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
              syscall 0. 커널 폴링 스레드(<code className="font-mono">io_uring-sq</code>)가 SQ를 지속 감시. CPU 1코어 상시 사용
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-green-400">도입 사례</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
              Redis 7.0+ (io_uring 옵션), RocksDB, Nginx (실험적). Cloudflare quiche(QUIC)
                        </div>
                    </div>
                </div>
            </Section>

            <nav className="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 flex items-center justify-between">
                <div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">이전 토픽</div>
                    <a href="#/topic/05-interrupts" className="font-semibold text-gray-900 dark:text-gray-200 text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        ← 05 · 인터럽트, 예외, Deferred Work
                    </a>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">다음 토픽</div>
                    <a href="#/topic/07-netfilter" className="font-semibold text-gray-900 dark:text-gray-200 text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        07 · 패킷 처리 경로와 후킹 지점 →
                    </a>
                </div>
            </nav>
        </div>
    )
}

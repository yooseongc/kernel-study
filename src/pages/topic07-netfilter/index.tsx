import { useState, useCallback } from 'react'
import { CodeBlock } from '../../components/viz/CodeBlock'
import { D3Container } from '../../components/viz/D3Container'
import { useTheme } from '../../hooks/useTheme'
import * as d3 from 'd3'
import { themeColors } from '../../lib/colors'
import { T } from '../../components/ui/GlossaryTooltip'
import { Section } from '../../components/ui/Section'
import { LearningCard } from '../../components/ui/LearningCard'
import { TopicNavigation } from '../../components/ui/TopicNavigation'

// ── 7.2 Netfilter 5개 훅 포인트 D3 다이어그램 ─────────────────────────────────
function renderNetfilterFlow(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    _width: number,
    _height: number
) {
    const VW = 860, VH = 280
    svg.attr('viewBox', `0 0 ${VW} ${VH}`).attr('preserveAspectRatio', 'xMidYMid meet')

    const isDark = document.documentElement.classList.contains('dark')
    const c = themeColors(isDark)
    const textFill   = c.text
    const dimFill    = c.textMuted
    const edgeColor  = c.textMuted
    const labelFill  = c.textMuted
    const bgFill     = c.bg
    const bgStroke   = c.border

    // Hook colors
    const hookBlue   = { fill: c.blueFill,   stroke: c.blueStroke }
    const hookGreen  = { fill: c.greenFill,  stroke: c.greenStroke }
    const hookYellow = { fill: c.amberFill,  stroke: c.amberStroke }
    const hookRed    = { fill: c.redFill,    stroke: c.redStroke }
    const hookPurple = { fill: c.purpleFill, stroke: c.purpleStroke }

    const defs = svg.append('defs')
    defs.append('marker')
        .attr('id', 'nf-arrow')
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 9).attr('refY', 5)
        .attr('markerWidth', 5).attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', edgeColor)

    const g = svg.append('g')

    // ── Layout constants ──────────────────────────────────────────────────────
    const PAD_L = 20
    // Row Y positions
    const TOP_Y  = 70   // top path: INPUT → PROCESS → OUTPUT
    const MID_Y  = 145  // main horizontal flow
    const BOT_Y  = 215  // FORWARD path

    // Node dimensions
    const NW = 100, NH = 32, NR = 6
    const HW = 116, HH = 34  // hook node (slightly larger)

    // X positions of key elements
    const NIC_IN_X   = PAD_L + 10
    const PREROUT_X  = NIC_IN_X + 80 + 30   // 140
    const DIAMOND_X  = PREROUT_X + 90 + 40  // 270
    const INPUT_X    = DIAMOND_X - 30        // 240  (top path)
    const FORWARD_X  = DIAMOND_X + 60        // 330  (bottom path)
    const POSTRT_X   = FORWARD_X + 110 + 30  // 500
    const NIC_OUT_X  = POSTRT_X + 90 + 30   // 620
    const OUTPUT_X   = POSTRT_X - 10        // 490 (top path, roughly above POSTROUTING)
    const PROCESS_X  = (INPUT_X + OUTPUT_X) / 2  // midpoint of top path

    // ── Helpers ───────────────────────────────────────────────────────────────
    function drawBox(cx: number, cy: number, w: number, h: number,
        label: string, sub: string,
        fill: string, stroke: string, strokeW = 1.5) {
        g.append('rect')
            .attr('x', cx - w / 2).attr('y', cy - h / 2)
            .attr('width', w).attr('height', h).attr('rx', NR)
            .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', strokeW)
        g.append('text')
            .attr('x', cx).attr('y', sub ? cy - 5 : cy)
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
            .attr('fill', textFill).attr('font-size', '10px').attr('font-weight', 'bold')
            .attr('font-family', 'monospace')
            .text(label)
        if (sub) {
            g.append('text')
                .attr('x', cx).attr('y', cy + 8)
                .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
                .attr('fill', dimFill).attr('font-size', '8px').attr('font-family', 'sans-serif')
                .text(sub)
        }
    }

    function drawHook(cx: number, cy: number, label: string, sub: string,
        col: { fill: string; stroke: string }) {
        drawBox(cx, cy, HW, HH, label, sub, col.fill, col.stroke, 2)
    }

    function drawDiamond(cx: number, cy: number, w: number, h: number) {
        const path = `M ${cx},${cy - h / 2} L ${cx + w / 2},${cy} L ${cx},${cy + h / 2} L ${cx - w / 2},${cy} Z`
        g.append('path').attr('d', path)
            .attr('fill', c.indigoFill)
            .attr('stroke', c.indigoStroke)
            .attr('stroke-width', 1.8)
        g.append('text')
            .attr('x', cx).attr('y', cy - 6)
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
            .attr('fill', c.indigoText).attr('font-size', '9px')
            .attr('font-family', 'sans-serif').attr('font-weight', 'bold')
            .text('라우팅')
        g.append('text')
            .attr('x', cx).attr('y', cy + 7)
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
            .attr('fill', c.indigoText).attr('font-size', '9px')
            .attr('font-family', 'sans-serif').attr('font-weight', 'bold')
            .text('결정')
    }

    function arrow(d: string, label?: string, lx?: number, ly?: number) {
        g.append('path').attr('d', d)
            .attr('fill', 'none').attr('stroke', edgeColor).attr('stroke-width', 1.3)
            .attr('marker-end', 'url(#nf-arrow)')
        if (label && lx !== undefined && ly !== undefined) {
            g.append('text')
                .attr('x', lx).attr('y', ly)
                .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
                .attr('fill', labelFill).attr('font-size', '8px').attr('font-family', 'sans-serif')
                .text(label)
        }
    }

    // ── Draw nodes ────────────────────────────────────────────────────────────
    // NIC (수신)
    drawBox(NIC_IN_X + NW / 2, MID_Y, NW, NH, 'NIC (수신)', '', bgFill, bgStroke)

    // PREROUTING hook
    drawHook(PREROUT_X + HW / 2, MID_Y, 'PREROUTING', 'DNAT · conntrack', hookBlue)

    // Routing diamond
    drawDiamond(DIAMOND_X, MID_Y, 64, 44)

    // INPUT hook (top path)
    drawHook(INPUT_X, TOP_Y, 'INPUT', '방화벽 인바운드', hookGreen)

    // FORWARD hook (bottom path)
    drawHook(FORWARD_X + HW / 2, BOT_Y, 'FORWARD', '라우터 방화벽', hookYellow)

    // Process box (top path)
    drawBox(PROCESS_X, TOP_Y, NW, NH, '프로세스', '(User Space)', bgFill, bgStroke)

    // OUTPUT hook (top path)
    drawHook(OUTPUT_X, TOP_Y, 'OUTPUT', '아웃바운드 필터', hookRed)

    // POSTROUTING hook
    drawHook(POSTRT_X + HW / 2, MID_Y, 'POSTROUTING', 'SNAT · Masquerade', hookPurple)

    // NIC (송신)
    drawBox(NIC_OUT_X + NW / 2, MID_Y, NW, NH, 'NIC (송신)', '', bgFill, bgStroke)

    // ── Draw arrows ───────────────────────────────────────────────────────────
    // NIC → PREROUTING
    arrow(`M ${NIC_IN_X + NW},${MID_Y} L ${PREROUT_X},${MID_Y}`)

    // PREROUTING → Diamond
    arrow(`M ${PREROUT_X + HW},${MID_Y} L ${DIAMOND_X - 32},${MID_Y}`)

    // Diamond → INPUT (up-left)
    arrow(
        `M ${DIAMOND_X - 16},${MID_Y - 18} C ${DIAMOND_X - 40},${MID_Y - 55} ${INPUT_X + 20},${TOP_Y + 20} ${INPUT_X + HW / 2},${TOP_Y + HH / 2}`,
        'LOCAL_IN', DIAMOND_X - 60, MID_Y - 45
    )

    // Diamond → FORWARD (down)
    arrow(
        `M ${DIAMOND_X},${MID_Y + 22} L ${DIAMOND_X},${BOT_Y - HH / 2}`,
        'FORWARD', DIAMOND_X + 22, (MID_Y + 22 + BOT_Y - HH / 2) / 2
    )

    // FORWARD → POSTROUTING (curve up)
    arrow(
        `M ${FORWARD_X + HW},${BOT_Y} C ${FORWARD_X + HW + 30},${BOT_Y} ${POSTRT_X},${BOT_Y + 10} ${POSTRT_X + HW / 2 - HW / 2},${MID_Y + HH / 2}`
    )

    // POSTROUTING → NIC out
    arrow(`M ${POSTRT_X + HW},${MID_Y} L ${NIC_OUT_X},${MID_Y}`)

    // INPUT → Process
    arrow(`M ${INPUT_X + HW / 2},${TOP_Y} L ${PROCESS_X - NW / 2},${TOP_Y}`)

    // Process → OUTPUT
    arrow(`M ${PROCESS_X + NW / 2},${TOP_Y} L ${OUTPUT_X - HW / 2},${TOP_Y}`)

    // OUTPUT → POSTROUTING (top path merges down)
    arrow(
        `M ${OUTPUT_X + HW / 2},${TOP_Y + HH / 2} C ${OUTPUT_X + HW / 2 + 20},${TOP_Y + 55} ${POSTRT_X + HW / 2},${MID_Y - 50} ${POSTRT_X + HW / 2},${MID_Y - HH / 2}`
    )

    // ── Section label ─────────────────────────────────────────────────────────
    g.append('text')
        .attr('x', VW / 2).attr('y', VH - 8)
        .attr('text-anchor', 'middle')
        .attr('fill', dimFill).attr('font-size', '9px').attr('font-family', 'sans-serif')
        .text('Netfilter 훅 포인트 — 패킷 흐름')

    // Legend
    const legends = [
        { col: hookBlue,   label: 'PREROUTING' },
        { col: hookGreen,  label: 'INPUT' },
        { col: hookYellow, label: 'FORWARD' },
        { col: hookRed,    label: 'OUTPUT' },
        { col: hookPurple, label: 'POSTROUTING' },
    ]
    legends.forEach((l, i) => {
        const lx = PAD_L + i * 160 + 10
        const ly = VH - 28
        g.append('rect').attr('x', lx).attr('y', ly - 6)
            .attr('width', 12).attr('height', 12).attr('rx', 2)
            .attr('fill', l.col.fill).attr('stroke', l.col.stroke).attr('stroke-width', 1.5)
        g.append('text').attr('x', lx + 16).attr('y', ly + 1)
            .attr('dominant-baseline', 'middle')
            .attr('fill', dimFill).attr('font-size', '9px').attr('font-family', 'monospace')
            .text(l.label)
    })
}

// ── Code snippets ─────────────────────────────────────────────────────────────
const iptablesVsNftablesCode = `# iptables: SSH(22) 허용, 나머지 DROP
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -j DROP

# nftables 동일 규칙
nft add table inet filter
nft add chain inet filter input { type filter hook input priority 0 \\; policy drop \\; }
nft add rule inet filter input tcp dport 22 accept`

const iptablesMainSyntaxCode = `# 규칙 조회
iptables -L -n -v --line-numbers          # filter 테이블
iptables -t nat -L -n -v                  # nat 테이블

# INPUT 체인: SSH만 허용, 나머지 차단
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -P INPUT DROP                    # 기본 정책: DROP

# FORWARD: 패킷 포워딩 허용
iptables -A FORWARD -i eth0 -o eth1 -j ACCEPT
iptables -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT

# NAT: 출발지 주소 변환 (Masquerade)
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# DNAT: 포트 포워딩 (80 → 내부 서버 8080)
iptables -t nat -A PREROUTING -p tcp --dport 80 \\
    -j DNAT --to-destination 192.168.1.10:8080

# 규칙 삭제
iptables -D INPUT -p tcp --dport 22 -j ACCEPT

# 규칙 저장/복원
iptables-save > /etc/iptables/rules.v4
iptables-restore < /etc/iptables/rules.v4`

const nftablesSyntaxCode = `# nftables로 같은 규칙 표현
nft add table inet filter
nft add chain inet filter input { type filter hook input priority 0 \\; policy drop \\; }
nft add rule inet filter input tcp dport 22 accept
nft add rule inet filter input ct state established,related accept

# NAT
nft add table ip nat
nft add chain ip nat postrouting { type nat hook postrouting priority 100 \\; }
nft add rule ip nat postrouting oifname "eth0" masquerade

# 규칙 조회
nft list ruleset`

const conntrackCode = `# conntrack 테이블 확인
conntrack -L
# 예시 출력:
# tcp 6 86400 ESTABLISHED src=192.168.1.10 dst=8.8.8.8 sport=54321 dport=443
#   src=8.8.8.8 dst=192.168.1.10 sport=443 dport=54321 [ASSURED]

# 특정 연결 삭제
conntrack -D -s 192.168.1.10`

const conntrackTuningCode = `# 현재 conntrack 상태 확인
cat /proc/sys/net/netfilter/nf_conntrack_count    # 현재 연결 수
cat /proc/sys/net/netfilter/nf_conntrack_max      # 최대 허용 수

# conntrack 테이블 크기 증가
echo 1000000 > /proc/sys/net/netfilter/nf_conntrack_max
# 또는 sysctl로 영구 설정
echo "net.netfilter.nf_conntrack_max = 1000000" >> /etc/sysctl.conf

# 버킷(해시 테이블) 크기도 함께 조정 (max의 1/4 권장)
echo 250000 > /sys/module/nf_conntrack/parameters/hashsize

# timeout 줄이기 (짧은 연결이 많은 환경)
echo 30  > /proc/sys/net/netfilter/nf_conntrack_tcp_timeout_time_wait
echo 10  > /proc/sys/net/netfilter/nf_conntrack_tcp_timeout_close_wait
echo 120 > /proc/sys/net/netfilter/nf_conntrack_tcp_timeout_established

# conntrack 테이블 내용 확인
conntrack -L | head -20
conntrack -L | wc -l  # 현재 연결 수

# 특정 연결 강제 삭제
conntrack -D -p tcp --dport 8080`

const ipsetCode = `# ipset 설치 및 집합 생성
ipset create blocklist hash:ip maxelem 1000000

# IP 추가/삭제
ipset add blocklist 192.168.1.100
ipset add blocklist 10.0.0.0/8    # CIDR 지원 (hash:net 타입)
ipset del blocklist 192.168.1.100

# iptables와 연동
iptables -I INPUT -m set --match-set blocklist src -j DROP

# 대량 추가 (파일에서)
ipset restore < blocklist.txt

# 집합 조회
ipset list blocklist | head -20
ipset list blocklist | wc -l

# 저장/복원
ipset save > /etc/ipset.conf
ipset restore < /etc/ipset.conf`

const conntrackHelperCode = `# conntrack helper 모듈 로드
modprobe nf_conntrack_ftp
modprobe nf_conntrack_sip

# 등록된 helper 확인
cat /proc/net/nf_conntrack_expect
# l3proto = IPv4 proto=tcp src=192.168.1.10 dst=203.0.113.5 sport=0 dport=45678
# ↑ FTP 데이터 채널 expectation

# 현재 conntrack 테이블 (RELATED 항목 확인)
conntrack -L | grep RELATED
# tcp 6 29 TIME_WAIT src=... dst=... RELATED [ASSURED]

# nftables에서 helper 명시 설정 (커널 5.x+ 권장 방식)
nft add rule inet filter input ct helper "ftp" accept

# helper 비활성화 (보안상 필요 시)
echo 0 > /proc/sys/net/netfilter/nf_conntrack_helper`

const tproxyCode = `# TPROXY 설정 예시 (투명 프록시)

# 1. 패킷을 특별 라우팅 테이블로 마크
iptables -t mangle -A PREROUTING -p tcp --dport 80 \\
    -j TPROXY --tproxy-mark 1 --on-port 8080

# 2. 마크된 패킷을 lo로 라우팅
ip rule add fwmark 1 lookup 100
ip route add local default dev lo table 100

# 3. 프록시 소켓: IP_TRANSPARENT 옵션 필요
# setsockopt(fd, SOL_IP, IP_TRANSPARENT, &opt, sizeof(opt))`

// ── Sub-components ────────────────────────────────────────────────────────────
function TableWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
            <table className="w-full text-sm text-left">
                {children}
            </table>
        </div>
    )
}

function Th({ children }: { children: React.ReactNode }) {
    return (
        <th className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
            {children}
        </th>
    )
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
    return (
        <td
            className={`px-4 py-2.5 text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 ${mono ? 'font-mono text-xs' : ''}`}
        >
            {children}
        </td>
    )
}

function InfoBox({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-5 py-4 text-sm text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
            {children}
        </div>
    )
}

// ── Hook detail map ────────────────────────────────────────────────────────────
const hookDetails: Record<string, { desc: string; examples: string }> = {
    PREROUTING:  { desc: '패킷이 NIC에서 수신된 직후, 라우팅 결정 전에 실행됩니다.', examples: 'DNAT, conntrack 초기화' },
    INPUT:       { desc: '라우팅 결과가 로컬 프로세스로 결정된 패킷에 적용됩니다.',   examples: '인바운드 방화벽 규칙' },
    FORWARD:     { desc: '로컬이 아닌 다른 호스트로 포워딩될 패킷에 적용됩니다.',     examples: '라우터/게이트웨이 방화벽' },
    OUTPUT:      { desc: '로컬 프로세스가 송신하는 패킷에 적용됩니다.',               examples: '아웃바운드 필터, DNAT' },
    POSTROUTING: { desc: '패킷이 NIC로 나가기 직전, 라우팅 결정 후에 실행됩니다.',    examples: 'SNAT, IP Masquerade' },
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Topic06() {
    const { theme } = useTheme()
    const [activeHook, setActiveHook] = useState<string | null>(null)

    const renderFn = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, w: number, h: number) => {
            renderNetfilterFlow(svg, w, h)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [theme]
    )

    return (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">
            <header className="space-y-3">
                <p className="text-xs font-mono text-blue-500 dark:text-blue-400 uppercase tracking-widest">
                    Topic 07
                </p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    패킷 처리 경로와 후킹 지점
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    Packet Path &amp; Hook Points
                </p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                    Netfilter 5훅, iptables/nftables, conntrack, TPROXY, TC Hook
                </p>
            </header>

            <LearningCard
                topicId="07-netfilter"
                items={[
                    'Netfilter의 5개 훅 포인트(PREROUTING~POSTROUTING)와 우선순위 체계를 이해합니다',
                    'iptables와 nftables가 커널 Netfilter 위에서 어떻게 동작하는지 배웁니다',
                    'TPROXY를 이용한 투명 프록시 구현과 conntrack 상태 추적 원리를 파악합니다',
                ]}
            />

            <Section id="s771" title="7.1  Netfilter 구조">
                <InfoBox>
                    <strong><T id="netfilter">Netfilter</T></strong>는 리눅스 커널 네트워크 스택의{' '}
                    <em>훅(hook) 프레임워크</em>입니다. 커널 내부에 5개의 고정된 훅 포인트를 두고,
        각 포인트에서 등록된 함수를 우선순위 순서대로 호출합니다.
                    <br /><br />
                    <strong><T id="iptables">iptables</T></strong>, <strong>nftables</strong>,{' '}
                    <strong><T id="conntrack">conntrack(연결 추적)</T></strong>, <strong>IPVS(로드밸런서)</strong> 등
        대부분의 리눅스 네트워크 보안·제어 기능이 모두 Netfilter 훅 위에서 동작합니다.
                </InfoBox>
            </Section>

            <Section id="s772" title="7.2  5개 훅 포인트 — 패킷 흐름">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        수신 패킷은 PREROUTING → (라우팅 결정) → INPUT 또는 FORWARD 경로로 분기됩니다.
        송신 패킷은 OUTPUT → POSTROUTING 경로를 거칩니다.
        드래그·휠로 확대/축소할 수 있습니다.
                </p>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 mb-6">
                    <D3Container renderFn={renderFn} deps={[theme]} height={280} zoomable={true} />
                </div>

                {/* 훅 상세 인터랙션 버튼 */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                    {Object.keys(hookDetails).map((hook) => (
                        <button
                            key={hook}
                            onClick={() => setActiveHook(activeHook === hook ? null : hook)}
                            className={`rounded-lg border px-2 py-2 text-xs font-mono font-semibold transition-colors ${
                                activeHook === hook
                                    ? 'bg-blue-600 border-blue-500 text-white'
                                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            {hook}
                        </button>
                    ))}
                </div>
                {activeHook !== null && hookDetails[activeHook] !== undefined && (
                    <div className="rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 px-5 py-4 mb-6 text-sm">
                        <div className="font-mono font-bold text-blue-700 dark:text-blue-300 mb-1">{activeHook}</div>
                        <div className="text-gray-700 dark:text-gray-300 mb-1">{hookDetails[activeHook].desc}</div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">
            주요 용도:{' '}
                            <span className="font-mono">{hookDetails[activeHook].examples}</span>
                        </div>
                    </div>
                )}

            </Section>

            <Section id="s773" title="7.3  훅 포인트 상세">
                <TableWrapper>
                    <thead>
                        <tr>
                            <Th>훅</Th>
                            <Th>시점</Th>
                            <Th>주요 용도</Th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <Td mono>PREROUTING</Td>
                            <Td>라우팅 전 (수신 직후)</Td>
                            <Td>DNAT, <T id="conntrack">conntrack</T></Td>
                        </tr>
                        <tr>
                            <Td mono>INPUT</Td>
                            <Td>로컬 프로세스로 전달 전</Td>
                            <Td>방화벽 인바운드</Td>
                        </tr>
                        <tr>
                            <Td mono>FORWARD</Td>
                            <Td>포워딩 패킷</Td>
                            <Td>라우터 방화벽</Td>
                        </tr>
                        <tr>
                            <Td mono>OUTPUT</Td>
                            <Td>로컬 프로세스 송신</Td>
                            <Td>아웃바운드 필터</Td>
                        </tr>
                        <tr>
                            <Td mono>POSTROUTING</Td>
                            <Td>송신 직전</Td>
                            <Td>SNAT, Masquerade</Td>
                        </tr>
                    </tbody>
                </TableWrapper>

            </Section>

            <Section id="s774" title="7.4  iptables와 nftables">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        두 도구 모두 <T id="netfilter">Netfilter</T> 훅을 사용하지만 아키텍처와 성능 특성이 다릅니다.
        현대 배포판(RHEL 8+, Debian 10+)은 nftables를 기본값으로 채택했습니다.
                </p>
                <TableWrapper>
                    <thead>
                        <tr>
                            <Th>항목</Th>
                            <Th>iptables</Th>
                            <Th>nftables</Th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <Td>아키텍처</Td>
                            <Td>테이블별 별도 커널 모듈</Td>
                            <Td>단일 프레임워크</Td>
                        </tr>
                        <tr>
                            <Td>성능</Td>
                            <Td>규칙 수 많을수록 선형 탐색</Td>
                            <Td>JIT 컴파일, 집합(set) 지원</Td>
                        </tr>
                        <tr>
                            <Td>IPv4/IPv6</Td>
                            <Td>별도 (iptables / ip6tables)</Td>
                            <Td>통합 (nftables)</Td>
                        </tr>
                        <tr>
                            <Td>현재 상태</Td>
                            <Td>유지보수 모드</Td>
                            <Td>기본값 (RHEL 8+, Debian 10+)</Td>
                        </tr>
                    </tbody>
                </TableWrapper>
                <CodeBlock
                    code={iptablesVsNftablesCode}
                    language="bash"
                    filename="iptables vs nftables"
                />

                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">
        iptables 핵심 문법
                </h3>
                <CodeBlock
                    code={iptablesMainSyntaxCode}
                    language="bash"
                    filename="# iptables 주요 규칙 예시"
                />
                <CodeBlock
                    code={nftablesSyntaxCode}
                    language="bash"
                    filename="# nftables 동일 규칙"
                />

            </Section>

            <Section id="s775" title="7.5  conntrack (연결 추적)">
                <InfoBox>
                    <T id="netfilter">Netfilter</T> <strong><T id="conntrack">conntrack</T></strong>은 stateful 방화벽의 핵심 컴포넌트입니다.
        커널이 모든 TCP/UDP 연결의 상태를 해시 테이블로 관리하며,
        응답 패킷을 자동으로 허용하거나 NAT 역변환을 처리합니다.
                </InfoBox>
                <TableWrapper>
                    <thead>
                        <tr>
                            <Th>상태</Th>
                            <Th>의미</Th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <Td mono>NEW</Td>
                            <Td>첫 번째 패킷 (연결 시작)</Td>
                        </tr>
                        <tr>
                            <Td mono>ESTABLISHED</Td>
                            <Td>양방향 패킷이 확인된 연결</Td>
                        </tr>
                        <tr>
                            <Td mono>RELATED</Td>
                            <Td>기존 연결과 관련된 새 연결 (FTP data 등)</Td>
                        </tr>
                        <tr>
                            <Td mono>INVALID</Td>
                            <Td>추적 불가 패킷</Td>
                        </tr>
                    </tbody>
                </TableWrapper>
                <CodeBlock
                    code={conntrackCode}
                    language="bash"
                    filename="conntrack CLI"
                />

                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">
        conntrack 성능 튜닝
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        고트래픽 환경에서 <T id="conntrack">conntrack</T> 테이블이 가득 차면 새 연결이 차단됩니다. 적절한 크기 조정이 필요합니다.
                </p>
                <CodeBlock
                    code={conntrackTuningCode}
                    language="bash"
                    filename="# conntrack 튜닝"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/40 px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                        <div className="font-semibold text-yellow-700 dark:text-yellow-400 mb-2">용량 부족 증상</div>
                        <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">
            dmesg | grep "nf_conntrack: table full"
                        </code>
                        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            새 연결 REJECT, 기존 연결은 유지됩니다.
                        </p>
                    </div>
                    <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                        <div className="font-semibold text-purple-700 dark:text-purple-400 mb-2">메모리 사용량</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
            conntrack 엔트리 1개 ≈ 320바이트<br />
            100만 연결 ≈ <strong>320MB RAM</strong>
                        </p>
                    </div>
                </div>

            </Section>

            <Section id="s776" title="7.6  TPROXY와 정책 기반 라우팅">
                <InfoBox>
                    <ul className="space-y-1 list-disc list-inside">
                        <li>
                            <strong>TPROXY</strong>: 패킷을 실제 목적지가 아닌{' '}
                            <em>로컬 소켓</em>으로 리다이렉트합니다.
            NAT와 달리 패킷의 목적지 IP/포트를 변경하지 않습니다.
                        </li>
                        <li>
            투명 프록시(transparent proxy) 구현에 필수이며,
            Envoy, Squid 등에서 활용됩니다.
                        </li>
                        <li>
                            <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
              ip rule
                            </code>{' '}
            +{' '}
                            <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
              ip route
                            </code>
            로 정책 기반 라우팅과 연동해야 합니다.
                        </li>
                    </ul>
                </InfoBox>
                <CodeBlock
                    code={tproxyCode}
                    language="bash"
                    filename="TPROXY 설정"
                />

            </Section>

            <Section id="s777" title="7.7  TC Hook (Traffic Control)">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        TC(Traffic Control)는 <T id="netfilter">Netfilter</T>와 독립적인 패킷 처리 포인트입니다.
        XDP보다 늦지만 <T id="netfilter">Netfilter</T>보다 빠른 위치에서 동작하여,
        eBPF 프로그램과 결합하면 매우 유연한 패킷 제어가 가능합니다.
                </p>
                <TableWrapper>
                    <thead>
                        <tr>
                            <Th>위치</Th>
                            <Th>시점</Th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <Td mono>ingress TC</Td>
                            <Td>드라이버 → ip_rcv() 사이 (PREROUTING 전)</Td>
                        </tr>
                        <tr>
                            <Td mono>egress TC</Td>
                            <Td>ip_output() → 드라이버 사이 (POSTROUTING 후)</Td>
                        </tr>
                    </tbody>
                </TableWrapper>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-5 py-4 text-sm text-gray-600 dark:text-gray-400 mb-8">
                    <div className="font-mono text-xs leading-7">
                        <span className="text-yellow-600 dark:text-yellow-400">NIC Driver</span>
                        {' → '}
                        <span className="font-bold text-blue-600 dark:text-blue-400">[ingress TC]</span>
                        {' → '}
                        <span className="text-gray-500">PREROUTING</span>
                        {' → ... → '}
                        <span className="text-gray-500">POSTROUTING</span>
                        {' → '}
                        <span className="font-bold text-purple-600 dark:text-purple-400">[egress TC]</span>
                        {' → '}
                        <span className="text-yellow-600 dark:text-yellow-400">NIC Driver</span>
                    </div>
                    <p className="mt-3 text-xs">
          TC BPF는{' '}
                        <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">cls_bpf</code>를
          통해 eBPF 프로그램을 연결하며, 패킷 수정·리다이렉션·드롭 등의 액션을 수행할 수 있습니다.
          다음 토픽(XDP / eBPF)에서 더 자세히 다룹니다.
                    </p>
                </div>

            </Section>

            <Section id="s778" title="7.8  ipset — 대규모 IP 집합 매칭">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <T id="iptables">iptables</T> 규칙 하나로 수천 개의 IP를 O(1)로 매칭합니다.
        차단 목록, 화이트리스트, GeoIP 차단에 활용됩니다.
                </p>
                <InfoBox>
                    <strong>성능 비교:</strong> <T id="iptables">iptables</T> 규칙 10만 개 → O(n) 순차 매칭 vs{' '}
                    <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">ipset hash:ip</code>{' '}
        → O(1) 해시 룩업. 대규모 차단 목록에서 압도적인 성능 차이가 발생합니다.
                </InfoBox>
                <CodeBlock
                    code={ipsetCode}
                    language="bash"
                    filename="# ipset 사용법"
                />
                <TableWrapper>
                    <thead>
                        <tr>
                            <Th>타입</Th>
                            <Th>설명</Th>
                            <Th>예시</Th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <Td mono>hash:ip</Td>
                            <Td>단일 IP 매칭</Td>
                            <Td>차단 IP 목록</Td>
                        </tr>
                        <tr>
                            <Td mono>hash:net</Td>
                            <Td>CIDR 블록 매칭</Td>
                            <Td>GeoIP 국가별 차단</Td>
                        </tr>
                        <tr>
                            <Td mono>hash:ip,port</Td>
                            <Td>IP+포트 조합</Td>
                            <Td>특정 서비스 차단</Td>
                        </tr>
                        <tr>
                            <Td mono>bitmap:port</Td>
                            <Td>포트 범위 (비트맵)</Td>
                            <Td>포트 범위 차단</Td>
                        </tr>
                    </tbody>
                </TableWrapper>

            </Section>

            <Section id="s779" title="7.9  Conntrack Helpers — 복잡한 프로토콜 추적">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <T id="conntrack">conntrack</T>(연결 추적)은 기본적으로 패킷의 5-tuple(src IP, dst IP,
                    src port, dst port, proto)로 연결을 식별합니다. 하지만 <strong>FTP</strong>, <strong>SIP</strong>처럼
                    페이로드 안에 추가 IP:PORT가 포함된 프로토콜은 별도 <strong>conntrack helper</strong>(ALG:
                    Application Layer Gateway)가 필요합니다.
                </p>

                <InfoBox>
                    <strong>FTP ACTIVE 모드 문제:</strong> 제어 채널(클라이언트 → 서버 21번 포트)은 conntrack이
                    추적하지만, 데이터 채널(서버 → 클라이언트 임의 포트)은 <em>새로운 연결</em>이므로 방화벽이
                    기본적으로 차단합니다. <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">nf_conntrack_ftp</code>{' '}
                    모듈이 제어 채널 페이로드를 파싱해 <strong>RELATED</strong> expectation을 등록함으로써 이를 해결합니다.
                </InfoBox>

                <div className="my-6 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Helper 동작 흐름</h3>
                    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 font-mono text-xs text-gray-700 dark:text-gray-300 leading-relaxed space-y-1">
                        <div className="text-blue-600 dark:text-blue-400 font-semibold">[패킷 수신]</div>
                        <div className="pl-4">↓</div>
                        <div><span className="text-green-600 dark:text-green-400 font-semibold">[conntrack]</span> → 5-tuple 매칭 → ESTABLISHED</div>
                        <div className="pl-4">↓ <span className="text-gray-500 dark:text-gray-500">(miss 또는 새 연결)</span></div>
                        <div><span className="text-amber-600 dark:text-amber-400 font-semibold">[helper 검사]</span> → nf_conntrack_ftp / sip / h323 등</div>
                        <div className="pl-4">↓ <span className="text-gray-500 dark:text-gray-500">(페이로드 파싱)</span></div>
                        <div><span className="text-purple-600 dark:text-purple-400 font-semibold">[expectation 등록]</span> → /proc/net/nf_conntrack_expect</div>
                        <div className="pl-4">↓ <span className="text-gray-500 dark:text-gray-500">(예상 패킷 도착)</span></div>
                        <div className="text-green-600 dark:text-green-400 font-semibold">[RELATED 상태로 허용]</div>
                    </div>
                </div>

                <div className="my-6 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">SIP ALG 동작</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        SIP INVITE 메시지 바디(SDP)에 미디어 IP:PORT가 포함됩니다.{' '}
                        <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">nf_conntrack_sip</code>{' '}
                        모듈이 SDP를 파싱해 RTP 포트 expectation을 등록하고, NAT 환경에서는{' '}
                        <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">nf_nat_sip</code>{' '}
                        이 SDP 내부 IP도 함께 rewrite합니다.
                        단, 암호화된 SIP(TLS)는 helper가 파싱 불가하므로 별도 SBC(Session Border Controller)가 필요합니다.
                    </p>
                </div>

                <TableWrapper>
                    <thead>
                        <tr>
                            <Th>Helper 모듈</Th>
                            <Th>프로토콜</Th>
                            <Th>페이로드에서 추출</Th>
                            <Th>사용 포트</Th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <Td mono>nf_conntrack_ftp</Td>
                            <Td>FTP</Td>
                            <Td>PORT/PASV 명령의 IP:PORT</Td>
                            <Td mono>21</Td>
                        </tr>
                        <tr>
                            <Td mono>nf_conntrack_sip</Td>
                            <Td>SIP</Td>
                            <Td>SDP의 m= 라인 IP:PORT</Td>
                            <Td mono>5060</Td>
                        </tr>
                        <tr>
                            <Td mono>nf_conntrack_h323</Td>
                            <Td>H.323</Td>
                            <Td>H.245 TCS 메시지</Td>
                            <Td mono>1720</Td>
                        </tr>
                        <tr>
                            <Td mono>nf_conntrack_tftp</Td>
                            <Td>TFTP</Td>
                            <Td>첫 패킷의 src port</Td>
                            <Td mono>69</Td>
                        </tr>
                    </tbody>
                </TableWrapper>

                <CodeBlock
                    code={conntrackHelperCode}
                    language="bash"
                    filename="# conntrack helper 활용"
                />
            </Section>

            <TopicNavigation topicId="07-netfilter" />
        </div>
    )
}

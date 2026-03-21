import { useCallback } from 'react'
import { CodeBlock } from '../../components/viz/CodeBlock'
import { D3Container } from '../../components/viz/D3Container'
import { useTheme } from '../../hooks/useTheme'
import * as d3 from 'd3'
import { themeColors } from '../../lib/colors'
import { T } from '../../components/ui/GlossaryTooltip'
import { Section } from '../../components/ui/Section'
import { Prose } from '../../components/ui/Prose'
import { InfoTable, type TableRow } from '../../components/ui/InfoTable'

// ─────────────────────────────────────────────────────────────────────────────
// 11.1  /proc 트리 D3 시각화
// ─────────────────────────────────────────────────────────────────────────────

interface TreeNodeData {
  name: string
  color?: string
  children?: TreeNodeData[]
}

function renderProcTree(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number,
    isDark: boolean,
) {
    const c = themeColors(isDark)
    const bg = c.bg
    const textColor = c.text
    const dimColor = c.textMuted
    const linkColor = c.link

    svg.style('background', bg)

    const treeData: TreeNodeData = {
        name: '/proc',
        color: '#3b82f6',
        children: [
            {
                name: '/proc/<pid>/',
                color: '#10b981',
                children: [
                    { name: 'maps', color: '#34d399' },
                    { name: 'status', color: '#34d399' },
                    { name: 'fd/', color: '#34d399' },
                    { name: 'net/', color: '#34d399' },
                ],
            },
            {
                name: '/proc/net/',
                color: '#8b5cf6',
                children: [
                    { name: 'dev', color: '#a78bfa' },
                    { name: 'tcp', color: '#a78bfa' },
                    { name: 'softnet_stat', color: '#a78bfa' },
                ],
            },
            {
                name: '/proc/sys/',
                color: '#f59e0b',
                children: [
                    { name: 'kernel/', color: '#fbbf24' },
                    { name: 'net/', color: '#fbbf24' },
                ],
            },
            { name: '/proc/interrupts', color: '#ef4444' },
        ],
    }

    const padX = 20
    const padY = 20
    const innerW = width - padX * 2
    const innerH = height - padY * 2

    const root = d3.hierarchy<TreeNodeData>(treeData)

    const treeLayout = d3.tree<TreeNodeData>().size([innerH, innerW])
    treeLayout(root)

    const g = svg.append('g')

    // Bezier links
    const linkGenerator = d3
        .linkHorizontal<d3.HierarchyPointLink<TreeNodeData>, d3.HierarchyPointNode<TreeNodeData>>()
        .x((d) => (d as d3.HierarchyPointNode<TreeNodeData>).y + padX)
        .y((d) => (d as d3.HierarchyPointNode<TreeNodeData>).x + padY)

    const pointRoot = root as d3.HierarchyPointNode<TreeNodeData>
    g.selectAll('path.link')
        .data(pointRoot.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', (d) => linkGenerator(d) ?? '')
        .attr('fill', 'none')
        .attr('stroke', linkColor)
        .attr('stroke-width', 1.2)

    // Nodes
    const nodes = g.selectAll('g.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', (d) => {
            const pd = d as d3.HierarchyPointNode<TreeNodeData>
            return `translate(${pd.y + padX},${pd.x + padY})`
        })

    nodes
        .append('circle')
        .attr('r', 4)
        .attr('fill', (d) => d.data.color ?? dimColor)
        .attr('stroke', (d) => d.data.color ?? dimColor)
        .attr('stroke-width', 1.5)

    nodes
        .append('text')
        .attr('x', (d) => (d.children ? -8 : 8))
        .attr('y', 0)
        .attr('text-anchor', (d) => (d.children ? 'end' : 'start'))
        .attr('dominant-baseline', 'middle')
        .attr('fill', (d) => d.data.color ?? textColor)
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .attr('font-weight', (d) => (d.depth <= 1 ? 'bold' : 'normal'))
        .text((d) => d.data.name)
}

// ─────────────────────────────────────────────────────────────────────────────
// 11.6  네트워크 병목 바 차트 D3 시각화
// ─────────────────────────────────────────────────────────────────────────────

interface BottleneckItem {
  label: string
  priority: number
  color: string
  cmd: string
}

const bottleneckData: BottleneckItem[] = [
    { label: 'NIC RX drop', priority: 95, color: '#ef4444', cmd: 'ethtool -S eth0 | grep drop' },
    { label: 'softnet drop', priority: 80, color: '#f59e0b', cmd: '/proc/net/softnet_stat col2' },
    { label: 'conntrack full', priority: 65, color: '#8b5cf6', cmd: 'conntrack -S' },
    { label: 'socket buffer', priority: 50, color: '#3b82f6', cmd: 'ss -nmp | grep rcvbuf' },
    { label: '앱 처리 지연', priority: 35, color: '#10b981', cmd: 'strace / perf' },
]

function renderNetworkBottleneck(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number,
    isDark: boolean,
) {
    const c2 = themeColors(isDark)
    const bg = c2.bg
    const axisColor = c2.textDim
    const textColor = c2.text
    const dimColor = c2.textMuted

    svg.style('background', bg)

    const padLeft = 110
    const padRight = 16
    const padTop = 16
    const padBottom = 32

    const innerW = width - padLeft - padRight
    const innerH = height - padTop - padBottom

    const g = svg.append('g')

    const xScale = d3
        .scaleLinear()
        .domain([0, 100])
        .range([padLeft, padLeft + innerW])

    const barHeight = Math.min(innerH / bottleneckData.length - 8, 28)
    const stepY = innerH / bottleneckData.length

    // X axis
    g.append('line')
        .attr('x1', padLeft)
        .attr('y1', padTop + innerH)
        .attr('x2', padLeft + innerW)
        .attr('y2', padTop + innerH)
        .attr('stroke', axisColor)
        .attr('stroke-width', 1)

    // X axis ticks
    ;[0, 25, 50, 75, 100].forEach((tick) => {
        const x = xScale(tick)
        g.append('line')
            .attr('x1', x)
            .attr('y1', padTop)
            .attr('x2', x)
            .attr('y2', padTop + innerH)
            .attr('stroke', axisColor)
            .attr('stroke-width', 0.5)
            .attr('stroke-dasharray', '3 3')

        g.append('text')
            .attr('x', x)
            .attr('y', padTop + innerH + 14)
            .attr('text-anchor', 'middle')
            .attr('fill', dimColor)
            .attr('font-size', '9px')
            .attr('font-family', 'monospace')
            .text(tick === 100 ? '높음' : tick === 0 ? '낮음' : `${tick}`)
    })

    // Y axis label
    g.append('text')
        .attr('x', padLeft + innerW / 2)
        .attr('y', padTop + innerH + 28)
        .attr('text-anchor', 'middle')
        .attr('fill', dimColor)
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .text('체크 우선순위')

    // Bars
    bottleneckData.forEach((item, i) => {
        const cy = padTop + i * stepY + stepY / 2
        const barW = xScale(item.priority) - padLeft

        // Background track
        g.append('rect')
            .attr('x', padLeft)
            .attr('y', cy - barHeight / 2)
            .attr('width', innerW)
            .attr('height', barHeight)
            .attr('rx', 4)
            .attr('fill', c2.bgCard)

        // Bar
        g.append('rect')
            .attr('x', padLeft)
            .attr('y', cy - barHeight / 2)
            .attr('width', barW)
            .attr('height', barHeight)
            .attr('rx', 4)
            .attr('fill', item.color + (isDark ? 'bb' : 'cc'))

        // Label (left)
        g.append('text')
            .attr('x', padLeft - 6)
            .attr('y', cy - 4)
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'middle')
            .attr('fill', item.color)
            .attr('font-size', '9px')
            .attr('font-family', 'monospace')
            .attr('font-weight', 'bold')
            .text(item.label)

        // Command label (left, secondary)
        g.append('text')
            .attr('x', padLeft - 6)
            .attr('y', cy + 8)
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'middle')
            .attr('fill', dimColor)
            .attr('font-size', '7.5px')
            .attr('font-family', 'monospace')
            .text(item.cmd)

        // Value label inside bar
        if (barW > 30) {
            g.append('text')
                .attr('x', padLeft + barW - 6)
                .attr('y', cy)
                .attr('text-anchor', 'end')
                .attr('dominant-baseline', 'middle')
                .attr('fill', textColor)
                .attr('font-size', '9px')
                .attr('font-family', 'monospace')
                .attr('font-weight', 'bold')
                .text(`${item.priority}`)
        }
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// Code strings
// ─────────────────────────────────────────────────────────────────────────────

const procNetCode = `# TCP 연결 상태 확인 (16진수 포트/주소)
cat /proc/net/tcp
# Local_address  rem_address  st  tx_queue rx_queue  ...
# 00000000:0016  00000000:0000  0A  ...  (0A = LISTEN, 0016 = port 22)

# UDP 소켓 목록
cat /proc/net/udp

# 네트워크 인터페이스 통계
cat /proc/net/dev
# eth0:  RX bytes/packets/errors/drop  TX bytes/packets/errors/drop

# softnet 통계 (드롭 발생 여부 확인)
cat /proc/net/softnet_stat
# 컬럼: total processed, dropped, time_squeeze (budget 소진), throttled

# conntrack 테이블 (netfilter 사용 시)
cat /proc/net/nf_conntrack | head -5

# ARP 테이블
cat /proc/net/arp

# 라우팅 테이블
cat /proc/net/route  # 16진수 형태
ip route show        # 사람이 읽기 좋은 형태

# softnet_stat 해석 스크립트
awk '{print NR-1, "CPU:", $1, "total | drop:", $2, "| squeeze:", $3}' \\
    /proc/net/softnet_stat`

const kdumpSetupCode = `# kdump 설치 및 활성화
apt install kdump-tools crash  # Ubuntu
yum install kexec-tools crash  # RHEL

# crash kernel 메모리 예약 (crashkernel= 부트 파라미터)
# /etc/default/grub:
# GRUB_CMDLINE_LINUX="crashkernel=256M"
grub-mkconfig -o /boot/grub/grub.cfg

# kdump 서비스 시작
systemctl enable --now kdump

# 덤프 저장 위치 확인
cat /etc/kdump.conf | grep path
# path /var/crash

# 강제 패닉으로 테스트 (주의: 시스템 재부팅됨)
echo c > /proc/sysrq-trigger`

const crashAnalysisCode = `# crash로 덤프 열기
crash /usr/lib/debug/boot/vmlinux-$(uname -r) /var/crash/$(date +%Y-%m-%d)/vmcore

# crash 내부 명령어
crash> bt          # 크래시 시점 백트레이스
crash> log         # dmesg 출력 (크래시 직전)
crash> ps          # 실행 중이던 프로세스 목록
crash> vm <pid>    # 특정 프로세스 가상 메모리 맵
crash> files <pid> # 열려있던 파일 디스크립터
crash> kmem -i     # 메모리 사용량 요약
crash> sym <addr>  # 주소 → 심볼 변환
crash> dis <func>  # 함수 역어셈블`

const containerCgroupCode = `# 컨테이너의 cgroup 확인 (cgroup v2)
CONTAINER_ID=$(docker inspect --format='{{.Id}}' my_container)
CGROUP_PATH="/sys/fs/cgroup/system.slice/docker-\${CONTAINER_ID}.scope"

# 메모리 사용량 및 한도
cat $CGROUP_PATH/memory.current   # 현재 사용량
cat $CGROUP_PATH/memory.max       # 한도
cat $CGROUP_PATH/memory.events    # OOM 이벤트 발생 횟수

# CPU 사용 제한 확인
cat $CGROUP_PATH/cpu.max          # "quota period" (예: 100000 100000 = 100%)

# OOM 발생 여부 확인
dmesg | grep "Memory cgroup out of memory"
# 또는
cat /var/log/syslog | grep "oom_kill"

# 컨테이너 내부 프로세스의 /proc 접근
PID=$(docker inspect --format='{{.State.Pid}}' my_container)
cat /proc/$PID/status | grep -E "VmRSS|VmPeak"
ls /proc/$PID/net/  # 컨테이너 네트워크 네임스페이스`

const containerNamespaceCode = `# 네임스페이스 목록 확인
lsns

# 컨테이너 네트워크 네임스페이스 진입
PID=$(docker inspect --format='{{.State.Pid}}' my_container)
nsenter -t $PID -n ip addr   # 컨테이너 내부 네트워크 확인
nsenter -t $PID -n ss -tunp  # 컨테이너 소켓 확인

# 컨테이너 프로세스 perf 프로파일링
perf stat -p $PID sleep 5

# K8s: Pod OOM 확인
kubectl describe pod my-pod | grep -A5 "OOMKilled"
kubectl get events --field-selector reason=OOMKilling`

const dmesgCode = `# 최근 커널 메시지 (타임스탬프 포함)
dmesg -T | tail -50

# 오류/경고만 필터
dmesg -l err,warn

# NIC 관련 메시지만
dmesg | grep -i "eth\\|ens\\|enp\\|napi\\|irq"

# 실시간 모니터링
dmesg -w`

const oopsExample = `BUG: kernel NULL pointer dereference, address: 0000000000000008
#PF: supervisor read access in kernel mode
#PF: error_code(0x0000) - not-present page
PGD 0 P4D 0
Oops: 0000 [#1] SMP PTI
CPU: 2 PID: 1234 Comm: my_driver Not tainted 6.1.0 #1
Hardware name: QEMU Standard PC (i440FX)
RIP: 0010:my_function+0x1c/0x40 [my_driver]  <- 오류 발생 위치
Code: ...
RSP: 0018:ffffb3a740d67d80 EFLAGS: 00010246
RAX: 0000000000000000 RBX: ffff9b8a12345678  <- RAX=NULL이 문제
...
Call Trace:                                    <- 호출 스택
 <TASK>
 ? driver_probe_device+0x39/0x180
 ? bus_probe_device+0x8f/0xa0
 ? device_add+0x3f9/0x870`

const perfCode = `# CPU 사용률 상위 함수 프로파일링 (10초)
perf top

# 특정 프로세스 프로파일링
perf record -g -p <pid> sleep 10
perf report --stdio

# 네트워크 스택 패킷 처리 추적
perf stat -e net:net_dev_xmit,net:netif_receive_skb \\
    -p <pid> sleep 5

# 페이지 폴트 카운트
perf stat -e page-faults ./my_program

# flamegraph 생성 (brendangregg/FlameGraph 필요)
perf record -F 99 -g ./my_program
perf script | stackcollapse-perf.pl | flamegraph.pl > out.svg`

const ftraceCode = `# 함수 추적 활성화
echo function > /sys/kernel/debug/tracing/current_tracer

# 특정 함수만 추적
echo "tcp_*" > /sys/kernel/debug/tracing/set_ftrace_filter

# 특정 PID만 추적
echo <pid> > /sys/kernel/debug/tracing/set_ftrace_pid

# 추적 시작
echo 1 > /sys/kernel/debug/tracing/tracing_on

# 결과 확인
cat /sys/kernel/debug/tracing/trace | head -50

# 추적 중지
echo 0 > /sys/kernel/debug/tracing/tracing_on`

const sarCode = `# 1초 간격으로 CPU 통계
sar -u 1 10

# 네트워크 인터페이스 통계
sar -n DEV 1 5

# 인터럽트 통계
sar -I ALL 1 5

# 메모리 통계
sar -r 1 5

# 전체 리포트 저장 (cron으로 자동 수집)
sar -A -o /var/log/sa/sa$(date +%d)`

const lockdepEnableCode = `# lockdep은 커널 컴파일 옵션으로 활성화
# CONFIG_PROVE_LOCKING=y
# CONFIG_DEBUG_LOCKDEP=y
# CONFIG_LOCK_STAT=y

# 배포판 디버그 커널에 기본 포함
uname -r  # 예: 6.1.0-1-amd64-debug

# lockdep 경고는 dmesg에 출력됨
dmesg | grep -A 30 "possible circular locking"
# 예시 출력:
# WARNING: possible circular locking dependency detected
# kworker/0:1 is trying to acquire lock:
#   (lock_B){+.+.}-{3:3}
# but task is already holding lock:
#   (lock_A){+.+.}-{3:3}
# which lock already depends on the new lock.

# 잠금 통계 확인 (CONFIG_LOCK_STAT=y)
cat /proc/lock_stat | head -30
# class name    con-bounces    contentions   ...

# lockdep 상태 초기화
echo 0 > /proc/sys/kernel/lock_stat`

const lockdepCodeCode = `/* 항상 같은 순서로 잠금 획득 */

/* 잘못된 예 — 순서 불일치 */
// CPU 0: lock(&a); lock(&b);
// CPU 1: lock(&b); lock(&a);  ← 데드락 위험!

/* 올바른 예 — 일관된 순서 */
// 항상 a → b 순서
mutex_lock(&a);
mutex_lock(&b);
/* 작업 */
mutex_unlock(&b);
mutex_unlock(&a);

/* 중첩 잠금이 필요할 때 lockdep 클래스 분리 */
static struct lock_class_key outer_key;
static struct lock_class_key inner_key;
lockdep_set_class(&outer_mutex, &outer_key);
lockdep_set_class(&inner_mutex, &inner_key);`

const kasanEnableCode = `# 커널 컴파일 옵션
# CONFIG_KASAN=y
# CONFIG_KASAN_GENERIC=y  (일반 모드, 2x 메모리 오버헤드)
# CONFIG_KASAN_INLINE=y   (인라인 계측, 더 빠름)

# KASAN 보고는 dmesg에 출력
dmesg | grep -A 30 "BUG: KASAN:"

# 예시 출력:
# ==================================================================
# BUG: KASAN: use-after-free in my_driver_read+0x58/0x100
# Read of size 8 at addr ffff888100a3b400 by task kworker/0:1/45
#
# CPU: 0 PID: 45 Comm: kworker/0:1 Tainted: G    B
# Call Trace:
#  dump_stack+0x71/0x9b
#  print_address_description+0x6e/0x260
#  kasan_report+0x1b7/0x210
#  my_driver_read+0x58/0x100  ← 실제 버그 위치
#
# Allocated by task 42:
#  kmalloc+0x...
#  my_driver_init+0x...
#
# Freed by task 42:
#  kfree+0x...
#  my_driver_cleanup+0x...`

const kasanBugCode = `/* use-after-free 예시 */
char *buf = kmalloc(64, GFP_KERNEL);
kfree(buf);
buf[0] = 'A';  /* ← KASAN: use-after-free! */

/* out-of-bounds 예시 */
char arr[8];
arr[8] = 'X';  /* ← KASAN: out-of-bounds write! */

/* KASAN 억제 (특수한 경우) */
kasan_disable_current();
/* ... 의도적인 접근 ... */
kasan_enable_current();`

// ─────────────────────────────────────────────────────────────────────────────
// Table data
// ─────────────────────────────────────────────────────────────────────────────

const procCmdRows: TableRow[] = [
    { cells: ['cat /proc/net/dev', 'NIC별 RX/TX 패킷/바이트/에러'] },
    { cells: ['cat /proc/net/softnet_stat', 'CPU별 패킷 처리 통계'] },
    { cells: ['cat /proc/interrupts', 'IRQ별 CPU 분산 현황'] },
    { cells: ['cat /proc/<pid>/maps', '프로세스 가상 주소 맵'] },
    { cells: ['sysctl net.core.rmem_max', '소켓 수신 버퍼 최대값'] },
]

const printkRows: TableRow[] = [
    { cells: ['0 (KERN_EMERG)', 'pr_emerg()', '시스템 불능'] },
    { cells: ['1 (KERN_ALERT)', 'pr_alert()', '즉각 조치 필요'] },
    { cells: ['2 (KERN_CRIT)', 'pr_crit()', '심각한 오류'] },
    { cells: ['3 (KERN_ERR)', 'pr_err()', '오류'] },
    { cells: ['4 (KERN_WARNING)', 'pr_warn()', '경고'] },
    { cells: ['6 (KERN_INFO)', 'pr_info()', '정보'] },
    { cells: ['7 (KERN_DEBUG)', 'pr_debug()', '디버그'] },
]

const bottleneckTableRows: TableRow[] = [
    { cells: ['NIC 드롭', 'ethtool -S eth0 | grep drop', 'rx_ring_size 증가, 다중 큐'] },
    { cells: ['softnet 드롭', '/proc/net/softnet_stat col2', 'net.core.netdev_max_backlog 증가'] },
    { cells: ['conntrack 가득', 'conntrack -S', 'nf_conntrack_max 증가'] },
    { cells: ['소켓 버퍼', 'ss -nmp', 'rmem_max/wmem_max 증가'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// 11.12  Flame Graph
// ─────────────────────────────────────────────────────────────────────────────

const flameGenCode = `# 1. perf로 CPU 샘플 수집 (30초, 99Hz)
perf record -F 99 -a --call-graph dwarf -g sleep 30
# 또는 특정 프로세스만
perf record -F 99 -p $(pgrep nginx) --call-graph fp sleep 30

# 2. perf script로 스택 트레이스 추출
perf script > out.perf

# 3. FlameGraph 스크립트로 변환 (Brendan Gregg)
git clone https://github.com/brendangregg/FlameGraph
./FlameGraph/stackcollapse-perf.pl out.perf > out.folded
./FlameGraph/flamegraph.pl out.folded > flamegraph.svg

# 결과: 브라우저에서 flamegraph.svg 열기 (인터랙티브)

# 4. bpftrace로 직접 수집 (커널 함수만)
bpftrace -e 'profile:hz:99 { @[kstack] = count(); }' \\
         -c "sleep 30" > out.bt
./FlameGraph/stackcollapse-bpftrace.pl out.bt > out.folded
./FlameGraph/flamegraph.pl out.folded > kernel_flame.svg

# 5. off-CPU flame graph (블로킹 시간 분석)
offcputime -df -p $(pgrep myapp) 30 | flamegraph.pl > offcpu.svg`

interface FlameNode {
    label: string
    widthPct: number
    color: string
    children?: FlameNode[]
}

const flameTreeData: FlameNode = {
    label: 'main',
    widthPct: 100,
    color: '#ef4444',
    children: [
        {
            label: 'process_request',
            widthPct: 70,
            color: '#f97316',
            children: [
                {
                    label: 'db_query',
                    widthPct: 40,
                    color: '#f59e0b',
                    children: [
                        { label: 'pg_exec', widthPct: 25, color: '#eab308' },
                        { label: 'pg_parse', widthPct: 15, color: '#84cc16' },
                    ],
                },
                { label: 'json_encode', widthPct: 30, color: '#22c55e' },
            ],
        },
        { label: 'idle', widthPct: 30, color: '#06b6d4' },
    ],
}

const flameInterpretCards = [
    {
        title: '넓은 평평한 상단 블록',
        color: '#ef4444',
        desc: '해당 함수가 CPU 사용량이 많음 → 최적화 대상',
    },
    {
        title: '좁고 깊은 타워',
        color: '#f97316',
        desc: '깊은 재귀 또는 많은 중간 호출 → 불필요한 추상화 확인',
    },
    {
        title: 'kernel 스택 넓게 나타남',
        color: '#8b5cf6',
        desc: '시스템 콜 또는 인터럽트 처리 병목',
    },
    {
        title: 'idle이 전체의 대부분',
        color: '#06b6d4',
        desc: 'CPU 바운드가 아닌 I/O 바운드 → off-CPU 분석 필요',
    },
]

const cpuTypeRows: TableRow[] = [
    { cells: ['on-CPU', 'CPU를 실제로 쓰는 시간', 'perf, bpftrace profile:'] },
    { cells: ['off-CPU', '블로킹(락, I/O) 대기 시간', 'offcputime (bcc), wakeuptime'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// Flame Graph mock visualisation component
// ─────────────────────────────────────────────────────────────────────────────

function FlameBlock({ node, offsetPct }: { node: FlameNode; offsetPct: number }) {
    return (
        <div
            style={{ width: `${node.widthPct}%`, marginLeft: `${offsetPct}%`, position: 'relative' }}
            className="flex flex-col-reverse"
        >
            {/* render children above (visually they appear above because of flex-col-reverse on parent) */}
            {node.children && node.children.length > 0 && (
                <div className="flex items-end w-full" style={{ position: 'relative' }}>
                    {node.children.map((child) => (
                        <FlameBlock key={child.label} node={child} offsetPct={0} />
                    ))}
                </div>
            )}
            <div
                title={`${node.label} — ${node.widthPct}%`}
                style={{ backgroundColor: node.color, width: '100%' }}
                className="h-8 flex items-center justify-center overflow-hidden border border-white/20 dark:border-black/30 cursor-default select-none rounded-sm"
            >
                <span className="text-white text-xs font-mono font-semibold truncate px-1">
                    {node.label} <span className="opacity-75">({node.widthPct}%)</span>
                </span>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function Topic10() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const renderProcTreeFn = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, w: number, h: number) => {
            renderProcTree(svg, w, h, isDark)
        },
        [isDark]
    )

    const renderNetworkBottleneckFn = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, w: number, h: number) => {
            renderNetworkBottleneck(svg, w, h, isDark)
        },
        [isDark]
    )

    return (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">
            {/* Header */}
            <header className="space-y-3">
                <p className="text-xs font-mono text-blue-500 dark:text-blue-400 uppercase tracking-widest">
                    Topic 11
                </p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    성능 분석과 디버깅
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    Performance Analysis & Debugging
                </p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                    dmesg, <T id="proc">/proc</T>, /sys, Oops/Panic, <T id="perf">perf</T>, <T id="ftrace">ftrace</T>, <T id="lockdep">lockdep</T>, <T id="kasan">KASAN</T>, kdump, container 디버깅
                </p>
            </header>

            {/* 11.1 /proc와 /sys 활용 */}
            <Section id="s111" title="11.1  /proc와 /sys 활용">
                <Prose>
                    <code className="font-mono text-blue-600 dark:text-blue-400">/proc</code>와{' '}
                    <code className="font-mono text-blue-600 dark:text-blue-400">/sys</code>는 커널이
          제공하는 가상 파일시스템입니다. 런타임 커널 상태를 파일 인터페이스로 노출하여 사용자
          공간에서 커널 내부 정보를 읽거나 파라미터를 조정할 수 있습니다.
                </Prose>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <D3Container
                        renderFn={renderProcTreeFn}
                        deps={[isDark]}
                        height={280}
                        zoomable={true}
                    />
                </div>
                <InfoTable headers={['명령어', '설명']} rows={procCmdRows} />
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 font-mono">
            /proc/net/ — 네트워크 상태 파일
                    </h3>
                    <CodeBlock code={procNetCode} language="bash" filename="# /proc/net/ 실전 활용" />
                </div>
            </Section>

            {/* 11.2 dmesg와 커널 로그 */}
            <Section id="s112" title="11.2  dmesg와 커널 로그">
                <Prose>
                    <code className="font-mono text-blue-600 dark:text-blue-400">printk()</code>로 출력된
          커널 메시지는 ring buffer에 저장됩니다.{' '}
                    <code className="font-mono text-blue-600 dark:text-blue-400">dmesg</code> 명령으로
          버퍼를 읽을 수 있으며 로그 레벨로 필터링할 수 있습니다.
                </Prose>
                <CodeBlock code={dmesgCode} language="bash" filename="dmesg 명령어" />
                <InfoTable headers={['레벨', '매크로', '용도']} rows={printkRows} />
            </Section>

            {/* 11.3 Oops / Panic 읽는 법 */}
            <Section id="s113" title="11.3  Oops / Panic 읽는 법">
                <Prose>
          커널 버그 발생 시 Oops 메시지가 출력됩니다. NULL 포인터 역참조, 스택 오버플로우 등
          심각한 오류는 시스템 Panic으로 이어질 수 있습니다. Oops 메시지를 읽는 능력이 커널
          디버깅의 핵심입니다.
                </Prose>
                <CodeBlock code={oopsExample} language="bash" filename="Oops 예시 출력" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            title: 'RIP',
                            color: '#ef4444',
                            desc: '오류 발생한 정확한 코드 위치. addr2line 또는 gdb로 심볼로 변환하여 소스 라인을 찾을 수 있습니다.',
                        },
                        {
                            title: '레지스터',
                            color: '#f59e0b',
                            desc: 'RAX=0은 NULL 포인터를 의미합니다. CR2는 page fault 주소를 저장합니다. RIP, RSP, RBP를 조합하면 실행 컨텍스트를 파악할 수 있습니다.',
                        },
                        {
                            title: 'Call Trace',
                            color: '#3b82f6',
                            desc: '호출 스택 역추적. 맨 위가 오류 지점이며 아래로 갈수록 이전 호출자입니다. ? 표시는 불확실한 프레임입니다.',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-xl border bg-white dark:bg-gray-900 p-4 space-y-2"
                            style={{ borderColor: card.color + '55' }}
                        >
                            <div
                                className="text-xs font-mono font-bold"
                                style={{ color: card.color }}
                            >
                                {card.title}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">
                                {card.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 11.4 kdump / crash */}
            <Section id="s114" title="11.4  kdump / crash — 프로덕션 크래시 사후 분석">
                <Prose>
          서버가 Kernel Panic으로 재부팅된 후, kdump가 저장한 메모리 덤프(vmcore)를 crash
          유틸리티로 분석합니다. 라이브 디버깅 없이 사후 분석 가능합니다.
                </Prose>
                <CodeBlock code={kdumpSetupCode} language="bash" filename="# kdump 설정" />
                <CodeBlock code={crashAnalysisCode} language="bash" filename="# crash 유틸리티로 vmcore 분석" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            title: '1. Kernel Panic 발생',
                            color: '#ef4444',
                            desc: 'kexec가 미리 로드한 crash 커널로 즉시 전환합니다. 기존 메모리 내용이 보존됩니다.',
                        },
                        {
                            title: '2. kdump 실행',
                            color: '#f59e0b',
                            desc: 'crash 커널이 부팅된 후 메모리 덤프를 /var/crash에 저장하고 재부팅합니다.',
                        },
                        {
                            title: '3. crash 분석',
                            color: '#3b82f6',
                            desc: 'vmcore + vmlinux로 크래시 시점의 메모리 상태를 완전히 복원하여 분석합니다.',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-xl border bg-white dark:bg-gray-900 p-4 space-y-2"
                            style={{ borderColor: card.color + '55' }}
                        >
                            <div
                                className="text-xs font-mono font-bold"
                                style={{ color: card.color }}
                            >
                                {card.title}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">
                                {card.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 11.5 perf 기초 */}
            <Section id="s115" title="11.5  perf 기초">
                <Prose>
                    <code className="font-mono text-blue-600 dark:text-blue-400">perf</code>는 커널 내장
          프로파일링 도구입니다. CPU 성능 카운터, 소프트웨어 이벤트, 트레이스포인트를 지원하며
          FlameGraph와 함께 사용하면 핫스팟을 직관적으로 파악할 수 있습니다.
                </Prose>
                <CodeBlock code={perfCode} language="bash" filename="perf 명령어" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { cmd: 'perf top', desc: '실시간 CPU 핫스팟', color: '#3b82f6' },
                        { cmd: 'perf record', desc: '샘플 수집', color: '#8b5cf6' },
                        { cmd: 'perf report', desc: '결과 분석', color: '#10b981' },
                        { cmd: 'perf stat', desc: '이벤트 카운트', color: '#f59e0b' },
                    ].map((item) => (
                        <div
                            key={item.cmd}
                            className="rounded-lg px-3 py-2.5"
                            style={{
                                background: item.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${item.color}44`,
                            }}
                        >
                            <div
                                className="font-mono text-xs font-bold mb-1"
                                style={{ color: item.color }}
                            >
                                {item.cmd}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 text-xs">{item.desc}</div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 11.6 ftrace */}
            <Section id="s116" title="11.6  ftrace">
                <Prose>
                    <T id="ftrace">ftrace</T>는 커널 함수 호출 추적 도구입니다.{' '}
                    <code className="font-mono text-blue-600 dark:text-blue-400">
            /sys/kernel/debug/tracing/
                    </code>{' '}
          인터페이스를 통해 제어하며 특정 함수, PID, 이벤트를 타겟팅하여 정밀하게 추적할 수
          있습니다.
                </Prose>
                <CodeBlock code={ftraceCode} language="bash" filename="ftrace 설정" />
                <div className="rounded-lg border border-blue-800/40 bg-blue-900/20 dark:bg-blue-950/30 px-4 py-3 text-xs text-blue-700 dark:text-blue-300">
                    <span className="font-bold text-blue-600 dark:text-blue-400">팁:</span>{' '}
                    <code className="font-mono">function_graph</code> tracer를 사용하면 함수 호출 트리와
          실행 시간을 함께 볼 수 있습니다. 네트워크 병목 분석 시{' '}
                    <code className="font-mono">tcp_*</code> 필터와 조합하면 매우 효과적입니다.
                </div>
            </Section>

            {/* 11.7 네트워크 병목 분석 */}
            <Section id="s117" title="11.7  네트워크 병목 분석">
                <Prose>
          네트워크 성능 문제는 NIC 드롭부터 애플리케이션 처리 지연까지 여러 계층에서 발생합니다.
          체크 우선순위에 따라 순서대로 점검하면 빠르게 병목 지점을 찾을 수 있습니다.
                </Prose>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <D3Container
                        renderFn={renderNetworkBottleneckFn}
                        deps={[isDark]}
                        height={200}
                    />
                </div>
                <InfoTable
                    headers={['위치', '확인 방법', '조치']}
                    rows={bottleneckTableRows}
                />
            </Section>

            {/* 11.8 sar */}
            <Section id="s118" title="11.8  sar를 이용한 시스템 모니터링">
                <Prose>
                    <code className="font-mono text-blue-600 dark:text-blue-400">sar</code>(System Activity
          Reporter)는 CPU, 메모리, 네트워크, 디스크 통계를 시계열로 수집합니다. cron으로 자동
          수집하면 문제 발생 시점의 시스템 상태를 사후 분석할 수 있습니다.
                </Prose>
                <CodeBlock code={sarCode} language="bash" filename="sar 명령어" />
            </Section>

            {/* 11.9 컨테이너 환경 디버깅 */}
            <Section id="s119" title="11.9  컨테이너 환경 디버깅">
                <Prose>
          컨테이너(Docker/K8s)는 cgroup과 namespace로 격리됩니다. OOM, 성능 저하 문제의 원인이
          컨테이너 내부인지 호스트인지 구분하는 방법입니다.
                </Prose>
                <CodeBlock code={containerCgroupCode} language="bash" filename="# 컨테이너 cgroup 디버깅" />
                <CodeBlock code={containerNamespaceCode} language="bash" filename="# namespace 디버깅" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            title: 'OOM 진단',
                            color: '#ef4444',
                            desc: 'memory.max 초과 → OOMKilled. memory.events를 확인하고 limit을 상향하거나 코드를 최적화합니다.',
                        },
                        {
                            title: 'CPU Throttle',
                            color: '#f59e0b',
                            desc: 'cpu.max quota 소진 → 응답 지연. cpu.stat의 throttled_time 값을 확인합니다.',
                        },
                        {
                            title: '네트워크 격리 문제',
                            color: '#3b82f6',
                            desc: 'nsenter로 컨테이너 내부에서 직접 ip, ss, tcpdump를 실행하여 네임스페이스 내부 상태를 진단합니다.',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-xl border bg-white dark:bg-gray-900 p-4 space-y-2"
                            style={{ borderColor: card.color + '55' }}
                        >
                            <div
                                className="text-xs font-mono font-bold"
                                style={{ color: card.color }}
                            >
                                {card.title}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">
                                {card.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 11.10 lockdep */}
            <Section id="s1110" title="11.10  lockdep — 잠금 순서 검증기">
                <Prose>
                    <code className="font-mono text-blue-600 dark:text-blue-400">lockdep</code>은 커널에
          내장된 동적 분석 도구로, 프로그램 실행 중 잠금 획득 순서를 추적하고{' '}
                    <strong className="text-gray-800 dark:text-gray-200">데드락 가능성</strong>을 런타임에
          감지합니다. <T id="lockdep">lockdep</T>은 실제 데드락이 발생하기 전에 경고합니다.
                </Prose>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-white dark:bg-gray-900 p-4 space-y-2">
                        <div className="text-xs font-mono font-bold text-red-500 dark:text-red-400">
              데드락 발생 상황
                        </div>
                        <pre className="text-xs font-mono text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre">{`CPU 0:            CPU 1:
lock(A)           lock(B)
lock(B) ← 대기   lock(A) ← 대기
          (서로 기다리며 교착)`}</pre>
                    </div>
                    <div className="rounded-xl border border-green-200 dark:border-green-800/50 bg-white dark:bg-gray-900 p-4 space-y-2">
                        <div className="text-xs font-mono font-bold text-green-600 dark:text-green-400">
              lockdep 감지
                        </div>
                        <pre className="text-xs font-mono text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre">{`lockdep가 잠금 순서 그래프 유지:
  A → B (CPU 0이 A 보유 중 B 획득)
  B → A (CPU 1이 B 보유 중 A 획득)
  → 사이클 감지 → 즉시 경고!
  (실제 교착 전에 잡아냄)`}</pre>
                    </div>
                </div>
                <CodeBlock code={lockdepEnableCode} language="bash" filename="# lockdep 활성화 및 분석" />
                <CodeBlock code={lockdepCodeCode} language="c" filename="# lockdep 친화적 코드 작성" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            title: 'AB-BA 데드락',
                            color: '#ef4444',
                            desc: '두 잠금을 반대 순서로 획득하는 패턴 감지',
                        },
                        {
                            title: '인터럽트 안전성',
                            color: '#f59e0b',
                            desc: '인터럽트 핸들러에서 프로세스 컨텍스트 잠금 획득 시도 감지',
                        },
                        {
                            title: '재귀 잠금',
                            color: '#8b5cf6',
                            desc: '같은 잠금을 두 번 획득하려는 시도 감지',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-xl border bg-white dark:bg-gray-900 p-4 space-y-2"
                            style={{ borderColor: card.color + '55' }}
                        >
                            <div className="text-xs font-mono font-bold" style={{ color: card.color }}>
                                {card.title}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">
                                {card.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 11.11 KASAN */}
            <Section id="s1111" title="11.11  KASAN — 메모리 버그 탐지기">
                <Prose>
                    <strong className="text-gray-800 dark:text-gray-200"><T id="kasan">KASAN</T> (Kernel Address Sanitizer)</strong>은
          커널의 메모리 안전성 버그를 런타임에 탐지합니다.{' '}
                    <code className="font-mono text-blue-600 dark:text-blue-400">use-after-free</code>,{' '}
                    <code className="font-mono text-blue-600 dark:text-blue-400">out-of-bounds</code> 접근
          같은 버그는 재현이 어렵고 보안 취약점으로 이어집니다. <T id="kasan">KASAN</T>은 이를 즉시 잡아냅니다.
                </Prose>
                <InfoTable
                    headers={['버그 유형', '설명', '위험성']}
                    rows={[
                        { cells: ['Use-after-free', '해제된 메모리 접근', '커널 익스플로잇의 주요 경로'] },
                        { cells: ['Out-of-bounds read', '버퍼 경계 밖 읽기', '정보 유출'] },
                        { cells: ['Out-of-bounds write', '버퍼 경계 밖 쓰기', '메모리 손상, 패닉'] },
                        { cells: ['Use-before-init', '초기화 전 메모리 사용', '예측 불가 동작'] },
                    ]}
                />
                <CodeBlock code={kasanEnableCode} language="bash" filename="# KASAN 활성화" />
                <CodeBlock code={kasanBugCode} language="c" filename="# KASAN이 잡는 버그 예시" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            title: 'KASAN',
                            color: '#ef4444',
                            desc: '메모리 접근 버그 (use-after-free, out-of-bounds) 탐지',
                        },
                        {
                            title: 'KMSAN (Kernel Memory Sanitizer)',
                            color: '#8b5cf6',
                            desc: '초기화되지 않은 메모리 사용 탐지',
                        },
                        {
                            title: 'kmemleak',
                            color: '#10b981',
                            desc: '커널 메모리 누수 탐지. cat /sys/kernel/debug/kmemleak 으로 조회',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-xl border bg-white dark:bg-gray-900 p-4 space-y-2"
                            style={{ borderColor: card.color + '55' }}
                        >
                            <div className="text-xs font-mono font-bold" style={{ color: card.color }}>
                                {card.title}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">
                                {card.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 11.12 Flame Graph */}
            <Section id="s1112" title="11.12  Flame Graph — CPU 병목 시각화">
                <Prose>
                    <strong className="text-gray-800 dark:text-gray-200">Flame Graph</strong>는
                    Brendan Gregg가 개발한 <strong>CPU 시간 사용 시각화</strong> 기법입니다.
                    함수 콜스택을 수평 방향으로 쌓아, 폭이 넓을수록 CPU를 많이 사용함을 직관적으로 표현합니다.{' '}
                    <code className="font-mono text-blue-600 dark:text-blue-400">perf record</code> →{' '}
                    <code className="font-mono text-blue-600 dark:text-blue-400">perf script</code> →{' '}
                    <code className="font-mono text-blue-600 dark:text-blue-400">FlameGraph</code> 스크립트
                    파이프라인으로 생성합니다.
                </Prose>

                {/* Axis legend */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                        { axis: 'X축', desc: '샘플 수 (시간 비율). 왼→오른쪽 순서는 의미 없음 (알파벳 순)' },
                        { axis: 'Y축', desc: '콜 스택 깊이. 아래가 호출자(caller), 위가 피호출자(callee)' },
                        { axis: '폭', desc: '해당 함수가 샘플에 등장한 횟수 → CPU 사용 비율' },
                        { axis: '색상', desc: '의미 없음(구분용). 빨간계열=유저 공간, 파란계열=커널 공간 관례' },
                    ].map((item) => (
                        <div
                            key={item.axis}
                            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-1"
                        >
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{item.axis}</span>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Mock flame graph visualisation */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 p-4 space-y-2">
                    <p className="text-xs font-mono text-gray-500 dark:text-gray-500 mb-3">
                        ▲ 콜스택 (위 = callee) &nbsp;|&nbsp; 폭 = CPU 사용 비율
                    </p>
                    <div className="w-full flex flex-col-reverse">
                        <FlameBlock node={flameTreeData} offsetPct={0} />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-600 pt-1">
                        * 모의 시각화 — 실제 flame graph는 SVG 인터랙티브로 열립니다
                    </p>
                </div>

                {/* Pipeline code */}
                <CodeBlock code={flameGenCode} language="bash" filename="# Flame Graph 생성 파이프라인" />

                {/* Interpretation cards */}
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">해석 예시</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {flameInterpretCards.map((card) => (
                        <div
                            key={card.title}
                            className="rounded-xl border bg-white dark:bg-gray-900 p-4 space-y-2"
                            style={{ borderColor: card.color + '55' }}
                        >
                            <div className="text-xs font-mono font-bold" style={{ color: card.color }}>
                                {card.title}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">
                                {card.desc}
                            </p>
                        </div>
                    ))}
                </div>

                {/* on-CPU vs off-CPU table */}
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">on-CPU vs off-CPU</p>
                <InfoTable
                    headers={['유형', '측정 대상', '도구']}
                    rows={cpuTypeRows}
                />
            </Section>

            <nav className="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 flex items-center justify-between">
                <div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">이전 토픽</div>
                    <a href="#/topic/10-drivers" className="font-semibold text-gray-900 dark:text-gray-200 text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        ← 10 · 디바이스 드라이버와 커널 모듈
                    </a>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">다음 토픽</div>
                    <a href="#/topic/12-security" className="font-semibold text-gray-900 dark:text-gray-200 text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        12 · Linux 보안 모델 →
                    </a>
                </div>
            </nav>
        </div>
    )
}

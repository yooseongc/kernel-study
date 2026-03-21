import { useState, useCallback } from 'react'
import { CodeBlock } from '../../components/viz/CodeBlock'
import { D3Container } from '../../components/viz/D3Container'
import { AnimatedDiagram } from '../../components/viz/AnimatedDiagram'
import { useTheme } from '../../hooks/useTheme'
import * as d3 from 'd3'
import { themeColors } from '../../lib/colors'
import { T } from '../../components/ui/GlossaryTooltip'
import { Section } from '../../components/ui/Section'
import { Prose } from '../../components/ui/Prose'

// ── 2.3 프로세스 상태 전이 D3 다이어그램 ────────────────────────────────────
function renderProcessStateDiagram(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    _width: number,
    _height: number
) {
    const VW = 700, VH = 290
    svg.attr('viewBox', `0 0 ${VW} ${VH}`).attr('preserveAspectRatio', 'xMidYMid meet')

    const isDark = document.documentElement.classList.contains('dark')
    const c = themeColors(isDark)
    const textFill  = c.text
    const dimFill   = c.textMuted
    const nodeFill  = c.bg
    const nodeStroke = c.border
    const runFill   = c.blueFill
    const runStroke = c.blueStroke
    const edgeColor = c.textMuted
    const labelFill = c.textMuted

    const defs = svg.append('defs')
    defs.append('marker')
        .attr('id', 'psd-arrow')
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 9).attr('refY', 5)
        .attr('markerWidth', 5).attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', edgeColor)

    const g = svg.append('g')
    const NH = 36, NR = 6
    const TY = 85, BY = 215
    const TBot = TY + NH / 2   // 103
    const BTop = BY - NH / 2   // 197

    // Node draw helper (2-line label)
    function drawNode(cx: number, cy: number, w: number, l1: string, l2: string,
        fill: string, stroke: string) {
        g.append('rect')
            .attr('x', cx - w / 2).attr('y', cy - NH / 2)
            .attr('width', w).attr('height', NH).attr('rx', NR)
            .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', 1.5)
        g.append('text')
            .attr('x', cx).attr('y', cy - 7)
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
            .attr('fill', textFill).attr('font-size', '11px').attr('font-family', 'monospace')
            .attr('font-weight', 'bold').text(l1)
        g.append('text')
            .attr('x', cx).attr('y', cy + 8)
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
            .attr('fill', dimFill).attr('font-size', '9px').attr('font-family', 'sans-serif')
            .text(l2)
    }

    // Arrow helper
    function arrow(d: string, label: string, lx: number, ly: number) {
        g.append('path').attr('d', d)
            .attr('fill', 'none').attr('stroke', edgeColor).attr('stroke-width', 1.3)
            .attr('marker-end', 'url(#psd-arrow)')
        if (label) {
            g.append('text')
                .attr('x', lx).attr('y', ly)
                .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
                .attr('fill', labelFill).attr('font-size', '9px').attr('font-family', 'sans-serif')
                .text(label)
        }
    }

    // Start dot
    g.append('circle').attr('cx', 25).attr('cy', TY).attr('r', 8).attr('fill', textFill)
    // End double-dot
    g.append('circle').attr('cx', 570).attr('cy', TY).attr('r', 10)
        .attr('fill', 'none').attr('stroke', textFill).attr('stroke-width', 1.5)
    g.append('circle').attr('cx', 570).attr('cy', TY).attr('r', 5).attr('fill', textFill)

    // Nodes
    drawNode(115, TY, 98,  'TASK_NEW',             'new',               nodeFill, nodeStroke)
    drawNode(292, TY, 148, 'TASK_RUNNING',          '(R) — 실행/런큐',  runFill,  runStroke)
    drawNode(456, TY, 118, 'EXIT_ZOMBIE',           '(Z) — 좀비',       nodeFill, nodeStroke)
    drawNode(110, BY, 148, 'TASK_INTERRUPTIBLE',    '(S) — 슬립',       nodeFill, nodeStroke)
    drawNode(292, BY, 158, 'TASK_UNINTERRUPTIBLE',  '(D) — 블록 I/O',   nodeFill, nodeStroke)
    drawNode(460, BY, 118, 'TASK_STOPPED',          '(T) — 정지',       nodeFill, nodeStroke)

    // ── Top row straight arrows ──
    arrow(`M 33,${TY} L 65,${TY}`,      'fork/clone',      50,  73)
    arrow(`M 164,${TY} L 218,${TY}`,    '스케줄러 선택',   191, 73)
    arrow(`M 366,${TY} L 397,${TY}`,    'exit()',           381, 73)
    arrow(`M 515,${TY} L 558,${TY}`,    '부모 wait()',      537, 73)

    // ── RUNNING ↔ INTERRUPTIBLE ──
    arrow(`M 257,${TBot} C 257,150 130,150 130,${BTop}`, 'sleep/I/O',   178, 157)
    arrow(`M 183,${BTop} C 183,135 268,135 268,${TBot}`, '시그널/이벤트', 215, 122)

    // ── RUNNING ↔ UNINTERRUPTIBLE (near-vertical) ──
    arrow(`M 280,${TBot} L 280,${BTop}`, '블록 I/O',  246, 140)
    arrow(`M 304,${BTop} L 304,${TBot}`, 'I/O 완료',  338, 162)

    // ── RUNNING ↔ STOPPED ──
    arrow(`M 327,${TBot} C 327,150 440,150 440,${BTop}`, 'SIGSTOP',  385, 157)
    arrow(`M 510,${BTop} C 510,135 316,135 316,${TBot}`, 'SIGCONT',  427, 122)
}

// ── 2.2 task_struct 코드 ────────────────────────────────────────────────────
const taskStructCode = `struct task_struct {
    /* ── 상태 ── */
    unsigned int        __state;      /* TASK_RUNNING, TASK_INTERRUPTIBLE, ... */
    int                 exit_state;   /* EXIT_ZOMBIE, EXIT_DEAD */

    /* ── 식별자 ── */
    pid_t               pid;          /* 이 태스크의 고유 ID */
    pid_t               tgid;         /* 스레드 그룹 ID (메인 스레드의 PID) */
    char                comm[16];     /* 프로세스 이름 (ps에서 보이는 이름) */

    /* ── 주소 공간 ── */
    struct mm_struct    *mm;          /* 가상 주소 공간 (NULL = 커널 스레드) */
    struct mm_struct    *active_mm;   /* 실제 사용 중인 mm (커널 스레드용) */

    /* ── 스케줄러 ── */
    int                 prio;         /* 동적 우선순위 (nice + 조정값) */
    int                 static_prio;  /* 정적 우선순위 (nice 값 기반) */
    struct sched_entity se;           /* CFS 스케줄링 엔티티 (vruntime 포함) */
    struct sched_rt_entity rt;        /* RT 스케줄러 엔티티 */
    const struct sched_class *sched_class; /* 소속 스케줄러 클래스 */

    /* ── 파일 시스템 ── */
    struct fs_struct    *fs;          /* 루트/현재 디렉토리 */
    struct files_struct *files;       /* 열린 파일 디스크립터 테이블 */

    /* ── 계층 구조 ── */
    struct task_struct  *parent;      /* 부모 프로세스 */
    struct list_head    children;     /* 자식 목록 */
    struct list_head    sibling;      /* 형제 목록 */

    /* ── 신호 ── */
    struct signal_struct *signal;     /* 스레드 그룹 공유 신호 정보 */
    sigset_t            blocked;      /* 블록된 시그널 마스크 */
};`

const schedEntityCode = `struct sched_entity {
    struct load_weight  load;       /* 이 엔티티의 CPU 가중치 */
    struct rb_node      run_node;   /* CFS 런큐의 Red-Black 트리 노드 */
    u64                 vruntime;   /* 가상 실행 시간 — CFS 정렬 기준 */
    u64                 exec_start; /* 마지막 실행 시작 시간 (ns) */
    u64                 sum_exec_runtime; /* 총 CPU 사용 시간 (ns) */
};`

// ── 2.10 스케줄러 통계 & 로드밸런싱 코드 ────────────────────────────────────
const schedstatCode = `# schedstat 형식: CPU별 통계
cat /proc/schedstat
# cpu0 0 0 731 659 731 659 3645037 1242 0
# 컬럼: yld_count, yld_act_count, sched_count, sched_goidle,
#        ttwu_count, ttwu_local, run_delay(ns), pcount

# 읽기 쉬운 형태로 파싱
awk '/^cpu[0-9]/ {
    printf "CPU%s: schedules=%s, run_delay=%sms\\n",
    substr($1,4), $8, $9/1000000
}' /proc/schedstat

# 특정 프로세스의 스케줄링 통계
cat /proc/$(pgrep nginx)/schedstat
# run_time(ns)  wait_time(ns)  timeslices
# 1234567890    9876543210     5678

# 스케줄러 레이턴시 확인 (schedtool)
schedtool -r $(pgrep nginx)  # RT 우선순위 확인`

const schedDebugCode = `# 전체 스케줄러 상태 덤프
cat /proc/sched_debug | head -60

# 주요 정보:
# .nr_running     : 현재 실행 가능한 태스크 수
# .load           : 런큐 부하 (weight 합계)
# cfs_rq->min_vruntime : CFS 최소 vruntime
# current         : 현재 실행 중인 태스크

# CPU별 런큐 부하 모니터링
watch -n 1 'grep "\\.load\\|nr_running\\|curr->" /proc/sched_debug | head -40'

# 태스크별 vruntime 확인 (CFS 트리 스냅샷)
cat /proc/sched_debug | grep -A3 "cfs_rq\\[0\\]"`

const loadBalanceCode = `/* 주기적 로드밸런싱 트리거 */
static void run_rebalance_domains(struct softirq_action *h)
{
    /* 현재 CPU의 런큐 부하 vs 다른 CPU 비교 */
    rebalance_domains(this_rq(), idle);
}

/* 불균형 감지 및 태스크 이동 */
static int load_balance(int this_cpu, struct rq *this_rq,
                         struct sched_domain *sd, ...)
{
    struct rq *busiest;

    /* 가장 바쁜 CPU 찾기 */
    busiest = find_busiest_queue(this_cpu, sd, ...);

    /* 태스크 이동 (busiest → this_rq) */
    ld_moved = move_tasks(this_rq, this_cpu, busiest, ...);

    return ld_moved;
}

/* 유휴 CPU 즉시 태스크 당기기 */
static int newidle_balance(struct rq *this_rq, ...)
{
    /* CPU가 idle 상태 진입 시 즉시 다른 CPU에서 태스크 가져옴 */
    pulled_task = load_balance(this_cpu, this_rq, sd, CPU_NEWLY_IDLE, ...);
}`

// ── 2.9 cgroups 코드 & 데이터 ───────────────────────────────────────────────
const cgroupFsCode = `# cgroup v2 파일시스템 구조 (/sys/fs/cgroup/)
/sys/fs/cgroup/
├── cgroup.controllers    # 활성 서브시스템: "cpuset cpu io memory pids"
├── cgroup.procs          # 이 cgroup에 속한 PID 목록
├── cpu.max               # 루트: "max 100000" (제한 없음)
├── memory.max            # 루트: "max"
│
├── system.slice/         # systemd 관리 서비스 그룹
│   ├── sshd.service/
│   └── nginx.service/
│       ├── memory.max    # "268435456" (256 MiB)
│       └── cgroup.procs  # nginx 워커 PID 목록
│
└── myapp/                # 수동 생성 cgroup
    ├── cpu.max           # "200000 1000000" (20% of 1 CPU)
    ├── memory.max        # "536870912" (512 MiB)
    └── cgroup.procs      # 이 그룹에 속할 PID 추가`

const cgroupCreateCode = `# cgroup v2: 그룹 생성 → 자원 제한 → 프로세스 이동

# 1. 디렉토리 생성 = cgroup 생성
mkdir /sys/fs/cgroup/myapp

# 2. CPU 제한: period 1,000,000 µs 중 200,000 µs 사용 (20%)
echo "200000 1000000" > /sys/fs/cgroup/myapp/cpu.max

# 3. 메모리 상한 512 MiB
echo "536870912" > /sys/fs/cgroup/myapp/memory.max

# 4. 현재 쉘을 그룹으로 이동 (이후 fork된 자식도 자동 소속)
echo $$ > /sys/fs/cgroup/myapp/cgroup.procs

# 5. 확인
cat /sys/fs/cgroup/myapp/cpu.stat`

const cgroupTaskStructCode = `struct task_struct {
    ...
    /* ── cgroup 연결 ── */
    struct css_set __rcu *cgroups;   /* 이 태스크가 속한 cgroup 세트 */
    struct list_head cg_list;        /* css_set 내 태스크 목록 노드 */
    ...
};

/* css_set: 각 서브시스템별 cgroup_subsys_state 포인터 집합 */
struct css_set {
    struct cgroup_subsys_state *subsys[CGROUP_SUBSYS_COUNT];
    /* cpu_cgroup, mem_cgroup, blkcg, ... */
    refcount_t refcount;
    struct list_head tasks; /* 이 css_set을 공유하는 task 목록 */
};`

const prioToWeightCode = `/* nice 값 → weight 변환 (kernel/sched/core.c) */
const int sched_prio_to_weight[40] = {
 /* -20 */     88761,  71755,  56483,  46273,  36291,
 /* -15 */     29154,  23254,  18705,  14949,  11916,
 /* -10 */      9548,   7620,   6100,   4904,   3906,
 /*  -5 */      3121,   2501,   1991,   1586,   1277,
 /*   0 */      1024,    820,    655,    526,    423,
 /*   5 */       335,    272,    215,    172,    137,
 /*  10 */       110,     87,     70,     56,     45,
 /*  15 */        36,     29,     23,     18,     15,
};

/* vruntime 업데이트 (CFS의 핵심) */
static void update_curr(struct cfs_rq *cfs_rq)
{
    u64 delta_exec = now - curr->exec_start;

    /* weight가 높을수록 vruntime 증가가 느려 더 많이 실행됨 */
    curr->vruntime += calc_delta_fair(delta_exec, curr);
}

static u64 calc_delta_fair(u64 delta, struct sched_entity *se)
{
    /* NICE_0_LOAD(1024) / se->load.weight 비율로 스케일 */
    return __calc_delta(delta, NICE_0_LOAD, &se->load);
}`

const scheduleCode = `/* 스케줄러 진입점 — 자발적/비자발적 컨텍스트 스위치 공통 경로 */
static void __sched notrace __schedule(unsigned int sched_mode)
{
    struct task_struct *prev, *next;
    struct rq *rq;

    rq = cpu_rq(cpu);
    prev = rq->curr;

    /* 1. 현재 태스크 상태 확인 */
    if (signal_pending_state(prev->__state, prev))
        prev->__state = TASK_RUNNING;

    /* 2. 다음 실행할 태스크 선택 */
    next = pick_next_task(rq, prev, &rf);
    /*   └─ stop_task → dl_task → rt_task → fair_task → idle_task
           (우선순위 순으로 클래스 탐색) */

    /* 3. 같은 태스크면 스위치 생략 */
    if (likely(prev != next)) {
        rq->nr_switches++;

        /* 4. 실제 컨텍스트 스위치 */
        rq = context_switch(rq, prev, next, &rf);
        /*   └─ switch_mm()  : 페이지 테이블 교체 (CR3 레지스터)
               switch_to()   : 스택/레지스터 교체 (어셈블리) */
    }
}

/* pick_next_task 내부 — 스케줄러 클래스 우선순위 */
static inline struct task_struct *
pick_next_task(struct rq *rq, struct task_struct *prev, ...)
{
    /* STOP > DEADLINE > RT > FAIR(CFS) > IDLE 순서 */
    for_each_class(class)
        if ((p = class->pick_next_task(rq)))
            return p;
}`

interface CgroupNode {
  name: string
  type: 'root' | 'system' | 'user' | 'custom' | 'service' | 'process'
  detail?: string
  children?: CgroupNode[]
}

const cgroupTreeData: CgroupNode = {
    name: '/ (root)',
    type: 'root',
    detail: 'cgroup v2',
    children: [
        {
            name: 'system.slice',
            type: 'system',
            detail: 'systemd 서비스',
            children: [
                { name: 'sshd.service', type: 'service', detail: 'cpu.max: max' },
                { name: 'nginx.service', type: 'service', detail: 'memory.max: 256M' },
            ],
        },
        {
            name: 'user.slice',
            type: 'user',
            detail: '사용자 세션',
            children: [
                {
                    name: 'user-1000.slice',
                    type: 'user',
                    detail: 'UID 1000',
                    children: [{ name: 'bash', type: 'process', detail: 'PID 1234' }],
                },
            ],
        },
        {
            name: 'myapp',
            type: 'custom',
            detail: 'cpu: 20% / mem: 512M',
            children: [
                { name: 'worker-1', type: 'process', detail: 'PID 5678' },
                { name: 'worker-2', type: 'process', detail: 'PID 5679' },
            ],
        },
    ],
}

function renderCgroupTree(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number
) {
    // 수평 트리 (좌→우). g 에 transform 없이 노드 좌표 자체에 패딩을 흡수시킨다.
    // → zoomable 이 g.transform 을 덮어써도 패딩이 유지됨.
    const isDark = document.documentElement.classList.contains('dark')
    const c = themeColors(isDark)
    const textFill = c.text
    const dimFill  = c.textMuted
    const linkColor = c.link

  type ColorPair = { fill: string; stroke: string; text: string }
  const colorMap: Record<string, ColorPair> = {
      root:    { fill: c.blueFill,   stroke: c.blueStroke,   text: c.blueText },
      system:  { fill: c.bgCard,     stroke: c.textDim,      text: c.textMuted },
      user:    { fill: c.greenFill,  stroke: c.greenStroke,  text: c.greenText },
      custom:  { fill: c.amberFill,  stroke: c.amberStroke,  text: c.amberText },
      service: { fill: c.bg,         stroke: c.textDim,      text: c.textMuted },
      process: { fill: c.cyanFill,   stroke: c.cyanStroke,   text: c.cyanText },
  }

  const NW = 104, NH = 34, NR = 6
  const padX = NW / 2 + 8   // 좌우 패딩 (노드 반폭 + 여유)
  const padY = NH / 2 + 8   // 상하 패딩 (노드 반높이 + 여유)
  const innerW = width  - padX * 2   // depth 방향 (가로)
  const innerH = height - padY * 2   // breadth 방향 (세로, leaves 분산)

  const root = d3.hierarchy<CgroupNode>(cgroupTreeData, d => d.children)
  // size([breadth, depth]): node.x ∈ [0,innerH], node.y ∈ [0,innerW]
  d3.tree<CgroupNode>().size([innerH, innerW])(root)
  // 패딩을 좌표에 직접 흡수 — g 는 transform 없음
  root.each(d => { (d as d3.HierarchyPointNode<CgroupNode>).y += padX; (d as d3.HierarchyPointNode<CgroupNode>).x += padY })

  const g = svg.append('g')  // transform 없음: zoomable 과 충돌 X

  // 링크: source 우측 끝 → target 좌측 끝 bezier
  g.selectAll('path.link')
      .data(root.links() as d3.HierarchyPointLink<CgroupNode>[])
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', linkColor)
      .attr('stroke-width', 1)
      .attr('d', d => {
          const sx = d.source.y + NW / 2, sy = d.source.x
          const tx = d.target.y - NW / 2, ty = d.target.x
          const mx = (sx + tx) / 2
          return `M ${sx},${sy} C ${mx},${sy} ${mx},${ty} ${tx},${ty}`
      })

  // node.y → 가로(depth), node.x → 세로(breadth)
  const nodeG = g.selectAll<SVGGElement, d3.HierarchyPointNode<CgroupNode>>('g.node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`)

  nodeG.append('rect')
      .attr('x', -NW / 2).attr('y', -NH / 2)
      .attr('width', NW).attr('height', NH).attr('rx', NR)
      .attr('fill', d => colorMap[d.data.type]?.fill ?? colorMap.service.fill)
      .attr('stroke', d => colorMap[d.data.type]?.stroke ?? colorMap.service.stroke)
      .attr('stroke-width', 1.5)

  nodeG.append('text')
      .attr('y', d => d.data.detail ? -5 : 0)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', d => colorMap[d.data.type]?.text ?? textFill)
      .attr('font-size', '10px').attr('font-family', 'monospace').attr('font-weight', 'bold')
      .text(d => d.data.name)

  nodeG.filter(d => !!d.data.detail)
      .append('text')
      .attr('y', 8)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', dimFill)
      .attr('font-size', '8px').attr('font-family', 'sans-serif')
      .text(d => d.data.detail ?? '')
}

// ── 2.4 CFS 트리 데이터 ─────────────────────────────────────────────────────
interface CfsNode {
  name: string
  vruntime: number
  nice: number
  color: 'red' | 'black'
  children?: CfsNode[]
}

const initialTree: CfsNode = {
    name: 'nginx', vruntime: 20, nice: 0, color: 'black',
    children: [
        {
            name: 'bash', vruntime: 12, nice: 0, color: 'red',
            children: [
                { name: 'init', vruntime: 8, nice: -5, color: 'black' },
            ]
        },
        {
            name: 'python', vruntime: 35, nice: 5, color: 'black',
            children: [
                { name: 'sshd', vruntime: 28, nice: 0, color: 'red' },
                { name: 'cron', vruntime: 48, nice: 10, color: 'red' },
            ]
        }
    ]
}

// Find leftmost node (min vruntime)
function findLeftmost(node: CfsNode): CfsNode {
    if (!node.children || node.children.length === 0) return node
    return findLeftmost(node.children[0])
}

// Remove leftmost node from tree (returns new tree)
function removeLeftmost(node: CfsNode): CfsNode | null {
    if (!node.children || node.children.length === 0) return null
    const newChildren = [...node.children]
    const replaced = removeLeftmost(newChildren[0])
    if (replaced === null) {
        newChildren.splice(0, 1)
    } else {
        newChildren[0] = replaced
    }
    return { ...node, children: newChildren.length > 0 ? newChildren : undefined }
}

// Insert node maintaining BST by vruntime
function insertNode(tree: CfsNode, newNode: CfsNode): CfsNode {
    if (newNode.vruntime < tree.vruntime) {
        const children = tree.children ? [...tree.children] : []
        if (children.length === 0 || newNode.vruntime < (children[0]?.vruntime ?? Infinity)) {
            // insert as leftmost child
            if (children.length === 0) {
                return { ...tree, children: [newNode] }
            }
            return { ...tree, children: [insertNode(children[0], newNode), ...children.slice(1)] }
        }
        return { ...tree, children: [insertNode(children[0], newNode), ...children.slice(1)] }
    } else {
        const children = tree.children ? [...tree.children] : []
        if (children.length < 2) {
            return { ...tree, children: [...children, newNode] }
        }
        return { ...tree, children: [children[0], insertNode(children[1], newNode)] }
    }
}

interface SelectedNodeInfo {
  name: string
  vruntime: number
  nice: number
  color: 'red' | 'black'
  isNext: boolean
}

function renderCFSTree(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number,
    treeData: CfsNode,
    onNodeClick: (info: SelectedNodeInfo) => void
) {
    const isDark = document.documentElement.classList.contains('dark')
    const c = themeColors(isDark)
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const margin = { top: 50, right: 40, bottom: 40, left: 40 }
    const innerW = width - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const root = d3.hierarchy<CfsNode>(treeData, d => d.children)
    const treeLayout = d3.tree<CfsNode>().size([innerW, innerH])
    treeLayout(root)

    const leftmostName = findLeftmost(treeData).name

    // Links
    const linkGen = d3.linkVertical<d3.HierarchyPointLink<CfsNode>, d3.HierarchyPointNode<CfsNode>>()
        .x(d => d.x)
        .y(d => d.y)

    g.selectAll('path.link')
        .data(root.links())
        .join('path')
        .attr('class', 'link')
        .attr('fill', 'none')
        .attr('stroke', c.textDim)
        .attr('stroke-width', 1.5)
        .attr('d', d => linkGen(d as d3.HierarchyPointLink<CfsNode>) ?? '')

    // Nodes
    const nodeG = g.selectAll<SVGGElement, d3.HierarchyPointNode<CfsNode>>('g.node')
        .data(root.descendants())
        .join('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .attr('cursor', 'pointer')
        .on('click', (_event, d) => {
            onNodeClick({
                name: d.data.name,
                vruntime: d.data.vruntime,
                nice: d.data.nice,
                color: d.data.color,
                isNext: d.data.name === leftmostName,
            })
        })

    const nodeR = 22

    // Node circle
    nodeG.append('circle')
        .attr('r', nodeR)
        .attr('fill', d => d.data.color === 'red' ? c.redFill : c.bgCard)
        .attr('stroke', d => {
            if (d.data.name === leftmostName) return c.blueStroke
            return d.data.color === 'red' ? c.redStroke : c.border
        })
        .attr('stroke-width', d => d.data.name === leftmostName ? 2.5 : 1.5)

    // Process name inside node
    nodeG.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('y', -3)
        .attr('fill', d => d.data.color === 'red' ? c.redText : c.text)
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .attr('pointer-events', 'none')
        .text(d => d.data.name)

    // vruntime below node name
    nodeG.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('y', 8)
        .attr('fill', d => d.data.color === 'red' ? c.redStroke : c.textMuted)
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .attr('pointer-events', 'none')
        .text(d => `${d.data.vruntime}ms`)

    // NEXT label for leftmost node
    nodeG.filter(d => d.data.name === leftmostName)
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('y', -nodeR - 8)
        .attr('fill', c.blueText)
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'monospace')
        .attr('pointer-events', 'none')
        .text('▶ NEXT')
}

// ── 2.5 컨텍스트 스위치 steps ───────────────────────────────────────────────
const contextSwitchSteps = [
    { label: '① Process A 실행 중', description: 'CPU가 Process A의 코드를 실행하고 있습니다. 레지스터(PC, SP, 범용 레지스터)는 모두 A의 상태입니다.' },
    { label: '② 타이머 인터럽트 발생', description: '10ms마다 발생하는 타이머 IRQ가 CPU를 가로챕니다. 커널의 인터럽트 핸들러가 실행됩니다.' },
    { label: '③ Process A 컨텍스트 저장', description: 'switch_to() 매크로가 현재 레지스터 값을 A의 task_struct.thread에 저장합니다. A의 vruntime이 증가합니다.' },
    { label: '④ CFS — 다음 프로세스 선택', description: 'pick_next_task_fair()가 런큐 RB트리에서 가장 왼쪽 노드(최소 vruntime)를 O(1)로 선택합니다.' },
    { label: '⑤ Process B 컨텍스트 복원', description: 'B의 task_struct.thread에서 레지스터를 CPU에 로드합니다. 페이지 테이블도 B의 것으로 교체(CR3 레지스터)됩니다.' },
    { label: '⑥ Process B 실행 중', description: 'CPU가 B가 마지막으로 실행하던 지점(PC가 가리키는 명령)부터 재개합니다. A는 런큐에서 대기합니다.' },
]

const cpuRegs = [
    { owner: 'A', pc: '0x401234', sp: '0x7fff8a10', rax: '0x0000003c', rbx: '0x00000000', note: '' },
    { owner: 'A', pc: '0x401234', sp: '0x7fff8a10', rax: '0x0000003c', rbx: '0x00000000', note: '⚡ IRQ #0' },
    { owner: '...', pc: 'saving...', sp: 'saving...', rax: 'saving...', rbx: 'saving...', note: '→ A의 task_struct' },
    { owner: 'CFS', pc: 'pick_next', sp: 'pick_next', rax: 'pick_next', rbx: 'pick_next', note: '최소 vruntime 선택' },
    { owner: '...', pc: 'loading...', sp: 'loading...', rax: 'loading...', rbx: 'loading...', note: 'B의 task_struct →' },
    { owner: 'B', pc: '0x402a80', sp: '0x7ffe1234', rax: '0x00000001', rbx: '0x00000002', note: '' },
]

const processAStates = ['RUNNING', 'INTERRUPTED', 'SAVING', 'SAVED', 'WAITING', 'WAITING']
const processAColors = ['green', 'orange', 'yellow', 'gray', 'gray', 'gray']
const processAVruntime = ['12.4ms', '12.4ms', '15.1ms', '15.1ms', '15.1ms', '15.1ms']

const processBStates = ['WAITING', 'WAITING', 'WAITING', 'NEXT', 'LOADING', 'RUNNING']
const processBColors = ['gray', 'gray', 'gray', 'blue', 'yellow', 'green']
const processBVruntime = ['8.2ms', '8.2ms', '8.2ms', '8.2ms', '8.2ms', '8.2ms']

function getBlockClasses(color: string) {
    switch (color) {
        case 'green': return 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600'
        case 'orange': return 'bg-orange-100 dark:bg-orange-900/30 border-orange-400 dark:border-orange-600'
        case 'yellow': return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600'
        case 'blue': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600'
        case 'gray':
        default:
            return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
    }
}

function getStateTextColor(color: string) {
    switch (color) {
        case 'green': return 'text-green-700 dark:text-green-300'
        case 'orange': return 'text-orange-700 dark:text-orange-300'
        case 'yellow': return 'text-yellow-700 dark:text-yellow-300'
        case 'blue': return 'text-blue-700 dark:text-blue-300'
        default: return 'text-gray-500 dark:text-gray-400'
    }
}

function ContextSwitchViz({ step }: { step: number }) {
    const aColor = processAColors[step]
    const bColor = processBColors[step]
    const reg = cpuRegs[step]

    const showArrowAtoC = step === 2
    const showArrowCtoB = step === 4
    const cpuGlow = step === 3

    return (
        <div className="flex flex-col gap-3 p-2">
            <div className="flex items-stretch gap-2">
                {/* Process A */}
                <div className={`flex-1 rounded-lg border-2 p-3 min-h-[160px] transition-all duration-300 ${getBlockClasses(aColor)}`}>
                    <div className="text-xs font-bold font-mono text-gray-500 dark:text-gray-400 mb-2">Process A</div>
                    <div className={`text-sm font-bold font-mono mb-2 ${getStateTextColor(aColor)}`}>
                        {processAStates[step]}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <div><span className="font-mono">PID:</span> 1234</div>
                        <div><span className="font-mono">vruntime:</span> {processAVruntime[step]}</div>
                        <div><span className="font-mono">nice:</span> 0</div>
                    </div>
                    {step === 1 && (
                        <div className="mt-2 text-xs bg-orange-200 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded px-2 py-1 font-mono">
              ⚡ IRQ #0 수신
                        </div>
                    )}
                </div>

                {/* Arrow A→CPU */}
                <div className="flex flex-col items-center justify-center w-8 shrink-0">
                    <div
                        className="text-blue-400 text-lg transition-opacity duration-300 font-bold"
                        style={{ opacity: showArrowAtoC ? 1 : 0 }}
                    >
            →
                    </div>
                </div>

                {/* CPU */}
                <div className={`flex-1 rounded-lg border-2 p-3 min-h-[160px] transition-all duration-300 ${
                    cpuGlow
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600'
                        : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
                }`}>
                    <div className="text-xs font-bold font-mono text-gray-500 dark:text-gray-400 mb-2">
            CPU {cpuGlow ? '(CFS 선택 중)' : `(owner: ${reg.owner})`}
                    </div>
                    <div className="text-xs font-mono space-y-1">
                        <div><span className="text-gray-500 dark:text-gray-400">PC: </span><span className="text-green-600 dark:text-green-400">{reg.pc}</span></div>
                        <div><span className="text-gray-500 dark:text-gray-400">SP: </span><span className="text-green-600 dark:text-green-400">{reg.sp}</span></div>
                        <div><span className="text-gray-500 dark:text-gray-400">RAX:</span><span className="text-yellow-600 dark:text-yellow-400"> {reg.rax}</span></div>
                        <div><span className="text-gray-500 dark:text-gray-400">RBX:</span><span className="text-yellow-600 dark:text-yellow-400"> {reg.rbx}</span></div>
                    </div>
                    {reg.note && (
                        <div className="mt-2 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded px-2 py-1 font-mono">
                            {reg.note}
                        </div>
                    )}
                </div>

                {/* Arrow CPU→B */}
                <div className="flex flex-col items-center justify-center w-8 shrink-0">
                    <div
                        className="text-blue-400 text-lg transition-opacity duration-300 font-bold"
                        style={{ opacity: showArrowCtoB ? 1 : 0 }}
                    >
            →
                    </div>
                </div>

                {/* Process B */}
                <div className={`flex-1 rounded-lg border-2 p-3 min-h-[160px] transition-all duration-300 ${getBlockClasses(bColor)}`}>
                    <div className="text-xs font-bold font-mono text-gray-500 dark:text-gray-400 mb-2">Process B</div>
                    <div className={`text-sm font-bold font-mono mb-2 ${getStateTextColor(bColor)}`}>
                        {processBStates[step]}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <div><span className="font-mono">PID:</span> 5678</div>
                        <div><span className="font-mono">vruntime:</span> {processBVruntime[step]}</div>
                        <div><span className="font-mono">nice:</span> 0</div>
                    </div>
                    {step === 3 && (
                        <div className="mt-2 text-xs bg-blue-200 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded px-2 py-1 font-mono">
              ▶ 최소 vruntime
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function Topic02Scheduler() {
    const { theme } = useTheme()
    const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>(null)
    const [cfsTree, setCfsTree] = useState<CfsNode>(initialTree)
    const [simCount, setSimCount] = useState(0)

    const handleNodeClick = useCallback((info: SelectedNodeInfo) => {
        setSelectedNode(info)
    }, [])

    const handleSimulate = useCallback(() => {
        void findLeftmost(cfsTree) // consumed for side effect (vruntime reference)

        const newProcessNames = ['vim', 'grep', 'curl', 'node', 'go', 'rustc', 'docker', 'kubectl']
        const niceValues = [-5, 0, 0, 5, 10, 0, -5, 5]
        const rbColors: Array<'red' | 'black'> = ['red', 'black', 'red', 'black', 'red', 'black', 'red', 'black']
        const idx = simCount % newProcessNames.length
        const insertVruntime = 15 + Math.floor(Math.random() * 30)

        // Remove leftmost, insert new node
        const afterRemove = removeLeftmost(cfsTree)
        if (!afterRemove) {
            setCfsTree(initialTree)
            setSimCount(0)
            return
        }

        const newNode: CfsNode = {
            name: newProcessNames[idx],
            vruntime: insertVruntime,
            nice: niceValues[idx],
            color: rbColors[idx],
        }

        const newTree = insertNode(afterRemove, newNode)
        setCfsTree(newTree)
        setSimCount(c => c + 1)
        setSelectedNode(null)
    }, [cfsTree, simCount])

    const renderProcessState = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, w: number, h: number) => {
            renderProcessStateDiagram(svg, w, h)
        },
        [theme]
    )

    const renderCgroupTreeCb = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, w: number, h: number) => {
            renderCgroupTree(svg, w, h)
        },
        [theme]
    )

    const renderCFSWithState = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, w: number, h: number) => {
            renderCFSTree(svg, w, h, cfsTree, handleNodeClick)
        },
        [cfsTree, handleNodeClick]
    )

    return (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">
            {/* Header */}
            <header className="space-y-3">
                <p className="text-xs font-mono text-blue-500 dark:text-blue-400 uppercase tracking-widest">
                    Topic 02
                </p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    프로세스, 스레드, 스케줄러
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    Processes, Threads &amp; Scheduler
                </p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                    리눅스에서 프로세스와 스레드는 어떻게 다를까요? 커널은 어떻게 수백 개의 프로세스를 공정하게 CPU에 스케줄링할까요?
                    이 페이지에서는 <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">task_struct</code>,
                    <T id="cfs">CFS</T> 스케줄러, 그리고 <T id="context_switch">컨텍스트 스위치</T>를 시각적으로 탐구합니다.
                </p>
            </header>

            {/* 2.1 프로세스와 스레드 */}
            <Section id="s21" title="2.1  프로세스와 스레드">
                <Prose>
                    리눅스 커널의 관점에서 프로세스와 스레드는 근본적으로 같은 존재입니다.
                    둘 다 <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">task_struct</code>로 표현되며,
                    차이는 오직 <strong className="text-gray-900 dark:text-gray-100">어떤 자원을 공유하느냐</strong>에 있습니다.
                    스레드는 <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">clone()</code> 호출 시
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">CLONE_THREAD</code> 플래그로 생성한
                    "자원 공유 프로세스"입니다.
                </Prose>

                {/* 비교 테이블 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">프로세스 vs 스레드 비교</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left px-4 py-2.5 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">구분</th>
                                    <th className="text-left px-4 py-2.5 text-blue-600 dark:text-blue-400 font-semibold text-xs uppercase tracking-wide">프로세스</th>
                                    <th className="text-left px-4 py-2.5 text-green-600 dark:text-green-400 font-semibold text-xs uppercase tracking-wide">스레드</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {[
                                    ['생성 시스템 콜', 'fork()', 'clone(CLONE_THREAD)'],
                                    ['주소 공간', '독립적 (mm_struct 복사)', '공유 (같은 mm_struct)'],
                                    ['파일 디스크립터', '독립적 (복사)', '공유'],
                                    ['신호 처리', '독립적', '같은 스레드 그룹'],
                                    ['생성 비용', '높음', '낮음'],
                                    ['PID/TGID', 'PID == TGID', 'PID != TGID (TGID = 메인 스레드)'],
                                ].map(([key, proc, thread]) => (
                                    <tr key={key} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                        <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400 font-semibold">{key}</td>
                                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{proc}</td>
                                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{thread}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 팁 박스 */}
                <div className="flex gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/50 rounded-xl text-sm text-yellow-800 dark:text-yellow-200">
                    <span className="text-lg shrink-0">💡</span>
                    <span>
            리눅스에서 스레드는 특별한 존재가 아닙니다.{' '}
                        <code className="bg-yellow-100 dark:bg-yellow-900/50 px-1 rounded font-mono text-xs">clone()</code>{' '}
            시스템 콜로 생성된, 자원을 공유하는 프로세스일 뿐입니다.
                    </span>
                </div>
            </Section>

            {/* 2.2 task_struct */}
            <Section id="s22" title="2.2  task_struct 심층 탐색">
                <Prose>
                    커널에서 모든 프로세스/스레드는 <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">task_struct</code>라는
                    거대한 구조체로 표현됩니다.
                    실제 커널 소스에서 이 구조체는 수백 개의 필드를 가지며, 스케줄링·메모리·파일·시그널 등 모든 정보를 담습니다.
                </Prose>
                <CodeBlock code={taskStructCode} language="c" filename="include/linux/sched.h" />

                <Prose>
                    스케줄링 핵심은 내부에 포함된{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">sched_entity</code>{' '}
                    구조체에 있습니다. <T id="cfs">CFS</T>가 사용하는 <strong className="text-gray-900 dark:text-gray-100">vruntime</strong>이 여기 저장됩니다.
                </Prose>
                <CodeBlock code={schedEntityCode} language="c" filename="include/linux/sched.h" />
            </Section>

            {/* 2.3 프로세스 상태 전이 */}
            <Section id="s23" title="2.3  프로세스 상태 전이">
                <Prose>
                    프로세스는 생애 주기 동안 여러 상태 사이를 전이합니다.
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">task_struct.__state</code>에
                    현재 상태가 비트 플래그로 저장됩니다.
                </Prose>

                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-2">
                    <D3Container renderFn={renderProcessState} height={290} deps={[theme]} />
                </div>

                {/* 상태 설명 표 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">상태 코드 및 전환 트리거</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left px-4 py-2.5 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">상태 (ps)</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">값</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">설명</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">진입 트리거</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">탈출 트리거</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {[
                                    ['TASK_NEW', '—', '막 생성된 프로세스. 아직 런큐에 없음', 'fork() / clone()', '스케줄러가 런큐에 추가'],
                                    ['TASK_RUNNING', '0 / R', 'CPU 실행 중 또는 런큐 대기 중', '스케줄러 선택 / 슬립에서 깨어남', 'sleep(), exit(), SIGSTOP'],
                                    ['TASK_INTERRUPTIBLE', '1 / S', '시그널로 깨울 수 있는 슬립', 'wait_event(), sleep()', '시그널 수신 / 이벤트 완료'],
                                    ['TASK_UNINTERRUPTIBLE', '2 / D', '시그널로도 못 깨우는 슬립. 블록 I/O 전용. 소켓/네트워크 I/O는 INTERRUPTIBLE 사용', '블록 디바이스 I/O 대기 (디스크 read 등)', 'I/O 완료 (인터럽트)'],
                                    ['TASK_STOPPED', '4 / T', 'SIGSTOP 또는 디버거(ptrace)에 의해 정지', 'SIGSTOP, ptrace attach', 'SIGCONT 수신'],
                                    ['EXIT_ZOMBIE', '16 / Z', '종료됐지만 부모가 wait() 미호출. 좀비 상태', 'exit() 호출', '부모 프로세스의 wait() / waitpid()'],
                                ].map(([state, val, desc, enter, exit_]) => (
                                    <tr key={state} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                        <td className="px-4 py-2.5 font-mono text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">{state}</td>
                                        <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{val}</td>
                                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 text-xs">{desc}</td>
                                        <td className="px-4 py-2.5 text-green-700 dark:text-green-400 text-xs">{enter}</td>
                                        <td className="px-4 py-2.5 text-orange-600 dark:text-orange-400 text-xs">{exit_}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Section>

            {/* 2.4.0 O(1) 스케줄러 역사 → CFS 전환 이유 */}
            <Section id="s24" title="2.4  스케줄러의 역사 — O(1)에서 CFS로">
                <Prose>
                    리눅스 스케줄러는 커널 2.6 시절의 O(1) 스케줄러에서 2.6.23(2007년)부터 <T id="cfs">CFS</T>로 교체되었습니다.
                    두 접근 방식의 차이를 이해하면 <T id="cfs">CFS</T> 설계 철학을 더 명확히 파악할 수 있습니다.
                </Prose>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* O(1) 스케줄러 */}
                    <div className="rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/20 p-4 space-y-3">
                        <div className="font-semibold text-orange-800 dark:text-orange-300">O(1) 스케줄러 (커널 2.6 ~ 2.6.22)</div>
                        <div className="text-xs text-orange-700 dark:text-orange-400 leading-relaxed space-y-1.5">
                            <p>140개의 우선순위 큐 배열을 유지. 비트맵으로 비어있지 않은 최고 우선순위 큐를 즉시 선택 → 런큐 선택이 O(1).</p>
                            <p>
                                <strong>문제점:</strong> 인터랙티브 프로세스(게임·멀티미디어)와 배치 프로세스를 구분하는
                휴리스틱 로직이 매우 복잡했습니다. 수면/실행 비율로 인터랙티브성을 추정했지만 엣지 케이스에서
                불규칙한 레이턴시가 발생했습니다.
                            </p>
                            <p>Ingo Molnar가 작성, 2001~2007년 사용.</p>
                        </div>
                        <div className="rounded-lg bg-orange-100 dark:bg-orange-900/30 p-2.5 font-mono text-xs text-orange-800 dark:text-orange-300">
                            <div>우선순위 큐 ×140 + 비트맵</div>
                            <div className="text-orange-500 dark:text-orange-500">→ 인터랙티브 휴리스틱 복잡도 ↑</div>
                        </div>
                    </div>

                    {/* CFS */}
                    <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20 p-4 space-y-3">
                        <div className="font-semibold text-blue-800 dark:text-blue-300">CFS — Completely Fair Scheduler (2.6.23+)</div>
                        <div className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed space-y-1.5">
                            <p>Red-Black 트리를 vruntime 기준으로 정렬. 가장 왼쪽 노드(최소 vruntime)가 항상 다음 실행 대상.</p>
                            <p>
                                <strong>공정성 원칙:</strong> 모든 프로세스가 이상적으로 동시에 실행되는 것처럼 vruntime을
                균등하게 증가시킵니다. 인터랙티브·배치 구분 없이 단일 알고리즘으로 처리.
                            </p>
                            <p>Con Kolivas의 SD 스케줄러 아이디어를 Ingo Molnar가 발전시켜 메인라인에 통합.</p>
                        </div>
                        <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2.5 font-mono text-xs text-blue-800 dark:text-blue-300">
                            <div>Red-Black 트리 (vruntime 정렬)</div>
                            <div className="text-blue-500 dark:text-blue-500">→ 단일 알고리즘, 공정성 보장</div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* 2.4 CFS 스케줄러 */}
            <Section id="s241" title="2.4  CFS 스케줄러 — vruntime과 Red-Black 트리">
                <Prose>
                    <T id="cfs">CFS</T>(Completely Fair Scheduler)는 모든 프로세스에게 공정한 CPU 시간을 주기 위해{' '}
                    <strong className="text-gray-900 dark:text-gray-100">vruntime(가상 실행 시간)</strong>을 사용합니다.
                    vruntime이 가장 작은 프로세스 = 가장 덜 실행된 프로세스 = 다음 실행 대상.
                    이를 빠르게 찾기 위해 <strong className="text-gray-900 dark:text-gray-100">Red-Black 트리(자가 균형 BST)</strong>를 사용합니다.
                    트리의 가장 왼쪽 노드가 항상 다음 실행 대상입니다.
                </Prose>

                <div className="flex gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/50 rounded-xl text-sm text-yellow-800 dark:text-yellow-200">
                    <span className="text-lg shrink-0">💡</span>
                    <span>
            vruntime은 실제 실행 시간을 nice 값(우선순위)으로 보정한 값입니다.
            nice=-20(높은 우선순위)은 vruntime이 천천히 증가하고,
            nice=+19(낮은 우선순위)는 빠르게 증가합니다.
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* CFS 트리 */}
                    <div className="md:col-span-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                        <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">CFS 런큐 — Red-Black 트리 (vruntime 기준 BST)</span>
                            <button
                                onClick={handleSimulate}
                                className="text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono transition-colors"
                            >
                ▶ 스케줄링 시뮬레이션
                            </button>
                        </div>
                        <D3Container
                            renderFn={renderCFSWithState}
                            deps={[cfsTree]}
                            height={300}
                            zoomable
                        />
                    </div>

                    {/* 노드 정보 패널 */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4">
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              선택된 프로세스 정보
                        </div>
                        {selectedNode ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono"
                                        style={{
                                            background: selectedNode.color === 'red' ? '#ef444433' : '#1f293766',
                                            border: `2px solid ${selectedNode.color === 'red' ? '#ef4444' : '#e5e7eb'}`,
                                            color: selectedNode.color === 'red' ? '#fca5a5' : '#e5e7eb',
                                        }}
                                    >
                                        {selectedNode.name.slice(0, 2)}
                                    </span>
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-gray-100 font-mono">{selectedNode.name}</div>
                                        <div className="text-xs" style={{ color: selectedNode.color === 'red' ? '#ef4444' : '#9ca3af' }}>
                                            {selectedNode.color === 'red' ? 'RED node' : 'BLACK node'}
                                        </div>
                                    </div>
                                    {selectedNode.isNext && (
                                        <span className="ml-auto text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full px-2 py-0.5 font-mono">
                      NEXT
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">vruntime</span>
                                        <span className="font-mono text-gray-900 dark:text-gray-100">{selectedNode.vruntime}ms</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">nice</span>
                                        <span className="font-mono text-gray-900 dark:text-gray-100">{selectedNode.nice}</span>
                                    </div>
                                </div>
                                {selectedNode.isNext && (
                                    <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-2.5 text-xs text-blue-700 dark:text-blue-300">
                    이 프로세스가 RB 트리에서 가장 왼쪽(최소 vruntime) 노드입니다.
                    다음 타임슬라이스에 CPU를 할당받습니다.
                                    </div>
                                )}
                                {!selectedNode.isNext && (
                                    <div className="text-xs text-gray-400 dark:text-gray-500">
                    다음 실행까지: 약 {selectedNode.vruntime - findLeftmost(cfsTree).vruntime}ms 더 대기
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-400 dark:text-gray-600 text-center py-8">
                노드를 클릭하면<br />정보가 표시됩니다
                            </div>
                        )}
                    </div>
                </div>

                {/* nice / priority / weight 관계 */}
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mt-6">
          nice / priority / weight — CFS 핵심 수식
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
          nice 값은 프로세스의 상대적 CPU 우선순위를 나타냅니다.{' '}
                    <strong className="text-gray-900 dark:text-gray-100">-20이 최고 우선순위, +19가 최저 우선순위</strong>이며,
          커널은 이를 내부적으로 weight(가중치)로 변환하여 vruntime 증가 속도를 조절합니다.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* nice → weight 테이블 */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                        <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">nice → weight 변환 (대표값)</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th className="text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">nice</th>
                                        <th className="text-right px-4 py-2 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">weight</th>
                                        <th className="text-right px-4 py-2 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">상대 비율</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {[
                                        ['-20', '88761', '×86.7'],
                                        ['-10', '9548',  '×9.3'],
                                        ['0 (기본)', '1024', '×1.0'],
                                        ['+10', '110',   '×0.11'],
                                        ['+19', '15',    '×0.015'],
                                    ].map(([nice, weight, ratio]) => (
                                        <tr key={nice} className={`hover:bg-gray-50 dark:hover:bg-gray-900/50${nice === '0 (기본)' ? ' bg-blue-50 dark:bg-blue-950/20' : ''}`}>
                                            <td className="px-4 py-2 font-mono text-xs text-purple-600 dark:text-purple-400">{nice}</td>
                                            <td className="px-4 py-2 font-mono text-xs text-right text-gray-900 dark:text-gray-100">{weight}</td>
                                            <td className="px-4 py-2 font-mono text-xs text-right text-green-600 dark:text-green-400">{ratio}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* vruntime 공식 설명 */}
                    <div className="space-y-3">
                        <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-950/20 p-4">
                            <div className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-2">vruntime 계산 공식</div>
                            <div className="rounded-lg bg-indigo-100 dark:bg-indigo-900/40 p-3 font-mono text-xs text-indigo-900 dark:text-indigo-200 text-center">
                vruntime += delta_exec × (NICE_0_LOAD / weight)
                            </div>
                            <ul className="mt-3 text-xs text-indigo-700 dark:text-indigo-400 space-y-1.5 leading-relaxed">
                                <li>• <strong>NICE_0_LOAD = 1024</strong> (nice 0의 기준 weight)</li>
                                <li>• weight가 클수록(낮은 nice) vruntime 증가가 <strong>느림</strong> → 더 많이 실행</li>
                                <li>• weight가 작을수록(높은 nice) vruntime 증가가 <strong>빠름</strong> → 덜 실행</li>
                                <li>• nice 값 1 차이 ≈ CPU 시간 약 10% 차이</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <CodeBlock code={prioToWeightCode} language="c" filename="kernel/sched/fair.c" />
            </Section>

            {/* 2.5 컨텍스트 스위치 */}
            <Section id="s25" title="2.5  컨텍스트 스위치 단계별 애니메이션">
                <Prose>
                    <T id="context_switch">컨텍스트 스위치</T>는 커널이 현재 실행 중인 프로세스를 바꾸는 과정입니다.
                    CPU 레지스터 전체를 저장하고 복원해야 하므로 일반 함수 호출보다 수백~수천 배 비쌉니다.
                    아래 애니메이션으로 각 단계를 살펴보세요.
                </Prose>
                <AnimatedDiagram
                    steps={contextSwitchSteps}
                    renderStep={(step) => <ContextSwitchViz step={step} />}
                    autoPlayInterval={2500}
                />
            </Section>

            {/* 2.5.1 __schedule() 콜스택 */}
            <Section id="s251" title="2.5.1  __schedule() 콜스택 분석">
                <Prose>
                    자발적·비자발적 <T id="context_switch">컨텍스트 스위치</T> 모두{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">__schedule()</code>을 공통 진입점으로 사용합니다.
                    내부에서 <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">pick_next_task()</code>가
                    스케줄러 클래스를{' '}
                    <strong className="text-gray-900 dark:text-gray-100">STOP → DEADLINE → RT → CFS(FAIR) → IDLE</strong>{' '}
                    순서로 탐색하여 다음 실행할 태스크를 결정합니다.
                </Prose>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs text-center">
                    {[
                        { label: 'STOP', color: 'red', desc: '마이그레이션\n스레드' },
                        { label: 'DEADLINE', color: 'orange', desc: 'EDF 실시간\n태스크' },
                        { label: 'RT', color: 'yellow', desc: 'FIFO / RR\n실시간' },
                        { label: 'CFS (FAIR)', color: 'blue', desc: '일반 프로세스\n대부분 여기' },
                        { label: 'IDLE', color: 'gray', desc: '실행할\n태스크 없을 때' },
                    ].map(({ label, color, desc }, i) => (
                        <div key={label} className={`rounded-xl border p-3 space-y-1.5
              ${color === 'red'    ? 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20' : ''}
              ${color === 'orange' ? 'border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/20' : ''}
              ${color === 'yellow' ? 'border-yellow-200 dark:border-yellow-900/50 bg-yellow-50 dark:bg-yellow-950/20' : ''}
              ${color === 'blue'   ? 'border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20' : ''}
              ${color === 'gray'   ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900' : ''}
            `}>
                            <div className={`font-bold font-mono
                ${color === 'red'    ? 'text-red-700 dark:text-red-300' : ''}
                ${color === 'orange' ? 'text-orange-700 dark:text-orange-300' : ''}
                ${color === 'yellow' ? 'text-yellow-700 dark:text-yellow-300' : ''}
                ${color === 'blue'   ? 'text-blue-700 dark:text-blue-300' : ''}
                ${color === 'gray'   ? 'text-gray-500 dark:text-gray-400' : ''}
              `}>{i + 1}. {label}</div>
                            <div className={`leading-relaxed whitespace-pre-line
                ${color === 'red'    ? 'text-red-600 dark:text-red-400' : ''}
                ${color === 'orange' ? 'text-orange-600 dark:text-orange-400' : ''}
                ${color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' : ''}
                ${color === 'blue'   ? 'text-blue-600 dark:text-blue-400' : ''}
                ${color === 'gray'   ? 'text-gray-400 dark:text-gray-500' : ''}
              `}>{desc}</div>
                        </div>
                    ))}
                </div>

                <CodeBlock code={scheduleCode} language="c" filename="kernel/sched/core.c" />
            </Section>

            {/* 2.6 CPU Affinity와 CPU Pinning */}
            <Section id="s26" title="2.6  CPU Affinity와 CPU Pinning">
                <Prose>
                    기본적으로 <T id="cfs">CFS</T>는 런큐에서 어느 CPU든 프로세스를 실행할 수 있습니다.
                    하지만 <strong className="text-gray-900 dark:text-gray-100">CPU affinity(CPU 친화성)</strong>를 설정하면
                    특정 프로세스가 실행될 수 있는 CPU를 제한할 수 있습니다.
                    커널 내부적으로 <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">task_struct.cpus_mask</code>에
                    비트마스크로 저장됩니다.
                </Prose>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                        <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">설정 방법</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th className="text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">방법</th>
                                        <th className="text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">사용</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {[
                                        ['taskset -c 0,1 ./app', 'CPU 0·1에서만 실행'],
                                        ['taskset -p 0x3 <pid>', '실행 중 프로세스 변경'],
                                        ['sched_setaffinity()', '프로그램 내에서 직접 설정'],
                                        ['cgroups cpuset', '컨테이너/그룹 단위 격리'],
                                        ['numactl --cpunodebind=0', 'NUMA 노드 단위 바인딩'],
                                    ].map(([cmd, desc]) => (
                                        <tr key={cmd} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                            <td className="px-4 py-2 font-mono text-xs text-blue-600 dark:text-blue-400">{cmd}</td>
                                            <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400">{desc}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/20 p-4">
                            <div className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">CPU Pinning 사용 사례</div>
                            <ul className="text-xs text-green-700 dark:text-green-400 space-y-1.5 leading-relaxed">
                                <li>• <strong>네트워크 패킷 처리</strong>: NIC 인터럽트와 같은 CPU에 수신 스레드 고정 → cache miss 최소화</li>
                                <li>• <strong>실시간 오디오/영상</strong>: 전용 CPU로 레이턴시 jitter 제거</li>
                                <li>• <strong>NUMA 최적화</strong>: 메모리가 있는 노드의 CPU에 프로세스 고정</li>
                                <li>• <strong>인터럽트 격리</strong>: <code className="font-mono bg-green-100 dark:bg-green-900/40 px-1 rounded">/proc/irq/N/smp_affinity</code>와 함께 사용</li>
                            </ul>
                        </div>
                        <div className="flex gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 rounded-xl text-xs text-orange-700 dark:text-orange-300">
                            <span className="shrink-0">⚠️</span>
                            <span>CPU를 너무 좁게 고정하면 과부하 시 다른 CPU로 분산이 불가능해집니다. 프로덕션에서는 모니터링과 함께 적용하세요.</span>
                        </div>
                    </div>
                </div>
            </Section>

            {/* 2.7 SMP와 NUMA */}
            <Section id="s27" title="2.7  SMP와 NUMA — 멀티코어 환경의 스케줄링">
                <Prose>
                    현대 서버는 단일 CPU가 아닙니다. 리눅스 스케줄러는 멀티코어·멀티소켓 환경을 지원하기 위해
                    <strong className="text-gray-900 dark:text-gray-100"> SMP</strong>와 <strong className="text-gray-900 dark:text-gray-100">NUMA</strong>를 이해해야 합니다.
                </Prose>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* SMP */}
                    <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20 p-4 space-y-3">
                        <div className="font-semibold text-blue-800 dark:text-blue-300">SMP — Symmetric Multi-Processing</div>
                        <div className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed space-y-1.5">
                            <p>모든 CPU 코어가 동일한 물리 메모리를 공유하는 구조. 서버 한 소켓 내부의 일반적인 형태.</p>
                            <p>커널은 CPU마다 독립적인 <strong>런큐(run queue)</strong>를 유지합니다. <T id="cfs">CFS</T>는 주기적으로 런큐 간 <strong>load balancing</strong>을 수행해 부하를 균등하게 분산합니다.</p>
                            <p>런큐 간 태스크 이전 비용: 캐시 미스(L1/L2 재적재) 발생.</p>
                        </div>
                        <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2.5 font-mono text-xs text-blue-800 dark:text-blue-300">
                            <div className="font-semibold mb-1"># 현재 런큐 상태 확인</div>
                            <div>cat /proc/sched_debug</div>
                            <div>watch -n1 mpstat -P ALL</div>
                        </div>
                    </div>

                    {/* NUMA */}
                    <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/20 p-4 space-y-3">
                        <div className="font-semibold text-purple-800 dark:text-purple-300">NUMA — Non-Uniform Memory Access</div>
                        <div className="text-xs text-purple-700 dark:text-purple-400 leading-relaxed space-y-1.5">
                            <p>멀티소켓 서버에서 각 CPU 소켓은 자신만의 <strong>로컬 메모리</strong>를 갖습니다. 다른 소켓의 메모리(원격 메모리) 접근은 수백 ns 느립니다.</p>
                            <p>커널의 <strong>NUMA balancer</strong>는 프로세스가 자주 접근하는 메모리를 해당 CPU의 로컬 노드로 마이그레이션합니다.</p>
                            <p>잘못된 NUMA 배치는 네트워크/DB 성능을 30~40% 저하시킬 수 있습니다.</p>
                        </div>
                        <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-2.5 font-mono text-xs text-purple-800 dark:text-purple-300">
                            <div className="font-semibold mb-1"># NUMA 토폴로지 확인</div>
                            <div>numactl --hardware</div>
                            <div>numastat -p &lt;pid&gt;</div>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">SMP vs NUMA 비교</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">항목</th>
                                    <th className="text-left px-4 py-2 text-blue-600 dark:text-blue-400 font-semibold text-xs uppercase tracking-wide">SMP</th>
                                    <th className="text-left px-4 py-2 text-purple-600 dark:text-purple-400 font-semibold text-xs uppercase tracking-wide">NUMA</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                                {[
                                    ['메모리 접근 속도', '균일 (모든 코어 동일)', '비균일 (로컬 빠름, 원격 느림)'],
                                    ['일반 적용 범위', '단일 소켓 멀티코어', '멀티 소켓 서버'],
                                    ['커널 런큐', 'CPU당 1개', 'CPU당 1개 + NUMA node 그루핑'],
                                    ['스케줄러 최적화', 'Load balancing', 'NUMA balancing + memory migration'],
                                    ['실무 예시', '일반 데스크탑/서버', '고성능 서버 (EPYC, Xeon SP)'],
                                ].map(([item, smp, numa]) => (
                                    <tr key={item} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                        <td className="px-4 py-2 font-semibold text-gray-600 dark:text-gray-400">{item}</td>
                                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{smp}</td>
                                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{numa}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Section>

            {/* 2.8 RT 스케줄러 */}
            <Section id="s28" title="2.8  RT 스케줄러 — SCHED_FIFO와 SCHED_RR">
                <Prose>
                    <T id="cfs">CFS</T>는 공정성(fairness)을 목표로 하지만, 일부 태스크는 <strong className="text-gray-900 dark:text-gray-100">데드라인 보장</strong>이 필요합니다.
                    리눅스 커널은 <T id="cfs">CFS</T> 외에 Real-Time 스케줄러를 제공합니다.
                    RT 태스크는 <T id="cfs">CFS</T> 태스크보다 <em>항상</em> 먼저 실행됩니다.
                </Prose>

                {/* 스케줄러 클래스 계층 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">스케줄러 클래스 우선순위 (높음 → 낮음)</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">정책</th>
                                    <th className="text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">우선순위 범위</th>
                                    <th className="text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">동작</th>
                                    <th className="text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">사용 사례</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                                {[
                                    ['SCHED_DEADLINE', '—', 'EDF(Earliest Deadline First) 기반. 주기·데드라인·실행시간 명시', '실시간 제어 시스템', 'red'],
                                    ['SCHED_FIFO', 'RT 1~99', '선점 없음. 더 높은 우선순위 태스크가 생기기 전까지 계속 실행', '오디오 서버, 실시간 센서', 'red'],
                                    ['SCHED_RR', 'RT 1~99', 'FIFO에 타임슬라이스 추가. 같은 우선순위 간 라운드로빈', '같은 우선순위 RT 태스크', 'red'],
                                    ['SCHED_NORMAL (CFS)', '100~139 (nice -20~19)', 'vruntime 기반 공정 스케줄링. 대부분의 일반 프로세스', '일반 서버/데스크탑 프로세스', 'blue'],
                                    ['SCHED_IDLE', '가장 낮음', 'idle 시에만 실행. nice +19보다도 낮음', '백그라운드 배치 작업', 'gray'],
                                ].map(([policy, prio, desc, usage, color]) => (
                                    <tr key={policy as string} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                        <td className={`px-4 py-2.5 font-mono font-bold text-xs ${
                                            color === 'red' ? 'text-red-600 dark:text-red-400' :
                                                color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                                                    'text-gray-500 dark:text-gray-500'
                                        }`}>{policy}</td>
                                        <td className="px-4 py-2.5 font-mono text-gray-500 dark:text-gray-400">{prio}</td>
                                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{desc}</td>
                                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{usage}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4">
                            <div className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">⚠️ RT 스케줄러의 위험성</div>
                            <div className="text-xs text-red-700 dark:text-red-400 leading-relaxed space-y-1.5">
                                <p><code className="font-mono bg-red-100 dark:bg-red-900/40 px-1 rounded">SCHED_FIFO</code> 태스크가 CPU-bound 루프에 빠지면 다른 모든 CFS 태스크가 굶어 죽습니다(starvation).</p>
                                <p>이를 방지하기 위해 커널은 <strong>RT throttling</strong>을 적용합니다: 기본적으로 1초 중 950ms만 RT 태스크에 허용 (<code className="font-mono bg-red-100 dark:bg-red-900/40 px-1 rounded">/proc/sys/kernel/sched_rt_period_us</code>).</p>
                            </div>
                        </div>
                        <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                            <div className="text-gray-500 dark:text-gray-500 mb-1"># RT 정책으로 프로그램 실행</div>
                            <div>chrt -f 50 ./my_rt_app</div>
                            <div className="mt-1 text-gray-500 dark:text-gray-500"># 현재 프로세스 정책 확인</div>
                            <div>chrt -p &lt;pid&gt;</div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4 space-y-3">
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">SCHED_FIFO vs SCHED_RR</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed space-y-3">
                            <div>
                                <div className="font-semibold text-orange-600 dark:text-orange-400 mb-1">SCHED_FIFO</div>
                                <p>자발적으로 양보(yield/sleep)하거나, 더 높은 우선순위 RT 태스크가 생기기 전까지 CPU를 독점. 같은 우선순위 태스크와도 공유하지 않음.</p>
                            </div>
                            <div>
                                <div className="font-semibold text-blue-600 dark:text-blue-400 mb-1">SCHED_RR</div>
                                <p>SCHED_FIFO와 동일하지만 같은 우선순위의 RT 태스크끼리는 타임슬라이스(기본 100ms)를 나눠 씁니다. 더 공평한 RT 스케줄링.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* 2.9 cgroups */}
            <Section id="s29" title="2.9  cgroups — 프로세스 자원 제어의 핵심">
                <Prose>
                    <strong className="text-gray-900 dark:text-gray-100"><T id="cgroup">cgroups</T>(Control Groups)</strong>는 프로세스 그룹에
                    CPU·메모리·I/O·네트워크 등의 자원 제한을 걸 수 있는 커널 기능입니다.
                    Docker, Kubernetes, systemd 모두 <T id="cgroup">cgroups</T> 위에서 동작합니다.
                    커널 내부에서는 <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">task_struct.cgroups</code>가
                    해당 태스크의 cgroup 멤버십을 관리합니다.
                </Prose>

                {/* v1 vs v2 비교 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">cgroup v1 vs v2</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">항목</th>
                                    <th className="text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">v1 (레거시)</th>
                                    <th className="text-left px-4 py-2 text-blue-600 dark:text-blue-400 font-semibold text-xs uppercase tracking-wide">v2 (통합, 권장)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                                {[
                                    ['마운트 구조', '서브시스템별 별도 마운트 (/sys/fs/cgroup/cpu/, /memory/, …)', '단일 통합 계층 (/sys/fs/cgroup/)'],
                                    ['계층 구조', '서브시스템마다 독립적인 트리', '모든 서브시스템이 동일한 트리 공유'],
                                    ['스레드 지원', '스레드별 소속 가능', 'v2.1+에서 thread-mode로 지원'],
                                    ['주요 파일', 'cpu.shares, memory.limit_in_bytes', 'cpu.max, cpu.weight, memory.max'],
                                    ['현재 지원', '커널 지원 유지, 새 기능 없음', '커널 5.x+ 기본, systemd 244+ 전환'],
                                ].map(([item, v1, v2]) => (
                                    <tr key={item} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                        <td className="px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">{item}</td>
                                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-500">{v1}</td>
                                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{v2}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* cgroup 계층 D3 트리 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">cgroup v2 계층 구조 — /sys/fs/cgroup/</span>
                    </div>
                    <D3Container renderFn={renderCgroupTreeCb} height={300} deps={[theme]} zoomable />
                </div>

                {/* 파일시스템 구조 */}
                <CodeBlock code={cgroupFsCode} language="bash" filename="/sys/fs/cgroup/" />

                {/* 생성/사용 예제 */}
                <CodeBlock code={cgroupCreateCode} language="bash" filename="cgroup 생성 및 자원 제한 예제" />

                {/* task_struct 연결 */}
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
          커널 내부에서 각 태스크는 <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">css_set</code>을 통해
          여러 서브시스템의 <T id="cgroup">cgroup</T> 상태를 참조합니다. 같은 <T id="cgroup">cgroup</T> 조합을 공유하는 태스크끼리는 동일한 css_set을 재사용합니다.
                </p>
                <CodeBlock code={cgroupTaskStructCode} language="c" filename="include/linux/sched.h / include/linux/cgroup.h" />

                {/* CPU 서브시스템 주요 파일 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">CPU 서브시스템 주요 제어 파일 (v2)</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">파일</th>
                                    <th className="text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">형식</th>
                                    <th className="text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">의미</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs font-mono">
                                {[
                                    ['cpu.max', '"200000 1000000"', 'period(µs) 중 quota(µs)만큼만 CPU 사용. "max"는 제한 없음'],
                                    ['cpu.weight', '"100"', '1~10000, 기본 100. CFS cpu.shares의 v2 대체. 상대적 가중치'],
                                    ['cpu.stat', '읽기 전용', 'usage_usec, user_usec, system_usec, throttled_usec 등 통계'],
                                    ['cpuset.cpus', '"0-3"', '이 cgroup이 사용할 CPU 코어 범위 (CPU Affinity 2.6과 동일 개념)'],
                                    ['cpuset.mems', '"0"', 'NUMA 메모리 노드 제한'],
                                ].map(([file, fmt, desc]) => (
                                    <tr key={file} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                        <td className="px-4 py-2.5 text-blue-600 dark:text-blue-400 font-bold">{file}</td>
                                        <td className="px-4 py-2.5 text-green-600 dark:text-green-400">{fmt}</td>
                                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 font-sans">{desc}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-sm text-blue-800 dark:text-blue-200">
                    <span className="text-lg shrink-0">🐳</span>
                    <span>
                        <strong>Docker 컨테이너</strong>는 내부적으로{' '}
                        <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded font-mono text-xs">--cpus</code>,{' '}
                        <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded font-mono text-xs">--memory</code> 옵션을
            cgroup v2의 <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded font-mono text-xs">cpu.max</code>,{' '}
                        <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded font-mono text-xs">memory.max</code>로 변환합니다.
            Kubernetes의 resource limits도 마찬가지입니다.
                    </span>
                </div>
            </Section>

            {/* 2.10 스케줄러 통계와 분석 */}
            <Section id="s210" title="2.10  스케줄러 통계와 분석">
                <Prose>
                    스케줄링 문제(높은 레이턴시, CPU 불균형)는{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">/proc/schedstat</code>과{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">/proc/sched_debug</code>로 진단합니다.
                </Prose>

                <CodeBlock code={schedstatCode} language="bash" filename="# /proc/schedstat — CPU별 스케줄링 통계" />
                <CodeBlock code={schedDebugCode} language="bash" filename="# /proc/sched_debug — 런큐 상태" />

                {/* 로드밸런싱 */}
                <Prose>
                    SMP 시스템에서 특정 CPU만 바쁘고 다른 CPU는 노는 불균형을 방지하기 위해 커널은 주기적으로 런큐를 재조정합니다.
                </Prose>

                <CodeBlock code={loadBalanceCode} language="c" filename="kernel/sched/fair.c — load_balance 핵심" />

                {/* 스케줄링 도메인 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20 p-4 space-y-2">
                        <div className="font-semibold text-blue-800 dark:text-blue-300 text-sm">SMT (Hyper-Threading)</div>
                        <div className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
              같은 물리 코어의 논리 CPU들. 캐시 완전 공유. 가장 빠른 마이그레이션.
                        </div>
                        <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 px-2.5 py-1.5 font-mono text-xs text-blue-700 dark:text-blue-300 break-all">
              /sys/devices/system/cpu/cpu0/topology/thread_siblings
                        </div>
                    </div>

                    <div className="rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/20 p-4 space-y-2">
                        <div className="font-semibold text-green-800 dark:text-green-300 text-sm">MC (Multi-Core)</div>
                        <div className="text-xs text-green-700 dark:text-green-400 leading-relaxed">
              같은 소켓의 코어들. LLC(L3) 공유. 빠른 마이그레이션.
                        </div>
                        <div className="rounded-lg bg-green-100 dark:bg-green-900/30 px-2.5 py-1.5 font-mono text-xs text-green-700 dark:text-green-300 break-all">
              /sys/devices/system/cpu/cpu0/topology/core_siblings
                        </div>
                    </div>

                    <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/20 p-4 space-y-2">
                        <div className="font-semibold text-purple-800 dark:text-purple-300 text-sm">NUMA Node</div>
                        <div className="text-xs text-purple-700 dark:text-purple-400 leading-relaxed">
              다른 소켓/메모리 노드. 원격 메모리 접근 비용. 마이그레이션 신중히.
                        </div>
                        <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 px-2.5 py-1.5 font-mono text-xs text-purple-700 dark:text-purple-300">
              numactl --hardware
                        </div>
                    </div>
                </div>
            </Section>

            {/* 네비게이션 */}
            <nav className="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 flex items-center justify-between">
                <div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">이전 토픽</div>
                    <a href="#/topic/01-overview" className="font-semibold text-gray-900 dark:text-gray-200 text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        ← 01 · 리눅스 커널 개요와 전체 구조
                    </a>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">다음 토픽</div>
                    <a href="#/topic/03-memory" className="font-semibold text-gray-900 dark:text-gray-200 text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        03 · 가상 메모리와 메모리 관리 →
                    </a>
                </div>
            </nav>
        </div>
    )
}

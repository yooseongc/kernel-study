import { useState } from 'react'
import { MermaidDiagram } from '../../components/viz/MermaidDiagram'
import { CodeBlock } from '../../components/viz/CodeBlock'
import { D3Container } from '../../components/viz/D3Container'
import { AnimatedDiagram } from '../../components/viz/AnimatedDiagram'
import * as d3 from 'd3'
import { themeColors } from '../../lib/colors'

const syscallFlowChart = `
sequenceDiagram
    participant U as 유저 공간 (User Space)
    participant L as libc (glibc)
    participant K as 커널 공간 (Kernel Space)
    participant H as 하드웨어

    U->>L: write(fd, buf, len)
    L->>K: syscall #1 (SYSCALL 명령어)
    Note over K: 권한 레벨 Ring3 → Ring0
    K->>K: sys_write() 실행
    K->>H: 디바이스 드라이버 호출
    H-->>K: 완료 신호 (IRQ)
    K-->>U: 반환값 (n bytes written)
    Note over U: 다시 Ring3로 복귀
`

const kernelStructureChart = `
graph TB
    subgraph UserSpace["👤 유저 공간 (User Space)"]
        App["앱 프로세스<br/>(bash, nginx, ...)"]
        Lib["시스템 라이브러리<br/>(glibc)"]
    end

    subgraph SyscallLayer["🔌 시스템 콜 인터페이스"]
        SC["System Call Table<br/>sys_read / sys_write / sys_fork ..."]
    end

    subgraph KernelSpace["⚙️ 커널 공간 (Kernel Space)"]
        FS["파일 시스템<br/>(ext4, VFS)"]
        MM["메모리 관리<br/>(Buddy, SLUB)"]
        NET["네트워크 스택<br/>(TCP/IP)"]
        SCHED["스케줄러<br/>(CFS)"]
        IPC["프로세스 간 통신<br/>(pipe, socket)"]
    end

    subgraph HW["🖥️ 하드웨어"]
        CPU["CPU"]
        RAM["RAM"]
        NIC["NIC"]
        DISK["Disk"]
    end

    App --> Lib --> SC
    SC --> FS & MM & NET & SCHED & IPC
    FS --> DISK
    MM --> RAM
    NET --> NIC
    SCHED --> CPU
`

const taskStructCode = `/* include/linux/sched.h (simplified) */
struct task_struct {
    volatile long       state;        /* 프로세스 상태 (RUNNING, SLEEPING, ...) */
    void               *stack;        /* 커널 스택 포인터 */
    pid_t               pid;          /* 프로세스 ID */
    pid_t               tgid;         /* 스레드 그룹 ID */

    struct mm_struct   *mm;           /* 가상 메모리 구조체 (NULL이면 커널 스레드) */
    struct files_struct *files;       /* 열린 파일 디스크립터 테이블 */
    struct task_struct *parent;       /* 부모 프로세스 */
    struct list_head    children;     /* 자식 프로세스 목록 */

    struct sched_entity se;           /* CFS 스케줄러 엔티티 */
    cpumask_t           cpus_allowed; /* 실행 가능한 CPU 마스크 */
};`

interface RingInfo {
  ring: string
  label: string
  sublabel: string
  who: string
  permissions: string[]
  used: boolean
  color: string
  textColor: string
}

const ringData: RingInfo[] = [
    {
        ring: 'Ring −1',
        label: 'Ring −1',
        sublabel: 'Hypervisor Mode',
        who: 'KVM, VMware, Hyper-V',
        permissions: ['게스트 OS의 Ring 0 명령 가로채기', '물리 하드웨어 완전 제어', 'VM 생성/삭제/일시정지'],
        used: true,
        color: '#7c3aed',
        textColor: '#ddd6fe',
    },
    {
        ring: 'Ring 0',
        label: 'Ring 0',
        sublabel: 'Kernel Mode',
        who: '리눅스 커널, 디바이스 드라이버',
        permissions: ['모든 CPU 명령어 실행 (cli, hlt, in, out...)', '물리 메모리 직접 접근', '페이지 테이블 조작', 'I/O 포트 직접 읽기/쓰기'],
        used: true,
        color: '#dc2626',
        textColor: '#fecaca',
    },
    {
        ring: 'Ring 1',
        label: 'Ring 1',
        sublabel: '미사용 (Linux)',
        who: '원래 목적: 디바이스 드라이버',
        permissions: ['Ring 0보다 제한적', 'Ring 3보다 특권적', '실제 리눅스에서는 사용 안 함'],
        used: false,
        color: '#4b5563',
        textColor: '#9ca3af',
    },
    {
        ring: 'Ring 2',
        label: 'Ring 2',
        sublabel: '미사용 (Linux)',
        who: '원래 목적: 시스템 서비스',
        permissions: ['Ring 1보다 제한적', 'Ring 3보다 특권적', '실제 리눅스에서는 사용 안 함'],
        used: false,
        color: '#4b5563',
        textColor: '#9ca3af',
    },
    {
        ring: 'Ring 3',
        label: 'Ring 3',
        sublabel: 'User Mode',
        who: 'bash, nginx, Python, 모든 앱',
        permissions: ['특권 명령어 실행 불가', '물리 메모리 직접 접근 불가', '다른 프로세스 메모리 접근 불가', '커널 서비스는 시스템 콜로만 요청'],
        used: true,
        color: '#2563eb',
        textColor: '#bfdbfe',
    },
]

function renderRingDiagram(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number,
    onSelect: (ring: RingInfo) => void
) {
    // cx centered, cy offset down to leave room for Ring -1 label at top
    const cx = width / 2
    const topPad = 36   // room for Ring -1 label
    const botPad = 18
    const maxR = Math.min(cx - 14, (height - topPad - botPad) / 2)
    const cy = topPad + maxR

    // Radii boundaries (Ring 3 = outermost band, Ring 0 = center)
    const radii = [maxR, maxR * 0.74, maxR * 0.50, maxR * 0.30, maxR * 0.14]
    // rings[0]=Ring3, rings[1]=Ring2, rings[2]=Ring1, rings[3]=Ring0 band
    const rings = [ringData[4], ringData[3], ringData[2], ringData[1]]

    // ── Ring -1 dashed border ──────────────────────────────────────────────
    const hvR = maxR + 14
    svg.append('circle')
        .attr('cx', cx).attr('cy', cy).attr('r', hvR)
        .attr('fill', 'none')
        .attr('stroke', ringData[0].color)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '5 3')
        .attr('opacity', 0.55)

    // Ring -1 label sits at the top of the dashed circle
    svg.append('text')
        .attr('x', cx).attr('y', cy - hvR + 14)
        .attr('text-anchor', 'middle')
        .attr('fill', ringData[0].textColor)
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .text('Ring −1 · Hypervisor')

    // ── Concentric circles, outside → inside (painter's algo) ─────────────
    rings.forEach((ring, i) => {
        const outerR = radii[i]
        const innerR = radii[i + 1]
        const midR   = (outerR + innerR) / 2

        // Filled donut using two circles — draw outer fill, then punch inner hole
        svg.append('circle')
            .attr('cx', cx).attr('cy', cy).attr('r', outerR)
            .attr('fill', ring.color + (ring.used ? '1e' : '0d'))
            .attr('stroke', ring.color)
            .attr('stroke-width', ring.used ? 1.5 : 1)
            .attr('opacity', ring.used ? 1 : 0.6)
            .attr('cursor', 'pointer')
            .on('click', () => onSelect(ring))
            .on('mouseenter', function () { d3.select(this).attr('fill', ring.color + '3a') })
            .on('mouseleave', function () { d3.select(this).attr('fill', ring.color + (ring.used ? '1e' : '0d')) })

        // Label at 12 o'clock of the band midpoint
        const labelY = cy - midR
        svg.append('text')
            .attr('x', cx).attr('y', labelY - 5)
            .attr('text-anchor', 'middle')
            .attr('fill', ring.textColor)
            .attr('font-size', '11px')
            .attr('font-weight', ring.used ? '600' : '400')
            .attr('font-family', 'monospace')
            .attr('pointer-events', 'none')
            .text(ring.label)

        svg.append('text')
            .attr('x', cx).attr('y', labelY + 8)
            .attr('text-anchor', 'middle')
            .attr('fill', ring.color)
            .attr('font-size', '9px')
            .attr('font-family', 'sans-serif')
            .attr('pointer-events', 'none')
            .text(ring.sublabel)
    })

    // ── Ring 0 center circle ───────────────────────────────────────────────
    const r0 = radii[4]
    svg.append('circle')
        .attr('cx', cx).attr('cy', cy).attr('r', r0)
        .attr('fill', ringData[1].color + '30')
        .attr('stroke', ringData[1].color)
        .attr('stroke-width', 1.5)
        .attr('cursor', 'pointer')
        .on('click', () => onSelect(ringData[1]))
        .on('mouseenter', function () { d3.select(this).attr('fill', ringData[1].color + '55') })
        .on('mouseleave', function () { d3.select(this).attr('fill', ringData[1].color + '30') })

    svg.append('text')
        .attr('x', cx).attr('y', cy - 3)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', ringData[1].textColor)
        .attr('font-size', '10px').attr('font-weight', '700').attr('font-family', 'monospace')
        .attr('pointer-events', 'none').text('Ring 0')

    svg.append('text')
        .attr('x', cx).attr('y', cy + 11)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', ringData[1].color)
        .attr('font-size', '8px').attr('font-family', 'sans-serif')
        .attr('pointer-events', 'none').text('Kernel')
}

function renderSwitchCostChart(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number
) {
    const isDark = document.documentElement.classList.contains('dark')
    const c = themeColors(isDark)
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const data = [
        { label: '함수 호출', ns: 1, color: '#10b981' },
        { label: 'Ring 3→0 전환\n(syscall)', ns: 100, color: '#f59e0b' },
        { label: 'TLB flush\n포함 전환', ns: 300, color: '#ef4444' },
        { label: '컨텍스트 스위치', ns: 2000, color: '#7c3aed' },
    ]

    const margin = { top: 24, right: 16, bottom: 70, left: 72 }
    const w = width - margin.left - margin.right
    const h = height - margin.top - margin.bottom

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3.scaleBand().domain(data.map(d => d.label)).range([0, w]).padding(0.35)
    const y = d3.scaleLog().domain([0.5, 3000]).range([h, 0])

    // Grid lines
    const yTicks = [1, 10, 100, 1000]
    yTicks.forEach(tick => {
        g.append('line')
            .attr('x1', 0).attr('x2', w)
            .attr('y1', y(tick)).attr('y2', y(tick))
            .attr('stroke', c.link).attr('stroke-dasharray', '3 3').attr('stroke-width', 1)
        g.append('text')
            .attr('x', -8).attr('y', y(tick) + 4)
            .attr('text-anchor', 'end').attr('fill', c.textMuted).attr('font-size', '10px')
            .text(`${tick}ns`)
    })

    // Bars
    data.forEach(d => {
        const bx = x(d.label)!
        const bw = x.bandwidth()
        const by = y(d.ns)
        const bh = h - by

        g.append('rect')
            .attr('x', bx).attr('y', by).attr('width', bw).attr('height', bh)
            .attr('fill', d.color + '33').attr('stroke', d.color).attr('stroke-width', 1.5).attr('rx', 4)

        g.append('text')
            .attr('x', bx + bw / 2).attr('y', by - 5)
            .attr('text-anchor', 'middle').attr('fill', d.color)
            .attr('font-size', '10px').attr('font-weight', 'bold')
            .text(`${d.ns}ns`)

        // Multi-line x-axis label
        const lines = d.label.split('\n')
        lines.forEach((line, i) => {
            g.append('text')
                .attr('x', bx + bw / 2).attr('y', h + 18 + i * 14)
                .attr('text-anchor', 'middle').attr('fill', c.textMuted).attr('font-size', '10px')
                .text(line)
        })
    })

    // Y-axis label
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -h / 2).attr('y', -55)
        .attr('text-anchor', 'middle').attr('fill', c.textMuted).attr('font-size', '11px')
        .text('지연 시간 (로그 스케일)')
}

function renderSubsystemGraph(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number
) {
    const isDark = document.documentElement.classList.contains('dark')
    const c = themeColors(isDark)
  type NodeDatum = { id: string; label: string; group: number; x?: number; y?: number; fx?: number | null; fy?: number | null }
  type LinkDatum = { source: string | NodeDatum; target: string | NodeDatum }

  const nodes: NodeDatum[] = [
      { id: 'syscall', label: 'System Call', group: 0 },
      { id: 'vfs', label: 'VFS', group: 1 },
      { id: 'mm', label: 'Memory\nManager', group: 1 },
      { id: 'net', label: 'Network\nStack', group: 1 },
      { id: 'sched', label: 'Scheduler\n(CFS)', group: 1 },
      { id: 'block', label: 'Block Layer', group: 2 },
      { id: 'driver', label: 'Drivers', group: 2 },
      { id: 'cpu', label: 'CPU', group: 3 },
      { id: 'ram', label: 'RAM', group: 3 },
      { id: 'nic', label: 'NIC', group: 3 },
      { id: 'disk', label: 'Disk', group: 3 },
  ]

  const links: LinkDatum[] = [
      { source: 'syscall', target: 'vfs' },
      { source: 'syscall', target: 'mm' },
      { source: 'syscall', target: 'net' },
      { source: 'syscall', target: 'sched' },
      { source: 'vfs', target: 'block' },
      { source: 'block', target: 'driver' },
      { source: 'driver', target: 'disk' },
      { source: 'net', target: 'driver' },
      { source: 'driver', target: 'nic' },
      { source: 'mm', target: 'ram' },
      { source: 'sched', target: 'cpu' },
  ]

  const groupColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
  const groupLabels = ['인터페이스', '코어 서브시스템', '디바이스 추상화', '하드웨어']

  svg.attr('viewBox', `0 0 ${width} ${height}`)

  const g = svg.append('g')

  const pad = 50
  const simulation = d3
      .forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(links).id((d: d3.SimulationNodeDatum) => (d as NodeDatum).id).distance(90))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(50))
      .force('boundary', () => {
          for (const node of nodes) {
              const n = node as NodeDatum
              if (n.x !== undefined) n.x = Math.max(pad, Math.min(width - pad, n.x))
              if (n.y !== undefined) n.y = Math.max(pad, Math.min(height - pad, n.y))
          }
      })

  // Links
  const link = g
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', c.link)
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrow)')

  svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', c.textDim)

  // Nodes
  const node = g
      .append('g')
      .selectAll<SVGGElement, NodeDatum>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
          d3
              .drag<SVGGElement, NodeDatum>()
              .on('start', (event, d) => {
                  if (!event.active) simulation.alphaTarget(0.3).restart()
                  d.fx = d.x
                  d.fy = d.y
              })
              .on('drag', (event, d) => {
                  d.fx = event.x
                  d.fy = event.y
              })
              .on('end', (event, d) => {
                  if (!event.active) simulation.alphaTarget(0)
                  d.fx = null
                  d.fy = null
              })
      )

  node
      .append('circle')
      .attr('r', 30)
      .attr('fill', (d) => groupColors[d.group] + '33')
      .attr('stroke', (d) => groupColors[d.group])
      .attr('stroke-width', 1.5)

  node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', c.text)
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .each(function (d) {
          const lines = d.label.split('\n')
          const el = d3.select(this)
          lines.forEach((line, i) => {
              el.append('tspan')
                  .attr('x', 0)
                  .attr('dy', i === 0 ? `${-(lines.length - 1) * 0.5}em` : '1.1em')
                  .text(line)
          })
      })

  // Legend
  const legend = svg.append('g').attr('transform', `translate(12, 12)`)
  groupLabels.forEach((label, i) => {
      const row = legend.append('g').attr('transform', `translate(0, ${i * 20})`)
      row.append('circle').attr('r', 5).attr('fill', groupColors[i]).attr('cx', 5).attr('cy', 0)
      row.append('text').attr('x', 14).attr('y', 4).attr('fill', c.textMuted).attr('font-size', '11px').text(label)
  })

  simulation.on('tick', () => {
      link
          .attr('x1', (d) => (d.source as NodeDatum).x!)
          .attr('y1', (d) => (d.source as NodeDatum).y!)
          .attr('x2', (d) => (d.target as NodeDatum).x!)
          .attr('y2', (d) => (d.target as NodeDatum).y!)

      node.attr('transform', (d) => `translate(${d.x},${d.y})`)
  })
}

const syscallAnimSteps = [
    {
        label: 'write(fd, buf, n) 호출',
        description: '애플리케이션이 glibc의 write() 함수를 호출합니다. 아직 유저 공간(Ring 3) 안에 있습니다.',
    },
    {
        label: 'glibc wrapper — syscall 번호 설정',
        description: 'glibc wrapper가 시스템 콜 번호(SYS_write = 1)를 rax 레지스터에 저장하고 syscall 명령을 실행합니다.',
    },
    {
        label: 'CPU Ring 전환 (Ring 3 → Ring 0)',
        description: 'CPU가 MSR_LSTAR에 저장된 커널 진입점으로 점프하고, RSP를 커널 스택으로 교체합니다.',
    },
    {
        label: 'entry_SYSCALL_64 — 레지스터 저장',
        description: '어셈블리 진입점 entry_SYSCALL_64가 유저 레지스터를 저장하고 do_syscall_64()를 호출합니다.',
    },
    {
        label: 'sys_call_table 조회 → 핸들러 실행',
        description: 'sys_call_table[rax] 를 조회해 __x64_sys_write() 핸들러를 찾아 실행합니다.',
    },
    {
        label: '커널 작업 완료 — 반환값 설정',
        description: '커널이 VFS write 작업을 완료하고 반환값(쓴 바이트 수)을 rax 레지스터에 설정합니다.',
    },
    {
        label: 'sysretq — Ring 0 → Ring 3 복귀',
        description: 'sysretq 명령으로 유저 공간으로 복귀합니다. 유저 스택이 복원되고 glibc가 errno를 처리합니다.',
    },
]

// 각 step에서 활성화되는 영역 인덱스 (0=유저공간, 1=경계, 2=커널진입, 3=커널서브시스템)
const syscallStepZones: number[] = [0, 0, 1, 2, 2, 3, 1]

interface ZoneProps {
  title: string
  subtitle: string
  active: boolean
  activeClass: string
  activeTitleClass: string
  children: React.ReactNode
}

function SyscallZone({ title, subtitle, active, activeClass, activeTitleClass, children }: ZoneProps) {
    return (
        <div
            className={`rounded-lg p-3 transition-all duration-300 ${
                active
                    ? activeClass
                    : 'bg-gray-800 border border-gray-700 opacity-50'
            }`}
        >
            <div className={`text-xs font-mono mb-2 ${active ? activeTitleClass : 'text-gray-400'}`}>
                {title}
            </div>
            <div className="text-xs text-gray-500 mb-2">{subtitle}</div>
            {children}
        </div>
    )
}

function SyscallFlowViz({ step }: { step: number }) {
    const activeZone = syscallStepZones[step]

    return (
        <div className="flex flex-col md:flex-row gap-2 p-4 bg-gray-900 rounded-xl border border-gray-700 min-h-[200px]">
            {/* 유저 공간 */}
            <SyscallZone
                title="유저 공간 (Ring 3)"
                subtitle="User Space"
                active={activeZone === 0}
                activeClass="bg-blue-900/40 border border-blue-500 rounded-lg p-3"
                activeTitleClass="text-xs font-mono text-blue-300"
            >
                <div className="space-y-1.5">
                    <div className={`text-xs font-mono px-2 py-1 rounded transition-all duration-300 ${step === 0 ? 'bg-blue-700/60 text-blue-100 ring-1 ring-blue-400' : 'bg-gray-700/60 text-gray-300'}`}>
            App: write(fd, buf, n)
                    </div>
                    <div className={`text-xs font-mono px-2 py-1 rounded transition-all duration-300 ${step === 1 ? 'bg-blue-700/60 text-blue-100 ring-1 ring-blue-400' : 'bg-gray-700/60 text-gray-300'}`}>
            glibc: mov $1, %rax
                    </div>
                </div>
            </SyscallZone>

            {/* 하드웨어 경계 */}
            <div className="flex md:flex-col items-center justify-center gap-1 px-1">
                <div
                    className={`text-xs font-mono text-center transition-all duration-300 px-2 py-1 rounded ${
                        activeZone === 1
                            ? 'text-orange-300 bg-orange-900/40 border border-orange-500'
                            : 'text-gray-600'
                    }`}
                >
                    <div>{step <= 2 ? '↓' : '↑'}</div>
                    <div className="text-[10px] leading-tight">
                        {step <= 2 ? 'syscall' : 'sysretq'}
                    </div>
                </div>
            </div>

            {/* 커널 진입 */}
            <SyscallZone
                title="커널 진입 (Ring 0)"
                subtitle="Kernel Entry"
                active={activeZone === 2}
                activeClass="bg-purple-900/40 border border-purple-500 rounded-lg p-3"
                activeTitleClass="text-xs font-mono text-purple-300"
            >
                <div className="space-y-1.5">
                    <div className={`text-xs font-mono px-2 py-1 rounded transition-all duration-300 ${step === 3 ? 'bg-purple-700/60 text-purple-100 ring-1 ring-purple-400' : 'bg-gray-700/60 text-gray-300'}`}>
            entry_SYSCALL_64
                    </div>
                    <div className={`text-xs font-mono px-2 py-1 rounded transition-all duration-300 ${step === 4 ? 'bg-purple-700/60 text-purple-100 ring-1 ring-purple-400' : 'bg-gray-700/60 text-gray-300'}`}>
            sys_call_table[rax]
                    </div>
                    <div className={`text-xs font-mono px-2 py-1 rounded transition-all duration-300 ${step === 5 ? 'bg-purple-700/60 text-purple-100 ring-1 ring-purple-400' : 'bg-gray-700/60 text-gray-300'}`}>
            __x64_sys_write()
                    </div>
                </div>
            </SyscallZone>

            {/* 커널 서브시스템 */}
            <SyscallZone
                title="커널 서브시스템"
                subtitle="VFS / Block Layer"
                active={activeZone === 3}
                activeClass="bg-green-900/40 border border-green-500 rounded-lg p-3"
                activeTitleClass="text-xs font-mono text-green-300"
            >
                <div className="space-y-1.5">
                    <div className={`text-xs font-mono px-2 py-1 rounded transition-all duration-300 ${step === 5 ? 'bg-green-700/60 text-green-100 ring-1 ring-green-400' : 'bg-gray-700/60 text-gray-300'}`}>
            vfs_write()
                    </div>
                    <div className={`text-xs font-mono px-2 py-1 rounded transition-all duration-300 ${step === 5 ? 'bg-green-700/40 text-green-200' : 'bg-gray-700/60 text-gray-300'}`}>
            file→f_op→write()
                    </div>
                </div>
            </SyscallZone>
        </div>
    )
}

const syscallEntryCode = `/* 1. glibc syscall wrapper (간략화) */
ssize_t write(int fd, const void *buf, size_t count)
{
    return syscall(SYS_write, fd, buf, count);
    /* → mov $1, %rax; syscall */
}

/* 2. 커널 진입점 (arch/x86/entry/entry_64.S) */
SYM_CODE_START(entry_SYSCALL_64):
    swapgs                          /* GS 베이스를 커널 per-CPU로 교체 */
    movq %rsp, PER_CPU_VAR(cpu_tss_rw + TSS_sp2)
    movq PER_CPU_VAR(cpu_current_top_of_stack), %rsp
    pushq $__USER_DS; pushq %rcx    /* 유저 스택 포인터 저장 */
    call do_syscall_64

/* 3. 시스템 콜 디스패치 (arch/x86/entry/common.c) */
__visible noinstr void do_syscall_64(struct pt_regs *regs, int nr)
{
    if (likely(nr < NR_syscalls))
        regs->ax = sys_call_table[nr](regs);  /* 핸들러 호출 */
    syscall_exit_to_user_mode(regs);
}

/* 4. 실제 write 핸들러 */
SYSCALL_DEFINE3(write, unsigned int, fd, const char __user *, buf, size_t, count)
{
    struct fd f = fdget_pos(fd);
    loff_t pos = file_pos_read(f.file);
    ret = vfs_write(f.file, buf, count, &pos);  /* VFS로 전달 */
    return ret;
}`

export default function Topic01Overview() {
    const [selectedRing, setSelectedRing] = useState<RingInfo>(ringData[1]) // default: Ring 0

    return (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">
            {/* Header */}
            <div>
                <div className="text-xs font-mono text-blue-600 dark:text-blue-400 mb-2">Topic 01</div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">리눅스 커널 개요와 전체 구조</h1>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          커널은 하드웨어와 소프트웨어 사이에서 중재자 역할을 합니다.
          이 페이지에서는 커널이 무엇을 하는지, 어떤 구조로 이루어져 있는지를 시각적으로 살펴봅니다.
                </p>
            </div>

            {/* 섹션 1: 커널이란 */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400">1.1</span> 커널이 하는 일
                </h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          커널(Kernel)은 운영체제의 핵심 부분으로, 하드웨어 자원(CPU, 메모리, I/O)을 관리하고
          여러 프로세스가 이 자원을 공유할 수 있도록 추상화합니다.
          유저 프로그램은 커널 없이는 하드웨어에 직접 접근할 수 없습니다.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { icon: '⚙️', title: '프로세스 관리', desc: '생성, 스케줄링, 종료' },
                        { icon: '🧠', title: '메모리 관리', desc: '가상 주소, 페이지, 할당' },
                        { icon: '📁', title: '파일 시스템', desc: 'VFS, ext4, 디바이스' },
                        { icon: '🌐', title: '네트워크', desc: 'TCP/IP, 소켓, NIC' },
                    ].map((item) => (
                        <div key={item.title} className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
                            <div className="text-2xl mb-2">{item.icon}</div>
                            <div className="font-semibold text-gray-900 dark:text-gray-200 text-sm">{item.title}</div>
                            <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 섹션 2: 유저/커널 공간 */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400">1.2</span> 유저 공간과 커널 공간
                </h2>
                <div className="flex gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/50 rounded-xl text-sm text-yellow-800 dark:text-yellow-200">
                    <span className="text-lg">💡</span>
                    <span>
            x86 CPU는 <strong>권한 레벨(Ring 0~3)</strong>을 제공합니다.
            유저 프로그램은 Ring 3(최소 권한), 커널은 Ring 0(최대 권한)에서 실행됩니다.
            이 경계를 넘는 것이 바로 <strong>시스템 콜</strong>입니다.
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <MermaidDiagram chart={syscallFlowChart} />
                </div>
            </section>

            {/* 섹션 3: CPU 권한 레벨 */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400">1.3</span> CPU 권한 레벨 — Ring 0 ~ 3
                </h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          x86 CPU는 하드웨어 수준에서 4단계 <strong className="text-gray-900 dark:text-gray-100">보호 링(Protection Ring)</strong>을 제공합니다.
          숫자가 낮을수록 더 많은 권한을 가지며, 커널(Ring 0)과 유저 프로그램(Ring 3) 사이의
          하드웨어 경계가 메모리/권한 보호의 핵심입니다.
          링을 클릭하면 자세한 정보가 표시됩니다.
                </p>

                {/* 동심원 다이어그램 + 상세 패널 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                        <D3Container
                            renderFn={(svg, w, h) => renderRingDiagram(svg, w, h, setSelectedRing)}
                            deps={[]}
                            height={360}
                        />
                    </div>

                    {/* 선택된 링 상세 */}
                    <div
                        className="rounded-xl border p-5 space-y-3 transition-colors"
                        style={{ borderColor: selectedRing.color + '66', background: selectedRing.color + '0d' }}
                    >
                        <div className="flex items-center gap-3">
                            <span
                                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold font-mono"
                                style={{ background: selectedRing.color + '33', color: selectedRing.textColor, border: `2px solid ${selectedRing.color}` }}
                            >
                                {selectedRing.ring.replace('Ring ', 'R')}
                            </span>
                            <div>
                                <div className="font-bold text-gray-900 dark:text-gray-100">{selectedRing.ring}</div>
                                <div className="text-xs" style={{ color: selectedRing.color }}>{selectedRing.sublabel}</div>
                            </div>
                            {!selectedRing.used && (
                                <span className="ml-auto text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 rounded-full px-2 py-0.5">
                  리눅스 미사용
                                </span>
                            )}
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">실행 주체</div>
                            <div className="text-sm text-gray-700 dark:text-gray-300">{selectedRing.who}</div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">권한 / 특징</div>
                            <ul className="space-y-1">
                                {selectedRing.permissions.map(p => (
                                    <li key={p} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <span style={{ color: selectedRing.color }} className="mt-0.5 shrink-0">▸</span>
                                        {p}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* 링 전환 트리거 표 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Ring 전환이 일어나는 시점
                        </span>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
                        <div className="p-4">
                            <div className="text-xs font-bold text-red-600 dark:text-red-400 mb-2">Ring 3 → Ring 0 (진입)</div>
                            <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                                {[
                                    ['시스템 콜', 'SYSCALL / INT 0x80 명령'],
                                    ['하드웨어 인터럽트', 'NIC, 키보드, 타이머 IRQ'],
                                    ['CPU 예외', 'Page Fault, Division by Zero'],
                                ].map(([trigger, detail]) => (
                                    <li key={trigger}>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{trigger}</span>
                                        <span className="text-xs block text-gray-500">{detail}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="p-4">
                            <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2">Ring 0 → Ring 3 (복귀)</div>
                            <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                                {[
                                    ['syscall 처리 완료', 'SYSRET / IRET 명령'],
                                    ['인터럽트 핸들러 종료', 'IRET으로 복귀'],
                                    ['예외 처리 완료', '정상 처리 후 복귀 또는 시그널 전송'],
                                ].map(([trigger, detail]) => (
                                    <li key={trigger}>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{trigger}</span>
                                        <span className="text-xs block text-gray-500">{detail}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* 전환 비용 차트 */}
                <div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            연산별 지연 시간 비교 <span className="text-xs font-normal text-gray-400">(Ring 전환이 일반 함수 호출보다 왜 느린가)</span>
                    </div>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                        <D3Container renderFn={renderSwitchCostChart} height={260} />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
            * 수치는 현대 x86 CPU 기준 근사값입니다. Meltdown/Spectre 패치 이후 syscall 비용은 더 증가했습니다.
                    </p>
                </div>
            </section>

            {/* 섹션 4: 커널 서브시스템 그래프 */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400">1.4</span> 커널 서브시스템 구조 (인터랙티브)
                </h2>
                <p className="text-sm text-gray-500">노드를 드래그하거나 스크롤로 확대/축소할 수 있습니다.</p>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <D3Container renderFn={renderSubsystemGraph} height={420} zoomable />
                </div>
            </section>

            {/* 섹션 5: 전체 구조 Mermaid */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400">1.5</span> 전체 계층 구조
                </h2>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4 overflow-x-auto">
                    <MermaidDiagram chart={kernelStructureChart} />
                </div>
            </section>

            {/* 섹션 6: task_struct */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400">1.6</span> task_struct — 프로세스의 본체
                </h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          커널에서 모든 프로세스/스레드는 <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">task_struct</code>라는
          거대한 구조체로 표현됩니다. 여기에는 PID, 메모리 정보, 열린 파일, 스케줄링 정보 등이 모두 포함됩니다.
                </p>
                <CodeBlock code={taskStructCode} language="c" filename="include/linux/sched.h" />
            </section>

            {/* 섹션 7: 시스템 콜 전체 흐름 애니메이션 */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400">1.7</span> 시스템 콜의 전체 흐름 — 유저에서 커널로
                </h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">write(fd, buf, n)</code> 한 번의 호출이 커널 안에서 어떤 경로를 거치는지
          단계별로 살펴봅니다. 각 단계마다 어느 영역이 활성화되는지 강조됩니다.
                </p>

                <AnimatedDiagram
                    steps={syscallAnimSteps}
                    renderStep={(step) => <SyscallFlowViz step={step} />}
                    autoPlayInterval={2200}
                />

                <CodeBlock
                    code={syscallEntryCode}
                    language="c"
                    filename="arch/x86/entry/entry_64.S + kernel/sys.c"
                />

                {/* 성능 수치 인포 카드 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        {
                            title: 'syscall 비용',
                            value: '~100 ns',
                            desc: 'Ring 전환 + 레지스터 저장/복원. 일반 함수 호출(~1 ns)보다 약 100배 비쌉니다. Meltdown/Spectre 패치 이후 더 증가했습니다.',
                            color: 'amber',
                        },
                        {
                            title: 'vDSO 최적화',
                            value: '~5 ns',
                            desc: 'gettimeofday, clock_gettime 등은 커널 진입 없이 매핑된 메모리에서 직접 실행됩니다. Ring 전환 비용이 없습니다.',
                            color: 'green',
                        },
                        {
                            title: 'io_uring',
                            value: '배치 syscall',
                            desc: '반복적인 Ring 전환 오버헤드를 공유 링 버퍼(submission/completion queue)로 최소화합니다.',
                            color: 'purple',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className={`rounded-xl border p-4 space-y-1.5
                ${card.color === 'amber' ? 'bg-amber-950/20 border-amber-800/50' : ''}
                ${card.color === 'green' ? 'bg-green-950/20 border-green-800/50' : ''}
                ${card.color === 'purple' ? 'bg-purple-950/20 border-purple-800/50' : ''}
              `}
                        >
                            <div
                                className={`text-xs font-semibold uppercase tracking-wide
                  ${card.color === 'amber' ? 'text-amber-400' : ''}
                  ${card.color === 'green' ? 'text-green-400' : ''}
                  ${card.color === 'purple' ? 'text-purple-400' : ''}
                `}
                            >
                                {card.title}
                            </div>
                            <div
                                className={`text-lg font-bold font-mono
                  ${card.color === 'amber' ? 'text-amber-300' : ''}
                  ${card.color === 'green' ? 'text-green-300' : ''}
                  ${card.color === 'purple' ? 'text-purple-300' : ''}
                `}
                            >
                                {card.value}
                            </div>
                            <div className="text-xs text-gray-400 leading-relaxed">{card.desc}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 다음 토픽 */}
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 flex items-center justify-between">
                <div>
                    <div className="text-xs text-gray-500 dark:text-gray-600 mb-1">다음 토픽</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-200">02 · 프로세스, 스레드, 스케줄러</div>
                    <div className="text-xs text-gray-500 mt-0.5">task_struct를 더 깊게, CFS 스케줄러의 동작 원리</div>
                </div>
                <a href="#/topic/02-scheduler" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-sm">
          다음 →
                </a>
            </div>
        </div>
    )
}

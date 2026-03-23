import { useCallback } from 'react'
import * as d3 from 'd3'
import { useTheme, themeColors , D3Container, createD3Theme } from '@study-ui/components'

interface ArchNode {
    label: string
    sub?: string
    x: number
    y: number
    w: number
    h: number
    fill: string
    stroke: string
    textColor: string
    subColor: string
}

function renderKernelArch(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    _width: number,
    _height: number,
) {
    const VW = 820
    const VH = 580
    svg.attr('viewBox', `0 0 ${VW} ${VH}`).attr('preserveAspectRatio', 'xMidYMid meet')

    const isDark = document.documentElement.classList.contains('dark')
    const c = themeColors(isDark)
    const theme = createD3Theme(isDark)
    const g = svg.append('g')

    // ── Color helpers ────────────────────────────────────────────────────────
    function layerFill(hue: number) {
        return isDark ? `oklch(20% 0.05 ${hue})` : `oklch(96% 0.02 ${hue})`
    }
    function layerStroke(hue: number) {
        return isDark ? `oklch(55% 0.15 ${hue})` : `oklch(55% 0.15 ${hue})`
    }
    function layerText(hue: number) {
        return isDark ? `oklch(80% 0.12 ${hue})` : `oklch(35% 0.15 ${hue})`
    }
    function _layerSub(hue: number) {
        return isDark ? `oklch(60% 0.08 ${hue})` : `oklch(50% 0.08 ${hue})`
    }
    void _layerSub

    const PAD = 16
    const fullW = VW - PAD * 2

    // ── Layer backgrounds (large rounded rects) ─────────────────────────────
    const layers = [
        { label: '유저 공간 (User Space)', y: 10, h: 90, hue: 250 },
        { label: '시스템 콜 인터페이스', y: 120, h: 55, hue: 40 },
        { label: '커널 공간 (Kernel Space)', y: 195, h: 250, hue: 280 },
        { label: '하드웨어 (Hardware)', y: 465, h: 90, hue: 145 },
    ]

    layers.forEach((l) => {
        g.append('rect')
            .attr('x', PAD)
            .attr('y', l.y)
            .attr('width', fullW)
            .attr('height', l.h)
            .attr('rx', 10)
            .attr('fill', layerFill(l.hue))
            .attr('stroke', layerStroke(l.hue))
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '4,2')

        g.append('text')
            .attr('x', PAD + 14)
            .attr('y', l.y + 18)
            .attr('fill', layerText(l.hue))
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .attr('font-family', theme.fonts.sans)
            .text(l.label)
    })

    // ── Inner nodes ─────────────────────────────────────────────────────────
    function drawNode(n: ArchNode) {
        g.append('rect')
            .attr('x', n.x)
            .attr('y', n.y)
            .attr('width', n.w)
            .attr('height', n.h)
            .attr('rx', 6)
            .attr('fill', n.fill)
            .attr('stroke', n.stroke)
            .attr('stroke-width', 1.5)

        g.append('text')
            .attr('x', n.x + n.w / 2)
            .attr('y', n.y + (n.sub ? n.h / 2 - 6 : n.h / 2))
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', n.textColor)
            .attr('font-size', '10px')
            .attr('font-weight', '600')
            .attr('font-family', theme.fonts.sans)
            .text(n.label)

        if (n.sub) {
            g.append('text')
                .attr('x', n.x + n.w / 2)
                .attr('y', n.y + n.h / 2 + 8)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('fill', n.subColor)
                .attr('font-size', '8px')
                .attr('font-family', theme.fonts.mono)
                .text(n.sub)
        }
    }

    // User space nodes (inside layer y=10, h=90, title takes ~22px)
    const userNodes: ArchNode[] = [
        { label: '앱 프로세스', sub: 'bash, nginx, python', x: PAD + 20, y: 40, w: 160, h: 48, fill: c.blueFill, stroke: c.blueStroke, textColor: c.blueText, subColor: c.textMuted },
        { label: '시스템 라이브러리', sub: 'glibc, libpthread', x: PAD + 200, y: 40, w: 160, h: 48, fill: c.blueFill, stroke: c.blueStroke, textColor: c.blueText, subColor: c.textMuted },
        { label: 'GUI / 데몬', sub: 'systemd, Xorg', x: PAD + 380, y: 40, w: 140, h: 48, fill: c.blueFill, stroke: c.blueStroke, textColor: c.blueText, subColor: c.textMuted },
        { label: '런타임', sub: 'JVM, Node.js, Go', x: PAD + 540, y: 40, w: 140, h: 48, fill: c.blueFill, stroke: c.blueStroke, textColor: c.blueText, subColor: c.textMuted },
    ]
    userNodes.forEach(drawNode)

    // Syscall interface (inside layer y=120, h=55, title ~22px)
    drawNode({ label: 'System Call Table', sub: 'sys_read / sys_write / sys_open / sys_fork / sys_mmap ...', x: PAD + 60, y: 143, w: fullW - 120, h: 26, fill: c.amberFill, stroke: c.amberStroke, textColor: c.amberText, subColor: c.textMuted })

    // Kernel subsystems — 2 rows (inside layer y=195, h=250, title ~22px)
    const ksRow1Y = 225
    const ksRow2Y = 320
    const ksH = 70
    const ksGap = 12
    const ksW = (fullW - 40 - ksGap * 4) / 5

    const kernelSubs: (ArchNode & { topic?: string })[] = [
        { label: '프로세스 관리', sub: 'task_struct, CFS, fork', x: PAD + 20, y: ksRow1Y, w: ksW, h: ksH, fill: c.greenFill, stroke: c.greenStroke, textColor: c.greenText, subColor: c.textMuted },
        { label: '메모리 관리', sub: 'mm_struct, VMA, Buddy', x: PAD + 20 + (ksW + ksGap), y: ksRow1Y, w: ksW, h: ksH, fill: c.purpleFill, stroke: c.purpleStroke, textColor: c.purpleText, subColor: c.textMuted },
        { label: '파일 시스템', sub: 'VFS, ext4, Page Cache', x: PAD + 20 + (ksW + ksGap) * 2, y: ksRow1Y, w: ksW, h: ksH, fill: c.cyanFill, stroke: c.cyanStroke, textColor: c.cyanText, subColor: c.textMuted },
        { label: '네트워크 스택', sub: 'TCP/IP, sk_buff, NAPI', x: PAD + 20 + (ksW + ksGap) * 3, y: ksRow1Y, w: ksW, h: ksH, fill: c.indigoFill, stroke: c.indigoStroke, textColor: c.indigoText, subColor: c.textMuted },
        { label: '보안', sub: 'LSM, Capabilities, NS', x: PAD + 20 + (ksW + ksGap) * 4, y: ksRow1Y, w: ksW, h: ksH, fill: c.pinkFill, stroke: c.pinkStroke, textColor: c.pinkText, subColor: c.textMuted },
        { label: '동기화', sub: 'Spinlock, Mutex, RCU', x: PAD + 20, y: ksRow2Y, w: ksW, h: ksH, fill: c.redFill, stroke: c.redStroke, textColor: c.redText, subColor: c.textMuted },
        { label: 'IPC', sub: 'pipe, socket, shm', x: PAD + 20 + (ksW + ksGap), y: ksRow2Y, w: ksW, h: ksH, fill: c.amberFill, stroke: c.amberStroke, textColor: c.amberText, subColor: c.textMuted },
        { label: '디바이스 드라이버', sub: 'char, block, net', x: PAD + 20 + (ksW + ksGap) * 2, y: ksRow2Y, w: ksW, h: ksH, fill: c.greenFill, stroke: c.greenStroke, textColor: c.greenText, subColor: c.textMuted },
        { label: '인터럽트', sub: 'IRQ, Softirq, Workqueue', x: PAD + 20 + (ksW + ksGap) * 3, y: ksRow2Y, w: ksW, h: ksH, fill: c.cyanFill, stroke: c.cyanStroke, textColor: c.cyanText, subColor: c.textMuted },
        { label: '가상화', sub: 'KVM, VMCS, virtio', x: PAD + 20 + (ksW + ksGap) * 4, y: ksRow2Y, w: ksW, h: ksH, fill: c.indigoFill, stroke: c.indigoStroke, textColor: c.indigoText, subColor: c.textMuted },
    ]
    kernelSubs.forEach(drawNode)

    // Hardware nodes (inside layer y=465, h=90, title ~22px)
    const hwY = 495
    const hwH = 44
    const hwGap = 16
    const hwW = (fullW - 40 - hwGap * 3) / 4

    const hwNodes: ArchNode[] = [
        { label: 'CPU', sub: 'x86, ARM, RISC-V', x: PAD + 20, y: hwY, w: hwW, h: hwH, fill: c.greenFill, stroke: c.greenStroke, textColor: c.greenText, subColor: c.textMuted },
        { label: 'RAM', sub: 'DDR4/5, NUMA', x: PAD + 20 + (hwW + hwGap), y: hwY, w: hwW, h: hwH, fill: c.greenFill, stroke: c.greenStroke, textColor: c.greenText, subColor: c.textMuted },
        { label: 'NIC', sub: 'Ethernet, InfiniBand', x: PAD + 20 + (hwW + hwGap) * 2, y: hwY, w: hwW, h: hwH, fill: c.greenFill, stroke: c.greenStroke, textColor: c.greenText, subColor: c.textMuted },
        { label: 'Storage', sub: 'NVMe, SATA, virtio-blk', x: PAD + 20 + (hwW + hwGap) * 3, y: hwY, w: hwW, h: hwH, fill: c.greenFill, stroke: c.greenStroke, textColor: c.greenText, subColor: c.textMuted },
    ]
    hwNodes.forEach(drawNode)

    // ── Arrows between layers ───────────────────────────────────────────────
    const arrowColor = c.textDim
    const defs = svg.append('defs')
    defs.append('marker')
        .attr('id', 'ka-arrow')
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 9)
        .attr('refY', 5)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')
        .attr('fill', arrowColor)

    // User → Syscall (3 vertical lines)
    ;[200, 400, 600].forEach((x) => {
        g.append('line')
            .attr('x1', x)
            .attr('y1', 88)
            .attr('x2', x)
            .attr('y2', 118)
            .attr('stroke', arrowColor)
            .attr('stroke-width', 1.2)
            .attr('marker-end', 'url(#ka-arrow)')
    })

    // Syscall → Kernel (fan out)
    const syscallBottom = 170
    const kernelTop = ksRow1Y
    kernelSubs.slice(0, 5).forEach((ks) => {
        const tx = ks.x + ks.w / 2
        g.append('line')
            .attr('x1', VW / 2)
            .attr('y1', syscallBottom)
            .attr('x2', tx)
            .attr('y2', kernelTop)
            .attr('stroke', arrowColor)
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,2')
            .attr('marker-end', 'url(#ka-arrow)')
    })

    // Kernel → Hardware (3 vertical lines)
    ;[250, 420, 590].forEach((x) => {
        g.append('line')
            .attr('x1', x)
            .attr('y1', ksRow2Y + ksH)
            .attr('x2', x)
            .attr('y2', 463)
            .attr('stroke', arrowColor)
            .attr('stroke-width', 1.2)
            .attr('marker-end', 'url(#ka-arrow)')
    })

}

export function KernelArchDiagram() {
    const { theme } = useTheme()

    const renderFn = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, w: number, h: number) => {
            renderKernelArch(svg, w, h)
        },
        [theme], // eslint-disable-line react-hooks/exhaustive-deps
    )

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <D3Container renderFn={renderFn} deps={[theme]} height={580} zoomable />
        </div>
    )
}

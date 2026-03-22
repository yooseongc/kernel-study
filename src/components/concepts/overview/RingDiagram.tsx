import * as d3 from 'd3'
import { themeColors } from '../../../lib/colors'

export interface RingInfo {
    ring: string
    label: string
    sublabel: string
    who: string
    permissions: string[]
    used: boolean
    color: string
    textColor: string
}

export const ringData: RingInfo[] = [
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
        permissions: [
            '모든 CPU 명령어 실행 (cli, hlt, in, out...)',
            '물리 메모리 직접 접근',
            '페이지 테이블 조작',
            'I/O 포트 직접 읽기/쓰기',
        ],
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
        permissions: [
            '특권 명령어 실행 불가',
            '물리 메모리 직접 접근 불가',
            '다른 프로세스 메모리 접근 불가',
            '커널 서비스는 시스템 콜로만 요청',
        ],
        used: true,
        color: '#2563eb',
        textColor: '#bfdbfe',
    },
]

/* ── Theme-aware ring colors ──────────────────────────────────────────── */
interface RingTheme {
    fill: string
    fillHover: string
    stroke: string
    labelColor: string
    sublabelColor: string
}

function ringTheme(isDark: boolean, ring: RingInfo): RingTheme {
    const c = themeColors(isDark)
    // Map each ring to a semantic color from the palette
    if (ring.ring === 'Ring −1') {
        return {
            fill: c.purpleFill,
            fillHover: isDark ? 'oklch(28% 0.10 295)' : 'oklch(88% 0.08 295)',
            stroke: c.purpleStroke,
            labelColor: c.purpleText,
            sublabelColor: c.purpleStroke,
        }
    }
    if (ring.ring === 'Ring 0') {
        return {
            fill: c.redFill,
            fillHover: isDark ? 'oklch(28% 0.10 25)' : 'oklch(88% 0.08 25)',
            stroke: c.redStroke,
            labelColor: c.redText,
            sublabelColor: c.redStroke,
        }
    }
    if (ring.ring === 'Ring 3') {
        return {
            fill: c.blueFill,
            fillHover: isDark ? 'oklch(28% 0.10 250)' : 'oklch(88% 0.08 250)',
            stroke: c.blueStroke,
            labelColor: c.blueText,
            sublabelColor: c.blueStroke,
        }
    }
    // Ring 1 & 2 — unused, dim
    return {
        fill: isDark ? 'oklch(18% 0.01 0)' : 'oklch(95% 0.01 0)',
        fillHover: isDark ? 'oklch(24% 0.02 0)' : 'oklch(90% 0.02 0)',
        stroke: c.textDim,
        labelColor: c.textMuted,
        sublabelColor: c.textDim,
    }
}

export function renderRingDiagram(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    _width: number,
    _height: number,
    onSelect: (ring: RingInfo) => void,
) {
    const isDark = document.documentElement.classList.contains('dark')

    // Use viewBox for crisp scaling — 480x480 internal coordinate space
    const vw = 480
    const vh = 480
    svg.attr('viewBox', `0 0 ${vw} ${vh}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')

    const cx = vw / 2
    const topPad = 44
    const botPad = 20
    const maxR = Math.min(cx - 20, (vh - topPad - botPad) / 2)
    const cy = topPad + maxR

    // ── Wider-spaced radii — even distribution for better text room ──
    // Ring 3 outer = maxR, Ring 0 center = innermost
    // 5 boundaries for 4 bands + center
    const radii = [
        maxR,          // Ring 3 outer
        maxR * 0.78,   // Ring 3 inner / Ring 2 outer
        maxR * 0.58,   // Ring 2 inner / Ring 1 outer
        maxR * 0.40,   // Ring 1 inner / Ring 0 outer band
        maxR * 0.22,   // Ring 0 center circle
    ]

    // rings[0]=Ring3, rings[1]=Ring2, rings[2]=Ring1, rings[3]=Ring0
    const rings = [ringData[4], ringData[3], ringData[2], ringData[1]]

    // ── Ring -1 dashed border ────────────────────────────────────────
    const hvR = maxR + 18
    const hvTheme = ringTheme(isDark, ringData[0])

    svg.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', hvR)
        .attr('fill', 'none')
        .attr('stroke', hvTheme.stroke)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6 4')
        .attr('opacity', 0.8)
        .attr('cursor', 'pointer')
        .on('click', () => onSelect(ringData[0]))

    // Ring -1 label at top of dashed circle
    svg.append('text')
        .attr('x', cx)
        .attr('y', cy - hvR + 16)
        .attr('text-anchor', 'middle')
        .attr('fill', hvTheme.labelColor)
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .attr('font-family', "'JetBrains Mono', monospace")
        .text('Ring −1 · Hypervisor')

    // ── Concentric bands, outside → inside (painter's algorithm) ─────
    rings.forEach((ring, i) => {
        const outerR = radii[i]
        const innerR = radii[i + 1]
        const midR = (outerR + innerR) / 2
        const theme = ringTheme(isDark, ring)

        // Band circle (filled from outer, inner will paint over)
        svg.append('circle')
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', outerR)
            .attr('fill', theme.fill)
            .attr('stroke', theme.stroke)
            .attr('stroke-width', ring.used ? 1.5 : 1)
            .attr('opacity', ring.used ? 1 : 0.65)
            .attr('cursor', 'pointer')
            .on('click', () => onSelect(ring))
            .on('mouseenter', function () {
                d3.select(this).attr('fill', theme.fillHover)
            })
            .on('mouseleave', function () {
                d3.select(this).attr('fill', theme.fill)
            })

        // Label — ring name
        const labelY = cy - midR
        svg.append('text')
            .attr('x', cx)
            .attr('y', labelY - 6)
            .attr('text-anchor', 'middle')
            .attr('fill', theme.labelColor)
            .attr('font-size', '13px')
            .attr('font-weight', ring.used ? '600' : '400')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('pointer-events', 'none')
            .text(ring.label)

        // Sublabel — description
        svg.append('text')
            .attr('x', cx)
            .attr('y', labelY + 10)
            .attr('text-anchor', 'middle')
            .attr('fill', theme.sublabelColor)
            .attr('font-size', '10px')
            .attr('font-family', "'Pretendard Variable', Pretendard, sans-serif")
            .attr('pointer-events', 'none')
            .text(ring.sublabel)
    })

    // ── Ring 0 center circle ─────────────────────────────────────────
    const r0 = radii[4]
    const r0Theme = ringTheme(isDark, ringData[1])

    svg.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', r0)
        .attr('fill', r0Theme.fill)
        .attr('stroke', r0Theme.stroke)
        .attr('stroke-width', 1.5)
        .attr('cursor', 'pointer')
        .on('click', () => onSelect(ringData[1]))
        .on('mouseenter', function () {
            d3.select(this).attr('fill', r0Theme.fillHover)
        })
        .on('mouseleave', function () {
            d3.select(this).attr('fill', r0Theme.fill)
        })

    svg.append('text')
        .attr('x', cx)
        .attr('y', cy - 4)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', r0Theme.labelColor)
        .attr('font-size', '13px')
        .attr('font-weight', '700')
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('pointer-events', 'none')
        .text('Ring 0')

    svg.append('text')
        .attr('x', cx)
        .attr('y', cy + 12)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', r0Theme.sublabelColor)
        .attr('font-size', '10px')
        .attr('font-family', "'Pretendard Variable', Pretendard, sans-serif")
        .attr('pointer-events', 'none')
        .text('Kernel')
}

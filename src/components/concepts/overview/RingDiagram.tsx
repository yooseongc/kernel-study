import * as d3 from 'd3'

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

export function renderRingDiagram(
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

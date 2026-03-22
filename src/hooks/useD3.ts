import { useRef, useEffect } from 'react'
import type { RefObject } from 'react'
import * as d3 from 'd3'

type D3Selection = d3.Selection<SVGSVGElement, unknown, null, undefined>

export function useD3(
    renderFn: (svg: D3Selection) => void,
    deps: React.DependencyList = [],
): RefObject<SVGSVGElement | null> {
    const ref = useRef<SVGSVGElement>(null)

    useEffect(() => {
        if (ref.current) {
            const svg = d3.select(ref.current)
            renderFn(svg)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)

    return ref
}

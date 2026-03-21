import { useRef, useEffect, useState, useCallback } from 'react'
import * as d3 from 'd3'

interface D3ContainerProps {
  renderFn: (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => void
  deps?: React.DependencyList
  className?: string
  height?: number
  zoomable?: boolean
}

export function D3Container({ renderFn, deps = [], className = '', height = 480, zoomable = false }: D3ContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)
    const [width, setWidth] = useState(0)
    const [scale, setScale] = useState(1)
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)

    useEffect(() => {
        if (!containerRef.current) return
        const observer = new ResizeObserver((entries) => {
            setWidth(Math.floor(entries[0].contentRect.width))
        })
        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        if (!svgRef.current || width === 0) return
        const svg = d3.select(svgRef.current)
        svg.selectAll('*').remove()
        renderFn(svg, width, height)

        if (zoomable) {
            const g = svg.select<SVGGElement>('g')
            if (!g.empty()) {
                const zoom = d3.zoom<SVGSVGElement, unknown>()
                    .scaleExtent([0.3, 4])
                    .on('zoom', (event) => {
                        g.attr('transform', event.transform)
                        setScale(Math.round(event.transform.k * 100))
                    })
                svg.call(zoom)
                zoomRef.current = zoom
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width, height, zoomable, ...deps])

    const resetZoom = useCallback(() => {
        if (!svgRef.current || !zoomRef.current) return
        d3.select(svgRef.current)
            .transition().duration(300)
            .call(zoomRef.current.transform, d3.zoomIdentity)
        setScale(100)
    }, [])

    const zoomIn = useCallback(() => {
        if (!svgRef.current || !zoomRef.current) return
        d3.select(svgRef.current).transition().duration(200).call(zoomRef.current.scaleBy, 1.4)
    }, [])

    const zoomOut = useCallback(() => {
        if (!svgRef.current || !zoomRef.current) return
        d3.select(svgRef.current).transition().duration(200).call(zoomRef.current.scaleBy, 1 / 1.4)
    }, [])

    return (
        <div ref={containerRef} className={`w-full relative ${className}`}>
            <svg
                ref={svgRef}
                width={width}
                height={height}
                style={{ display: 'block', overflow: 'hidden' }}
            />
            {zoomable && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1">
                    <span className="text-xs text-gray-400 dark:text-gray-600 mr-1 font-mono">{scale}%</span>
                    <button
                        onClick={zoomOut}
                        className="w-7 h-7 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-sm transition-colors"
                        title="축소"
                    >−</button>
                    <button
                        onClick={resetZoom}
                        className="px-2 h-7 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-xs transition-colors"
                        title="초기화"
                    >↺</button>
                    <button
                        onClick={zoomIn}
                        className="w-7 h-7 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-sm transition-colors"
                        title="확대"
                    >+</button>
                </div>
            )}
        </div>
    )
}

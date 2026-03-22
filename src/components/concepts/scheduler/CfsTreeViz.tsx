import * as d3 from 'd3'
import { useState, useCallback } from 'react'
import { themeColors } from '../../../lib/colors'
import { D3Container } from '../../viz/D3Container'

// ── CFS 트리 데이터 ──────────────────────────────────────────────────────────
interface CfsNode {
    name: string
    vruntime: number
    nice: number
    color: 'red' | 'black'
    children?: CfsNode[]
}

const initialTree: CfsNode = {
    name: 'nginx',
    vruntime: 20,
    nice: 0,
    color: 'black',
    children: [
        {
            name: 'bash',
            vruntime: 12,
            nice: 0,
            color: 'red',
            children: [{ name: 'init', vruntime: 8, nice: -5, color: 'black' }],
        },
        {
            name: 'python',
            vruntime: 35,
            nice: 5,
            color: 'black',
            children: [
                { name: 'sshd', vruntime: 28, nice: 0, color: 'red' },
                { name: 'cron', vruntime: 48, nice: 10, color: 'red' },
            ],
        },
    ],
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
    onNodeClick: (info: SelectedNodeInfo) => void,
) {
    const isDark = document.documentElement.classList.contains('dark')
    const c = themeColors(isDark)
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const margin = { top: 50, right: 40, bottom: 40, left: 40 }
    const innerW = width - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const root = d3.hierarchy<CfsNode>(treeData, (d) => d.children)
    const treeLayout = d3.tree<CfsNode>().size([innerW, innerH])
    treeLayout(root)

    const leftmostName = findLeftmost(treeData).name

    const linkGen = d3
        .linkVertical<d3.HierarchyPointLink<CfsNode>, d3.HierarchyPointNode<CfsNode>>()
        .x((d) => d.x)
        .y((d) => d.y)

    g.selectAll('path.link')
        .data(root.links())
        .join('path')
        .attr('class', 'link')
        .attr('fill', 'none')
        .attr('stroke', c.textDim)
        .attr('stroke-width', 1.5)
        .attr('d', (d) => linkGen(d as d3.HierarchyPointLink<CfsNode>) ?? '')

    const nodeG = g
        .selectAll<SVGGElement, d3.HierarchyPointNode<CfsNode>>('g.node')
        .data(root.descendants())
        .join('g')
        .attr('class', 'node')
        .attr('transform', (d) => `translate(${d.x},${d.y})`)
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

    nodeG
        .append('circle')
        .attr('r', nodeR)
        .attr('fill', (d) => (d.data.color === 'red' ? c.redFill : c.bgCard))
        .attr('stroke', (d) => {
            if (d.data.name === leftmostName) return c.blueStroke
            return d.data.color === 'red' ? c.redStroke : c.border
        })
        .attr('stroke-width', (d) => (d.data.name === leftmostName ? 2.5 : 1.5))

    nodeG
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('y', -3)
        .attr('fill', (d) => (d.data.color === 'red' ? c.redText : c.text))
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .attr('pointer-events', 'none')
        .text((d) => d.data.name)

    nodeG
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('y', 8)
        .attr('fill', (d) => (d.data.color === 'red' ? c.redStroke : c.textMuted))
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .attr('pointer-events', 'none')
        .text((d) => `${d.data.vruntime}ms`)

    nodeG
        .filter((d) => d.data.name === leftmostName)
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

export function CfsTreeViz() {
    const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>(null)
    const [cfsTree, setCfsTree] = useState<CfsNode>(initialTree)
    const [simCount, setSimCount] = useState(0)

    const handleNodeClick = useCallback((info: SelectedNodeInfo) => {
        setSelectedNode(info)
    }, [])

    const handleSimulate = useCallback(() => {
        const newProcessNames = ['vim', 'grep', 'curl', 'node', 'go', 'rustc', 'docker', 'kubectl']
        const niceValues = [-5, 0, 0, 5, 10, 0, -5, 5]
        const rbColors: Array<'red' | 'black'> = ['red', 'black', 'red', 'black', 'red', 'black', 'red', 'black']
        const idx = simCount % newProcessNames.length
        const insertVruntime = 15 + Math.floor(Math.random() * 30)

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
        setSimCount((c) => c + 1)
        setSelectedNode(null)
    }, [cfsTree, simCount])

    const renderCFSWithState = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, w: number, h: number) => {
            renderCFSTree(svg, w, h, cfsTree, handleNodeClick)
        },
        [cfsTree, handleNodeClick],
    )

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CFS 트리 */}
            <div className="md:col-span-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        CFS 런큐 — Red-Black 트리 (vruntime 기준 BST)
                    </span>
                    <button
                        onClick={handleSimulate}
                        className="text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono transition-colors"
                    >
                        ▶ 스케줄링 시뮬레이션
                    </button>
                </div>
                <D3Container renderFn={renderCFSWithState} deps={[cfsTree]} height={300} zoomable />
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
                                <div className="font-bold text-gray-900 dark:text-gray-100 font-mono">
                                    {selectedNode.name}
                                </div>
                                <div
                                    className="text-xs"
                                    style={{ color: selectedNode.color === 'red' ? '#ef4444' : '#9ca3af' }}
                                >
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
                                <span className="font-mono text-gray-900 dark:text-gray-100">
                                    {selectedNode.vruntime}ms
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">nice</span>
                                <span className="font-mono text-gray-900 dark:text-gray-100">{selectedNode.nice}</span>
                            </div>
                        </div>
                        {selectedNode.isNext && (
                            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-2.5 text-xs text-blue-700 dark:text-blue-300">
                                이 프로세스가 RB 트리에서 가장 왼쪽(최소 vruntime) 노드입니다. 다음 타임슬라이스에 CPU를
                                할당받습니다.
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
                        노드를 클릭하면
                        <br />
                        정보가 표시됩니다
                    </div>
                )}
            </div>
        </div>
    )
}

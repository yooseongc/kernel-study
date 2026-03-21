import { useRef, useEffect } from 'react'
import * as THREE from 'three'

interface WebGLCanvasProps {
  setupFn: (ctx: {
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    canvas: HTMLCanvasElement
  }) => (() => void) | void
  className?: string
}

export function WebGLCanvas({ setupFn, className = '' }: WebGLCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        if (!canvasRef.current) return
        const canvas = canvasRef.current
        const w = canvas.clientWidth
        const h = canvas.clientHeight

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000)
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
        renderer.setSize(w, h, false)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

        const cleanup = setupFn({ scene, camera, renderer, canvas })

        const onResize = () => {
            const nw = canvas.clientWidth
            const nh = canvas.clientHeight
            camera.aspect = nw / nh
            camera.updateProjectionMatrix()
            renderer.setSize(nw, nh, false)
        }
        window.addEventListener('resize', onResize)

        return () => {
            cleanup?.()
            renderer.dispose()
            window.removeEventListener('resize', onResize)
        }
    }, [setupFn])

    return <canvas ref={canvasRef} className={`w-full h-full ${className}`} />
}

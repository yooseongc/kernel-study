import { useRef, useEffect } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'

interface ThreeContext {
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
}

export function useThree(
    setupFn: (ctx: ThreeContext) => (() => void) | void,
    deps: React.DependencyList = [],
): RefObject<HTMLCanvasElement | null> {
    const ref = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        if (!ref.current) return

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(75, ref.current.clientWidth / ref.current.clientHeight, 0.1, 1000)
        const renderer = new THREE.WebGLRenderer({ canvas: ref.current, antialias: true, alpha: true })
        renderer.setSize(ref.current.clientWidth, ref.current.clientHeight)
        renderer.setPixelRatio(window.devicePixelRatio)

        const cleanup = setupFn({ scene, camera, renderer })

        return () => {
            cleanup?.()
            renderer.dispose()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)

    return ref
}

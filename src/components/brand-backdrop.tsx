import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTheme } from 'next-themes'

const Scene = lazy(() => import('./three-background'))

class GraphicsBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  override render() {
    return this.state.failed ? null : this.props.children
  }
}

/** Respaldo sin WebGL (móvil, reduced-motion o sin soporte): mismo ambiente, solo con Tailwind. */
function StaticBackdrop() {
  return (
    <>
      <div className="absolute -top-40 -right-32 size-[42rem] rounded-full bg-[#20c6a5]/18 blur-3xl dark:bg-[#20c6a5]/14" />
      <div className="absolute -bottom-48 -left-40 size-[38rem] rounded-full bg-[#7ea1e0]/16 blur-3xl dark:bg-[#7ea1e0]/10" />
      <div className="absolute inset-x-0 bottom-0 h-[55%] perspective-[900px] group-has-[canvas]/backdrop:opacity-0 transition-opacity duration-1000">
        <div className="absolute inset-x-[-40%] bottom-[-10%] h-[160%] origin-bottom rotate-x-[62deg] bg-[linear-gradient(to_right,color-mix(in_srgb,#20c6a5_30%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,#20c6a5_30%,transparent)_1px,transparent_1px)] bg-size-[56px_56px] mask-[linear-gradient(to_top,black,transparent_85%)]" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle,color-mix(in_srgb,#20c6a5_45%,transparent)_1px,transparent_1.5px)] bg-size-[38px_38px] opacity-40 mask-[radial-gradient(ellipse_at_70%_20%,black,transparent_65%)] group-has-[canvas]/backdrop:opacity-0 transition-opacity duration-1000" />
    </>
  )
}

export function BrandBackdrop() {
  const host = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const media = matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)')
    let visible = true
    let supported: boolean | undefined
    const update = () => {
      if (!media.matches) {
        setMounted(false)
        setRunning(false)
        return
      }
      if (supported === undefined) {
        const gl = document.createElement('canvas').getContext('webgl2')
        supported = !!gl
        gl?.getExtension('WEBGL_lose_context')?.loseContext()
      }
      setMounted(supported)
      // Pausa el render (sin destruir el contexto WebGL) cuando la pestaña o el fondo no se ven.
      setRunning(supported && visible && !document.hidden)
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false
      update()
    })
    if (host.current) observer.observe(host.current)
    update()
    media.addEventListener('change', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      observer.disconnect()
      media.removeEventListener('change', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  return (
    <div
      ref={host}
      aria-hidden="true"
      className="group/backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none print:hidden"
    >
      <StaticBackdrop />
      {mounted && (
        <GraphicsBoundary>
          <Suspense fallback={null}>
            <div className="absolute inset-0 animate-fade-in">
              <Scene dark={resolvedTheme === 'dark'} running={running} />
            </div>
          </Suspense>
        </GraphicsBoundary>
      )}
      {/* Viñeta: oscurece bordes y la zona baja para que tarjetas y gráficos mantengan contraste. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_35%,transparent_35%,var(--background)_100%)] opacity-60" />
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-background/10 to-background/55" />
    </div>
  )
}

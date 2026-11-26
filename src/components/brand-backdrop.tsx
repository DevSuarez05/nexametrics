import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { LogoMark } from './logo'

const Scene = lazy(() => import('./three-background'))
class GraphicsBoundary extends Component<{children:ReactNode}, {failed:boolean}> {
  override state = { failed:false }
  static getDerivedStateFromError() { return { failed:true } }
  override render() { return this.state.failed ? null : this.props.children }
}

export function BrandBackdrop() {
  const host = useRef<HTMLDivElement>(null)
  const [active,setActive] = useState(false)
  useEffect(() => {
    const media = matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)')
    let visible = false
    let supported: boolean | undefined
    const update = () => {
      if (!visible || !media.matches || document.hidden) { setActive(false); return }
      if (supported === undefined) {
        const gl = document.createElement('canvas').getContext('webgl2')
        supported = !!gl
        gl?.getExtension('WEBGL_lose_context')?.loseContext()
      }
      setActive(supported)
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; update() })
    if (host.current) observer.observe(host.current)
    media.addEventListener('change',update); document.addEventListener('visibilitychange',update)
    return () => { observer.disconnect(); media.removeEventListener('change',update); document.removeEventListener('visibilitychange',update) }
  },[])
  return <div aria-hidden="true" className="brand-backdrop pointer-events-none absolute inset-x-0 bottom-0 top-32 -z-10 select-none overflow-hidden print:hidden">
    <div ref={host} className="brand-field">
      <div className="brand-imprints"><LogoMark/><LogoMark/><LogoMark/></div>
      {active && <GraphicsBoundary><Suspense fallback={null}><Scene/></Suspense></GraphicsBoundary>}
    </div>
    <div className="brand-field brand-field-echo"><div className="brand-imprints"><LogoMark/><LogoMark/><LogoMark/></div></div>
  </div>
}

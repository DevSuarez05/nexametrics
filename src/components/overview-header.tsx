import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { AudioLines } from "lucide-react";

const SignalScene = lazy(() => import("./three-background"));

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function OverviewHeader() {
  const panel = useRef<HTMLElement>(null);
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const media = matchMedia(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
    );
    let visible = false;
    const update = () => setEnabled(media.matches && visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      update();
    });
    if (panel.current) observer.observe(panel.current);
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return (
    <section
      ref={panel}
      aria-labelledby="overview-title"
      className="relative isolate flex items-stretch gap-6 overflow-hidden border-b border-border pb-4"
    >
      <div aria-hidden="true" className="signal-art pointer-events-none relative order-last ml-auto hidden w-1/3 max-w-sm shrink-0 select-none overflow-hidden sm:block print:hidden">
        <svg
          viewBox="0 0 400 180"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
          fill="none"
        >
          {Array.from({ length: 25 }, (_, i) => (
            <path
              key={i}
              d={`M -20 ${109 + i * 2} C 48 ${145 + i * 2}, 72 ${24 + i * 4}, 145 ${72 + i * 3} S 222 ${187 - i * 3}, 289 ${81 - i * 2} S 373 ${28 + i * 2}, 425 ${57 + i * 3}`}
              stroke="currentColor"
              strokeWidth="0.8"
              opacity={0.3 + i / 60}
            />
          ))}
        </svg>
        {enabled && (
          <SceneBoundary>
            <Suspense fallback={null}>
              <SignalScene />
            </Suspense>
          </SceneBoundary>
        )}
      </div>
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[.15em] text-muted-foreground uppercase">
          <AudioLines className="size-3.5 text-success" aria-hidden="true" /> Centro de operaciones
        </div>
        <h1 id="overview-title" className="text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Compras, ventas y margen del período seleccionado.</p>
      </div>
    </section>
  );
}

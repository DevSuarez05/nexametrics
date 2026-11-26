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
      className="signal-banner relative isolate overflow-hidden rounded-2xl px-6 py-7 sm:px-8 sm:py-9"
    >
      <div aria-hidden="true" className="signal-art absolute inset-y-0 right-0 w-2/3 sm:w-1/2">
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
      <div className="pointer-events-none relative max-w-md">
        <div className="mb-4 flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[.18em] text-sidebar-primary uppercase">
          <AudioLines className="size-4" aria-hidden="true" /> Centro de operaciones
        </div>
        <h1 id="overview-title" className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Overview
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-sidebar-foreground/85">
          Conoce tus números de un vistazo: lo que compras, lo que vendes y la diferencia entre
          ambos.
        </p>
      </div>
    </section>
  );
}

import { AudioLines } from 'lucide-react'

export function OverviewHeader() {
  return (
    <header aria-labelledby="overview-title" className="border-b border-border pb-4">
      <div className="mb-1 flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[.15em] text-muted-foreground uppercase">
        <AudioLines className="size-3.5 text-success" aria-hidden="true" /> Centro de operaciones
      </div>
      <h1 id="overview-title" className="text-3xl font-semibold tracking-tight">Overview</h1>
      <p className="mt-1 text-sm text-muted-foreground">Compras, ventas y margen del período seleccionado.</p>
    </header>
  )
}

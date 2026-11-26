import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Ban, CheckCircle2, Clock, Minus, Receipt, ShoppingCart, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatSignedPercent } from '@/lib/format'
import type { OperationKind, OperationStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex max-w-3xl flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div>}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando datos">
      <Skeleton className="h-14 w-full max-w-xl" />
      <div className="grid grid-cols-2 gap-4 @4xl/main:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  )
}

const STATUS_STYLE: Record<OperationStatus, { icon: LucideIcon; className: string }> = {
  Completada: { icon: CheckCircle2, className: 'border-success/30 bg-success/10 text-success' },
  Pendiente: { icon: Clock, className: 'border-warning/30 bg-warning/10 text-warning' },
  Anulada: { icon: Ban, className: 'border-destructive/30 bg-destructive/10 text-destructive' },
}

export function StatusBadge({ status }: { status: OperationStatus }) {
  const { icon: Icon, className } = STATUS_STYLE[status]
  return (
    <Badge variant="outline" className={className}>
      <Icon aria-hidden="true" />
      {status}
    </Badge>
  )
}

export function KindBadge({ kind }: { kind: OperationKind }) {
  const purchase = kind === 'compra'
  const Icon = purchase ? ShoppingCart : Receipt
  return (
    <Badge variant={purchase ? 'secondary' : 'default'}>
      <Icon aria-hidden="true" />
      {purchase ? 'Compra' : 'Venta'}
    </Badge>
  )
}

export function Delta({
  value,
  label,
  tone = 'directional',
}: {
  value: number | null
  label?: string
  tone?: 'directional' | 'neutral'
}) {
  if (value === null) return <span className="text-xs text-muted-foreground">Sin periodo comparable</span>
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus
  const color =
    tone === 'neutral' || value === 0 ? 'text-muted-foreground' : value > 0 ? 'text-success' : 'text-destructive'
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
      <span className={cn('inline-flex items-center gap-0.5 font-medium tabular-nums', color)}>
        <Icon className="size-3.5" aria-hidden="true" />
        {formatSignedPercent(value)}
      </span>
      {label && <span className="text-muted-foreground">{label}</span>}
    </span>
  )
}

interface KpiCardProps {
  label: string
  value: string
  icon: LucideIcon
  detail?: ReactNode
  footer?: ReactNode
  textual?: boolean
}

export function KpiCard({ label, value, icon: Icon, detail, footer, textual }: KpiCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Icon className="size-3.5" aria-hidden="true" />
          </span>
          {label}
        </CardDescription>
        <CardTitle
          className={cn(
            'font-semibold tracking-tight text-balance',
            textual ? 'text-base leading-snug' : 'text-xl tabular-nums @4xl/main:text-2xl',
          )}
        >
          {value}
        </CardTitle>
      </CardHeader>
      {(detail || footer) && (
        <CardContent className="flex flex-col gap-1.5">
          {detail && <div className="text-xs leading-relaxed text-muted-foreground">{detail}</div>}
          {footer}
        </CardContent>
      )}
    </Card>
  )
}

export function NoData({ message = 'No hay datos para los filtros seleccionados.' }: { message?: string }) {
  return (
    <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{message}</p>
  )
}

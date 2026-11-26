import { createFileRoute } from '@tanstack/react-router'
import { NoData, PageHeader, PageSkeleton } from '@/components/common'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { extremes, productStats } from '@/lib/analytics'
import { formatCOP, formatNumber, formatPercent } from '@/lib/format'
import { pageHead } from '@/lib/seo'
import { describe, type Descriptive } from '@/lib/stats'
import { useNexa } from '@/lib/store'
import type { Operation } from '@/lib/types'

export const Route = createFileRoute('/analisis')({
  head: () => pageHead('Análisis estadístico', 'Estadística descriptiva de compras y ventas: media, mediana, desviación y extremos.'),
  component: Analisis,
})

const METRICS: { key: keyof Descriptive; label: string; money: boolean }[] = [
  { key: 'count', label: 'Número de operaciones', money: false },
  { key: 'total', label: 'Suma', money: true },
  { key: 'mean', label: 'Media', money: true },
  { key: 'median', label: 'Mediana', money: true },
  { key: 'min', label: 'Mínimo', money: true },
  { key: 'max', label: 'Máximo', money: true },
  { key: 'sdPopulation', label: 'Desviación estándar (poblacional)', money: true },
  { key: 'sdSample', label: 'Desviación estándar (muestral)', money: true },
]

function fmt(d: Descriptive | null, key: keyof Descriptive, money: boolean) {
  const v = d?.[key]
  if (v === null || v === undefined) return '—'
  return money ? formatCOP(v) : formatNumber(v)
}

function Extreme({ title, ops }: { title: string; ops: Operation[] }) {
  const e = extremes(ops)
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        {e ? (
          <>
            <span>
              Mayor: <span className="font-mono">{e.max.code}</span> · {formatCOP(e.max.total)}
            </span>
            <span>
              Menor: <span className="font-mono">{e.min.code}</span> · {formatCOP(e.min.total)}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Sin datos</span>
        )}
      </CardContent>
    </Card>
  )
}

function Analisis() {
  const { ready, activePurchases, activeSales, activeOperations, costBasis } = useNexa()
  if (!ready) return <PageSkeleton />
  const p = describe(activePurchases.map((o) => o.total))
  const s = describe(activeSales.map((o) => o.total))
  const products = productStats(activeOperations, costBasis)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Análisis estadístico"
        description="Estadística descriptiva sobre el valor total de cada operación activa (se excluyen las anuladas)."
      />
      <Card>
        <CardHeader>
          <CardTitle>Estadística descriptiva</CardTitle>
          <CardDescription>Valores en pesos colombianos (COP)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medida</TableHead>
                <TableHead className="text-right">Compras</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {METRICS.map((m) => (
                <TableRow key={m.key}>
                  <TableCell className="font-medium">{m.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(p, m.key, m.money)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(s, m.key, m.money)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="grid gap-4 @3xl/main:grid-cols-2">
        <Extreme title="Extremos en compras" ops={activePurchases} />
        <Extreme title="Extremos en ventas" ops={activeSales} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Análisis por producto</CardTitle>
          <CardDescription>Costo promedio, precio promedio y margen unitario estimado</CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <NoData />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Uds. compradas</TableHead>
                  <TableHead className="text-right">Uds. vendidas</TableHead>
                  <TableHead className="text-right">Costo prom.</TableHead>
                  <TableHead className="text-right">Precio prom.</TableHead>
                  <TableHead className="text-right">Margen %</TableHead>
                  <TableHead className="text-right">Margen est.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((r) => (
                  <TableRow key={r.productId}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(r.unitsBought)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(r.unitsSold)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.avgCost === null ? '—' : formatCOP(r.avgCost)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.avgPrice === null ? '—' : formatCOP(r.avgPrice)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.marginPct === null ? '—' : formatPercent(r.marginPct)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.estMargin === null ? '—' : formatCOP(r.estMargin)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

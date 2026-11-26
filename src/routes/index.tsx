import { createFileRoute } from '@tanstack/react-router'
import { Activity, Percent, Receipt, Scale, ShoppingCart, Trophy } from 'lucide-react'
import { DistributionPie, GroupedBars, PURCHASE_SERIES, SALES_SERIES, TrendLines } from '@/components/charts'
import { KpiCard, NoData, PageHeader, PageSkeleton } from '@/components/common'
import { OperationsTable } from '@/components/operations-page'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { monthlySeries, productStats, summarize, topByTotal } from '@/lib/analytics'
import { formatCompact, formatCOP, formatNumber, formatPercent, shortName } from '@/lib/format'
import { pageHead } from '@/lib/seo'
import { useNexa } from '@/lib/store'

export const Route = createFileRoute('/')({
  head: () =>
    pageHead('Overview', 'Resumen de compras, ventas, diferencia y margen estimado de tu negocio.'),
  component: Overview,
})

function Overview() {
  const { ready, activeOperations, costBasis } = useNexa()
  if (!ready) return <PageSkeleton />
  const s = summarize(activeOperations, costBasis)
  const months = monthlySeries(activeOperations)
  const products = productStats(activeOperations, costBasis).slice(0, 6)
  const top = topByTotal(activeOperations, 5)
  const best = products[0]
  const bySales = productStats(activeOperations, costBasis)
    .filter((p) => p.salesTotal > 0)
    .sort((a, b) => b.salesTotal - a.salesTotal)
  const pieData = [
    ...bySales.slice(0, 4).map((p) => ({ name: shortName(p.name), value: p.salesTotal })),
    ...(bySales.length > 4 ? [{ name: 'Otros', value: bySales.slice(4).reduce((acc, p) => acc + p.salesTotal, 0) }] : []),
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        description="Conoce tus números de un vistazo: lo que compras, lo que vendes y la diferencia entre ambos."
      />
      <div className="grid grid-cols-2 gap-4 @4xl/main:grid-cols-3 @6xl/main:grid-cols-6">
        <KpiCard label="Total compras" value={formatCOP(s.purchaseTotal)} icon={ShoppingCart} detail={`${s.purchaseCount} operaciones`} />
        <KpiCard label="Total ventas" value={formatCOP(s.salesTotal)} icon={Receipt} detail={`${s.saleCount} operaciones`} />
        <KpiCard label="Diferencia" value={formatCOP(s.difference)} icon={Scale} detail="Ventas − compras" />
        <KpiCard
          label="Margen estimado"
          value={s.margin.marginPct === null ? '—' : formatPercent(s.margin.marginPct)}
          icon={Percent}
          detail={s.margin.available ? `${formatCOP(s.margin.margin)}${s.margin.partial ? ' (parcial)' : ''}` : 'Sin costo de referencia'}
        />
        <KpiCard label="Operaciones" value={formatNumber(s.opsCount)} icon={Activity} detail={`${formatNumber(s.unitsSold)} unidades vendidas`} />
        <KpiCard label="Producto con más movimiento" value={best ? best.name : '—'} icon={Trophy} textual detail={best ? `${formatNumber(best.movement)} unidades` : undefined} />
      </div>
      <div className="grid gap-4 @5xl/main:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribución de ventas por producto</CardTitle>
            <CardDescription>Participación de cada producto en el total vendido</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length ? (
              <DistributionPie data={pieData} format={formatCOP} label="Distribución de ventas por producto" />
            ) : (
              <NoData />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tendencia mensual</CardTitle>
            <CardDescription>Compras y ventas por mes</CardDescription>
          </CardHeader>
          <CardContent>
            {months.length ? (
              <TrendLines data={months as never} categoryKey="label" series={[PURCHASE_SERIES, SALES_SERIES]} format={formatCOP} tickFormat={formatCompact} label="Tendencia mensual de compras y ventas" />
            ) : (
              <NoData />
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Productos principales</CardTitle>
          <CardDescription>Valor comprado y vendido por producto</CardDescription>
        </CardHeader>
        <CardContent>
          {products.length ? (
            <GroupedBars
              horizontal
              data={products.map((p) => ({ name: shortName(p.name), compras: p.purchaseTotal, ventas: p.salesTotal }))}
              categoryKey="name"
              series={[PURCHASE_SERIES, SALES_SERIES]}
              format={formatCOP}
              tickFormat={formatCompact}
              label="Compras y ventas por producto"
            />
          ) : (
            <NoData />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Operaciones de mayor valor</CardTitle>
          <CardDescription>Las 5 operaciones activas con mayor total</CardDescription>
        </CardHeader>
        <CardContent>
          <OperationsTable operations={top} showKind />
        </CardContent>
      </Card>
    </div>
  )
}

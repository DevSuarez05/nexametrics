import { createFileRoute } from '@tanstack/react-router'
import { GroupedBars, PURCHASE_SERIES, SALES_SERIES } from '@/components/charts'
import { Delta, NoData, PageHeader, PageSkeleton } from '@/components/common'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { summarize, yearlySeries } from '@/lib/analytics'
import { formatCompact, formatCOP, formatDate, formatNumber, formatPercent } from '@/lib/format'
import { pageHead } from '@/lib/seo'
import { pctChange } from '@/lib/stats'
import { useNexa } from '@/lib/store'

export const Route = createFileRoute('/comparativa')({
  head: () => pageHead('Comparativa', 'Compara el periodo actual contra el anterior y la evolución anual.'),
  component: Comparativa,
})

function Comparativa() {
  const { ready, comparison, costBasis, baseOperations } = useNexa()
  if (!ready) return <PageSkeleton />
  const years = yearlySeries(baseOperations)

  const rows = comparison
    ? (() => {
        const cur = summarize(comparison.current, costBasis)
        const prev = summarize(comparison.previous, costBasis)
        return [
          { label: 'Total compras', cur: formatCOP(cur.purchaseTotal), prev: formatCOP(prev.purchaseTotal), d: pctChange(cur.purchaseTotal, prev.purchaseTotal), neutral: true },
          { label: 'Total ventas', cur: formatCOP(cur.salesTotal), prev: formatCOP(prev.salesTotal), d: pctChange(cur.salesTotal, prev.salesTotal) },
          { label: 'Diferencia', cur: formatCOP(cur.difference), prev: formatCOP(prev.difference), d: pctChange(cur.difference, prev.difference) },
          { label: 'Operaciones', cur: formatNumber(cur.opsCount), prev: formatNumber(prev.opsCount), d: pctChange(cur.opsCount, prev.opsCount), neutral: true },
          { label: 'Unidades vendidas', cur: formatNumber(cur.unitsSold), prev: formatNumber(prev.unitsSold), d: pctChange(cur.unitsSold, prev.unitsSold) },
          {
            label: 'Margen estimado',
            cur: cur.margin.marginPct === null ? '—' : formatPercent(cur.margin.marginPct),
            prev: prev.margin.marginPct === null ? '—' : formatPercent(prev.margin.marginPct),
            d: pctChange(cur.margin.marginPct, prev.margin.marginPct),
          },
        ]
      })()
    : []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Comparativa"
        description="Compara el periodo seleccionado con el periodo inmediatamente anterior de igual duración. Usa los filtros de fecha, mes o año para elegir el periodo."
      />
      <Card>
        <CardHeader>
          <CardTitle>{comparison ? comparison.label : 'Periodo actual vs. anterior'}</CardTitle>
          {comparison && (
            <CardDescription>
              Actual: {formatDate(comparison.periods.current.from)} – {formatDate(comparison.periods.current.to)} · Anterior:{' '}
              {formatDate(comparison.periods.previous.from)} – {formatDate(comparison.periods.previous.to)}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {comparison ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicador</TableHead>
                  <TableHead className="text-right">Periodo actual</TableHead>
                  <TableHead className="text-right">Periodo anterior</TableHead>
                  <TableHead>Variación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.label}>
                    <TableCell className="font-medium">{r.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.cur}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.prev}</TableCell>
                    <TableCell>
                      <Delta value={r.d} tone={r.neutral ? 'neutral' : 'directional'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <NoData message="No hay datos suficientes para comparar periodos." />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Evolución anual</CardTitle>
          <CardDescription>Compras y ventas por año</CardDescription>
        </CardHeader>
        <CardContent>
          {years.length ? (
            <GroupedBars data={years as never} categoryKey="label" series={[PURCHASE_SERIES, SALES_SERIES]} format={formatCOP} tickFormat={formatCompact} label="Compras y ventas por año" />
          ) : (
            <NoData />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

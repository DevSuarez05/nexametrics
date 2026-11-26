import { createFileRoute } from '@tanstack/react-router'
import { Download, Printer } from 'lucide-react'
import { PageHeader, PageSkeleton } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { describeFilters, monthlySeries, summarize } from '@/lib/analytics'
import { formatCOP, formatNumber, formatPercent, monthLabelLong } from '@/lib/format'
import { pageHead } from '@/lib/seo'
import { useNexa } from '@/lib/store'

export const Route = createFileRoute('/reportes')({
  head: () => pageHead('Reportes', 'Reporte imprimible y exportable de compras y ventas.'),
  component: Reportes,
})

function Reportes() {
  const { ready, activeOperations, purchases, sales, costBasis, filters, products } = useNexa()
  if (!ready) return <PageSkeleton />
  const s = summarize(activeOperations, costBasis)
  const months = monthlySeries(activeOperations)
  const productName = products.find((p) => p.id === filters.productId)?.name
  const scope = describeFilters(filters, productName)

  const exportCsv = () => {
    const header = ['tipo', 'codigo', 'fecha', 'producto', 'tercero', 'cantidad', 'precio_unitario', 'total', 'estado', 'notas']
    const rows = [...purchases, ...sales]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((op) => [op.kind, op.code, op.date, op.productName, op.party, op.quantity, op.unitPrice, op.total, op.status, op.notes])
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'nexametrics-operaciones.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reportes"
        description={`Resumen ejecutivo · ${scope}`}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download data-icon="inline-start" />
              Exportar CSV
            </Button>
            <Button onClick={() => window.print()}>
              <Printer data-icon="inline-start" />
              Imprimir
            </Button>
          </>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
          <CardDescription>Operaciones activas</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm @3xl/main:grid-cols-4">
          {[
            ['Total compras', formatCOP(s.purchaseTotal)],
            ['Total ventas', formatCOP(s.salesTotal)],
            ['Diferencia', formatCOP(s.difference)],
            ['Margen estimado', s.margin.marginPct === null ? '—' : formatPercent(s.margin.marginPct)],
            ['Compras', formatNumber(s.purchaseCount)],
            ['Ventas', formatNumber(s.saleCount)],
            ['Unidades compradas', formatNumber(s.unitsBought)],
            ['Unidades vendidas', formatNumber(s.unitsSold)],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <span className="text-muted-foreground">{k}</span>
              <span className="text-base font-semibold tabular-nums">{v}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Detalle mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead className="text-right">Compras</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
                <TableHead className="text-right">Diferencia</TableHead>
                <TableHead className="text-right">Operaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((m) => (
                <TableRow key={m.key}>
                  <TableCell className="font-medium">{monthLabelLong(m.key)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCOP(m.compras)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCOP(m.ventas)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCOP(m.diferencia)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(m.opsCompras + m.opsVentas)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

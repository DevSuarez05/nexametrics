import { useMemo } from 'react'
import { describeFilters, latestDate, monthlySeries, productStats, summarize, type Summary } from '@/lib/analytics'
import { monthLabelLong } from '@/lib/format'
import { useNexa } from '@/lib/store'
import type { Operation } from '@/lib/types'

const MAX_CONTEXT_CHARS = 32_000 // ≈ 8.000 tokens
const round = (value: number | null, digits = 0) => (value === null ? null : Number(value.toFixed(digits)))

function compactSummary(summary: Summary) {
  return {
    ventas: round(summary.salesTotal),
    compras: round(summary.purchaseTotal),
    diferencia: round(summary.difference),
    numVentas: summary.saleCount,
    numCompras: summary.purchaseCount,
    unidadesVendidas: summary.unitsSold,
    unidadesCompradas: summary.unitsBought,
    ventaPromedio: round(summary.avgSale),
    compraPromedio: round(summary.avgPurchase),
    margenEstimado: summary.margin.available ? round(summary.margin.margin) : null,
    margenEstimadoPct: round(summary.margin.marginPct, 1),
  }
}

const compactOperation = (op: Operation) => ({
  codigo: op.code,
  tipo: op.kind,
  fecha: op.date,
  producto: op.productName,
  contraparte: op.party,
  cantidad: op.quantity,
  precioUnitario: op.unitPrice,
  total: op.total,
  estado: op.status,
})

/** Resumen compacto (JSON) de los datos visibles, para dárselo como contexto al asistente. */
export function useNexaContext(): { ready: boolean; context: string } {
  const { ready, filters, products, activeOperations, purchases, sales, costBasis, comparison } = useNexa()

  const context = useMemo(() => {
    if (!ready) return ''
    const productName = products.find((product) => product.id === filters.productId)?.name

    const months = monthlySeries(activeOperations).map((point) => {
      const summary = summarize(
        activeOperations.filter((op) => op.date.startsWith(point.key)),
        costBasis,
      )
      return { mes: monthLabelLong(point.key), clave: point.key, ...compactSummary(summary) }
    })

    const stats = productStats(activeOperations, costBasis).map((stat) => ({
      producto: stat.name,
      ventas: round(stat.salesTotal),
      unidadesVendidas: stat.unitsSold,
      compras: round(stat.purchaseTotal),
      unidadesCompradas: stat.unitsBought,
      stockNeto: stat.unitsBought - stat.unitsSold,
      costoPromedio: round(stat.avgCost),
      precioPromedio: round(stat.avgPrice),
      margenEstimado: round(stat.estMargin),
      margenPct: round(stat.marginPct, 1),
    }))
    const top = (key: 'ventas' | 'margenEstimado') =>
      stats
        .filter((stat) => stat[key] !== null)
        .sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0))
        .slice(0, 10)

    const recent = [...purchases, ...sales]
      .sort((a, b) => b.date.localeCompare(a.date) || b.code.localeCompare(a.code))
      .slice(0, 50)
      .map(compactOperation)

    const data = {
      moneda: 'COP',
      fechaMasReciente: latestDate(activeOperations),
      filtrosActivos: describeFilters(filters, productName),
      nota: 'Totales y rankings excluyen operaciones anuladas. Margen = precio de venta - costo promedio de compra (estimado).',
      totales: compactSummary(summarize(activeOperations, costBasis)),
      comparacion: comparison
        ? {
            descripcion: comparison.label,
            periodoActual: { ...comparison.periods.current, ...compactSummary(summarize(comparison.current, costBasis)) },
            periodoAnterior: {
              ...comparison.periods.previous,
              ...compactSummary(summarize(comparison.previous, costBasis)),
            },
          }
        : null,
      porMes: months,
      topProductosPorVentas: top('ventas'),
      topProductosPorMargen: top('margenEstimado'),
      ultimasOperaciones: recent,
    }

    let json = JSON.stringify(data)
    // Recorta las operaciones recientes si el resumen supera el presupuesto de contexto.
    while (json.length > MAX_CONTEXT_CHARS && data.ultimasOperaciones.length > 0) {
      data.ultimasOperaciones = data.ultimasOperaciones.slice(0, Math.floor(data.ultimasOperaciones.length * 0.7))
      json = JSON.stringify(data)
    }
    return json.slice(0, MAX_CONTEXT_CHARS)
  }, [ready, filters, products, activeOperations, purchases, sales, costBasis, comparison])

  return { ready, context }
}

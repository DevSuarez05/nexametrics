import { useMemo } from 'react'
import { describeFilters, latestDate, monthlySeries, productStats, summarize, type Summary } from '@/lib/analytics'
import { monthLabelLong } from '@/lib/format'
import { describe } from '@/lib/stats'
import { useNexa } from '@/lib/store'
import type { Operation } from '@/lib/types'

const MAX_CONTEXT_CHARS = 100_000 // ≈ 25.000 tokens; el servidor acepta hasta 120.000 caracteres
const round = (value: number | null | undefined, digits = 0) =>
  value === null || value === undefined ? null : Number(value.toFixed(digits))

function compactSummary(summary: Summary) {
  return {
    ventas: round(summary.salesTotal),
    compras: round(summary.purchaseTotal),
    diferencia: round(summary.difference),
    numVentas: summary.saleCount,
    numCompras: summary.purchaseCount,
    unidadesVendidas: summary.unitsSold,
    unidadesCompradas: summary.unitsBought,
    ticketPromedioVenta: round(summary.avgSale),
    compraPromedio: round(summary.avgPurchase),
    margenEstimado: summary.margin.available ? round(summary.margin.margin) : null,
    margenEstimadoPct: round(summary.margin.marginPct, 1),
  }
}

function compactStats(values: number[]) {
  const stats = describe(values)
  return stats
    ? {
        cantidad: stats.count,
        media: round(stats.mean),
        mediana: round(stats.median),
        minimo: round(stats.min),
        maximo: round(stats.max),
        desviacionEstandar: round(stats.sdSample ?? stats.sdPopulation),
      }
    : null
}

/** Agrupa operaciones por proveedor o cliente. */
function byParty(ops: Operation[]) {
  const groups = new Map<string, { total: number; operaciones: number; unidades: number; productos: Set<string>; ultima: string }>()
  for (const op of ops) {
    const group = groups.get(op.party) ?? { total: 0, operaciones: 0, unidades: 0, productos: new Set(), ultima: '' }
    group.total += op.total
    group.operaciones += 1
    group.unidades += op.quantity
    group.productos.add(op.productName)
    if (op.date > group.ultima) group.ultima = op.date
    groups.set(op.party, group)
  }
  return [...groups.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([nombre, g]) => ({
      nombre,
      total: round(g.total),
      operaciones: g.operaciones,
      unidades: g.unidades,
      productos: [...g.productos],
      ultimaOperacion: g.ultima,
    }))
}

/** Unidades y montos por producto y mes, para preguntas como "¿qué se vendió más en marzo?". */
function byProductMonth(ops: Operation[]) {
  const rows = new Map<string, { mes: string; producto: string; unidadesVendidas: number; ventas: number; unidadesCompradas: number; compras: number }>()
  for (const op of ops) {
    const mes = op.date.slice(0, 7)
    const key = `${mes}|${op.productName}`
    const row = rows.get(key) ?? { mes, producto: op.productName, unidadesVendidas: 0, ventas: 0, unidadesCompradas: 0, compras: 0 }
    if (op.kind === 'venta') {
      row.unidadesVendidas += op.quantity
      row.ventas += op.total
    } else {
      row.unidadesCompradas += op.quantity
      row.compras += op.total
    }
    rows.set(key, row)
  }
  return [...rows.values()].sort((a, b) => a.mes.localeCompare(b.mes) || b.ventas - a.ventas)
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
  ...(op.notes ? { notas: op.notes } : {}),
})

/** Todo lo que Nexa sabe del negocio: datos filtrados, agregados y la lista de operaciones, en JSON. */
export function useNexaContext(): { ready: boolean; context: string } {
  const { ready, filters, products, activeOperations, activeSales, activePurchases, purchases, sales, costBasis, comparison } =
    useNexa()

  const context = useMemo(() => {
    if (!ready) return ''
    const productName = products.find((product) => product.id === filters.productId)?.name

    const months = monthlySeries(activeOperations).map((point) => ({
      mes: monthLabelLong(point.key),
      clave: point.key,
      ...compactSummary(summarize(activeOperations.filter((op) => op.date.startsWith(point.key)), costBasis)),
    }))

    const productos = productStats(activeOperations, costBasis).map((stat) => ({
      producto: stat.name,
      categoria: products.find((product) => product.id === stat.productId)?.category ?? null,
      ventas: round(stat.salesTotal),
      unidadesVendidas: stat.unitsSold,
      operacionesVenta: stat.opsVentas,
      compras: round(stat.purchaseTotal),
      unidadesCompradas: stat.unitsBought,
      operacionesCompra: stat.opsCompras,
      inventarioNeto: stat.unitsBought - stat.unitsSold,
      costoPromedio: round(stat.avgCost),
      precioPromedio: round(stat.avgPrice),
      margenEstimado: round(stat.estMargin),
      margenPct: round(stat.marginPct, 1),
    }))

    const all = [...purchases, ...sales].sort((a, b) => b.date.localeCompare(a.date) || b.code.localeCompare(a.code))

    const data = {
      moneda: 'COP',
      fechaReferencia: latestDate(activeOperations),
      filtrosActivos: describeFilters(filters, productName),
      notas: [
        'Totales, rankings y estadísticas excluyen operaciones anuladas; la lista de operaciones sí las incluye con su estado.',
        'margen = (precio de venta - costo promedio de compra del producto) x unidades; es una estimación.',
        'inventarioNeto = unidades compradas - unidades vendidas (aproximación del stock).',
      ],
      catalogo: products.map((product) => ({ producto: product.name, categoria: product.category })),
      totales: {
        ...compactSummary(summarize(activeOperations, costBasis)),
        operacionesAnuladas: all.length - activeOperations.length,
      },
      estadisticasVentas: compactStats(activeSales.map((op) => op.total)),
      estadisticasCompras: compactStats(activePurchases.map((op) => op.total)),
      comparacion: comparison
        ? {
            descripcion: comparison.label,
            periodoActual: { ...comparison.periods.current, ...compactSummary(summarize(comparison.current, costBasis)) },
            periodoAnterior: { ...comparison.periods.previous, ...compactSummary(summarize(comparison.previous, costBasis)) },
          }
        : null,
      porMes: months,
      productos,
      productosPorMes: byProductMonth(activeOperations),
      proveedores: byParty(activePurchases),
      clientes: byParty(activeSales),
      operaciones: all.map(compactOperation),
      operacionesOmitidas: 0,
    }

    let json = JSON.stringify(data)
    // Si el negocio crece mucho, se recortan primero las operaciones más antiguas (los agregados siguen completos).
    while (json.length > MAX_CONTEXT_CHARS && data.operaciones.length > 0) {
      const keep = Math.floor(data.operaciones.length * 0.8)
      data.operacionesOmitidas += data.operaciones.length - keep
      data.operaciones = data.operaciones.slice(0, keep)
      json = JSON.stringify(data)
    }
    if (json.length > MAX_CONTEXT_CHARS) {
      data.productosPorMes = data.productosPorMes.slice(-200)
      json = JSON.stringify(data).slice(0, MAX_CONTEXT_CHARS)
    }
    return json
  }, [ready, filters, products, activeOperations, activeSales, activePurchases, purchases, sales, costBasis, comparison])

  return { ready, context }
}

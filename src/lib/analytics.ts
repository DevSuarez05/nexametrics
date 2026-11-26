import { MONTHS_LONG, formatDate, monthLabel } from './format'
import type { Database, Filters, Operation, OperationKind } from './types'

export const EMPTY_FILTERS: Filters = {
  from: '',
  to: '',
  month: 'all',
  year: 'all',
  productId: 'all',
  kind: 'all',
  supplier: 'all',
  client: 'all',
}

export function toOperations(db: Database): Operation[] {
  const names = new Map(db.products.map((product) => [product.id, product.name]))
  const build = (
    kind: OperationKind,
    record: Database['purchases'][number] | Database['sales'][number],
    party: string,
  ): Operation => ({
    kind,
    code: record.code,
    productId: record.productId,
    productName: names.get(record.productId) ?? 'Producto no encontrado',
    party,
    date: record.date,
    quantity: record.quantity,
    unitPrice: record.unitPrice,
    total: record.quantity * record.unitPrice,
    notes: record.notes,
    status: record.status,
  })
  return [
    ...db.purchases.map((purchase) => build('compra', purchase, purchase.supplier)),
    ...db.sales.map((sale) => build('venta', sale, sale.client)),
  ]
}

export const isActive = (op: Operation) => op.status !== 'Anulada'

export function matchesFilters(op: Operation, filters: Filters, options: { ignoreDates?: boolean } = {}): boolean {
  if (filters.kind !== 'all' && op.kind !== filters.kind) return false
  if (filters.productId !== 'all' && op.productId !== filters.productId) return false
  if (op.kind === 'compra' && filters.supplier !== 'all' && op.party !== filters.supplier) return false
  if (op.kind === 'venta' && filters.client !== 'all' && op.party !== filters.client) return false
  if (options.ignoreDates) return true
  if (filters.from && op.date < filters.from) return false
  if (filters.to && op.date > filters.to) return false
  if (filters.month !== 'all' && op.date.slice(5, 7) !== filters.month) return false
  if (filters.year !== 'all' && op.date.slice(0, 4) !== filters.year) return false
  return true
}

export function countActiveFilters(filters: Filters): number {
  return (Object.keys(EMPTY_FILTERS) as (keyof Filters)[]).filter((key) => filters[key] !== EMPTY_FILTERS[key]).length
}

export function describeFilters(filters: Filters, productName?: string): string {
  const parts: string[] = []
  if (filters.from) parts.push(`desde ${formatDate(filters.from)}`)
  if (filters.to) parts.push(`hasta ${formatDate(filters.to)}`)
  if (filters.month !== 'all') parts.push(`mes: ${MONTHS_LONG[Number(filters.month) - 1]}`)
  if (filters.year !== 'all') parts.push(`año: ${filters.year}`)
  if (filters.productId !== 'all') parts.push(`producto: ${productName ?? filters.productId}`)
  if (filters.kind !== 'all') parts.push(`tipo: ${filters.kind === 'compra' ? 'compras' : 'ventas'}`)
  if (filters.supplier !== 'all') parts.push(`proveedor: ${filters.supplier}`)
  if (filters.client !== 'all') parts.push(`cliente: ${filters.client}`)
  return parts.length > 0 ? parts.join(' · ') : 'Todos los registros'
}

const DAY = 86_400_000
const toUTC = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)))

export function addDays(iso: string, days: number): string {
  return new Date(toUTC(iso) + days * DAY).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUTC(to) - toUTC(from)) / DAY)
}

export function isValidDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const time = toUTC(iso)
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === iso
}

export interface PeriodRange {
  from: string
  to: string
}

export interface ComparisonPeriods {
  current: PeriodRange
  previous: PeriodRange
  label: string
}

const pad = (value: number) => String(value).padStart(2, '0')
const monthRange = (year: number, month: number): PeriodRange => ({
  from: `${year}-${pad(month)}-01`,
  to: `${year}-${pad(month)}-${pad(new Date(Date.UTC(year, month, 0)).getUTCDate())}`,
})

export function resolveComparison(filters: Filters, latestDate: string | null): ComparisonPeriods | null {
  const { from, to, month, year } = filters
  if (from && to) {
    if (from > to) return null
    const length = daysBetween(from, to) + 1
    return {
      current: { from, to },
      previous: { from: addDays(from, -length), to: addDays(from, -1) },
      label: 'vs. periodo anterior equivalente',
    }
  }
  if (from || to) return null
  if (year !== 'all' && month !== 'all') {
    const y = Number(year)
    const m = Number(month)
    return {
      current: monthRange(y, m),
      previous: m === 1 ? monthRange(y - 1, 12) : monthRange(y, m - 1),
      label: 'vs. mes anterior',
    }
  }
  if (year !== 'all') {
    const end = latestDate && latestDate.startsWith(year) ? latestDate : `${year}-12-31`
    const previousYear = Number(year) - 1
    return {
      current: { from: `${year}-01-01`, to: end },
      previous: { from: `${previousYear}-01-01`, to: `${previousYear}${end.slice(4)}` },
      label: 'vs. mismo periodo del año anterior',
    }
  }
  if (month !== 'all' || !latestDate) return null
  return {
    current: { from: addDays(latestDate, -89), to: latestDate },
    previous: { from: addDays(latestDate, -179), to: addDays(latestDate, -90) },
    label: 'últimos 90 días vs. 90 previos',
  }
}

export const inRange = (range: PeriodRange) => (op: Operation) => op.date >= range.from && op.date <= range.to

export type CostBasis = Map<string, number>

export function buildCostBasis(activePurchases: Operation[]): CostBasis {
  const totals = new Map<string, { units: number; cost: number }>()
  for (const purchase of activePurchases) {
    const entry = totals.get(purchase.productId) ?? { units: 0, cost: 0 }
    entry.units += purchase.quantity
    entry.cost += purchase.total
    totals.set(purchase.productId, entry)
  }
  const basis: CostBasis = new Map()
  for (const [productId, entry] of totals) {
    if (entry.units > 0) basis.set(productId, entry.cost / entry.units)
  }
  return basis
}

export function saleMargin(sale: Operation, basis: CostBasis): number | null {
  const cost = basis.get(sale.productId)
  return cost === undefined ? null : (sale.unitPrice - cost) * sale.quantity
}

export interface MarginEstimate {
  margin: number
  revenue: number
  marginPct: number | null
  coveredUnits: number
  totalUnits: number
  available: boolean
  partial: boolean
}

export function estimateMargin(sales: Operation[], basis: CostBasis): MarginEstimate {
  let margin = 0
  let revenue = 0
  let coveredUnits = 0
  let totalUnits = 0
  for (const sale of sales) {
    totalUnits += sale.quantity
    const value = saleMargin(sale, basis)
    if (value === null) continue
    margin += value
    revenue += sale.total
    coveredUnits += sale.quantity
  }
  return {
    margin,
    revenue,
    marginPct: revenue > 0 ? (margin / revenue) * 100 : null,
    coveredUnits,
    totalUnits,
    available: coveredUnits > 0,
    partial: coveredUnits > 0 && coveredUnits < totalUnits,
  }
}

export interface Summary {
  purchaseTotal: number
  salesTotal: number
  purchaseCount: number
  saleCount: number
  opsCount: number
  avgPurchase: number | null
  avgSale: number | null
  unitsBought: number
  unitsSold: number
  difference: number
  margin: MarginEstimate
}

export function summarize(ops: Operation[], basis: CostBasis): Summary {
  const purchases = ops.filter((op) => op.kind === 'compra')
  const sales = ops.filter((op) => op.kind === 'venta')
  const purchaseTotal = purchases.reduce((acc, op) => acc + op.total, 0)
  const salesTotal = sales.reduce((acc, op) => acc + op.total, 0)
  return {
    purchaseTotal,
    salesTotal,
    purchaseCount: purchases.length,
    saleCount: sales.length,
    opsCount: ops.length,
    avgPurchase: purchases.length > 0 ? purchaseTotal / purchases.length : null,
    avgSale: sales.length > 0 ? salesTotal / sales.length : null,
    unitsBought: purchases.reduce((acc, op) => acc + op.quantity, 0),
    unitsSold: sales.reduce((acc, op) => acc + op.quantity, 0),
    difference: salesTotal - purchaseTotal,
    margin: estimateMargin(sales, basis),
  }
}

export interface MonthPoint {
  key: string
  label: string
  compras: number
  ventas: number
  diferencia: number
  opsCompras: number
  opsVentas: number
  unidadesCompradas: number
  unidadesVendidas: number
}

const emptyPoint = (key: string, label: string): MonthPoint => ({
  key,
  label,
  compras: 0,
  ventas: 0,
  diferencia: 0,
  opsCompras: 0,
  opsVentas: 0,
  unidadesCompradas: 0,
  unidadesVendidas: 0,
})

function accumulate(point: MonthPoint, op: Operation) {
  if (op.kind === 'compra') {
    point.compras += op.total
    point.opsCompras += 1
    point.unidadesCompradas += op.quantity
  } else {
    point.ventas += op.total
    point.opsVentas += 1
    point.unidadesVendidas += op.quantity
  }
  point.diferencia = point.ventas - point.compras
}

export function monthlySeries(ops: Operation[]): MonthPoint[] {
  if (ops.length === 0) return []
  const keys = ops.map((op) => op.date.slice(0, 7)).sort()
  const points = new Map<string, MonthPoint>()
  let year = Number(keys[0]!.slice(0, 4))
  let month = Number(keys[0]!.slice(5, 7))
  const last = keys[keys.length - 1]!
  for (let guard = 0; guard < 600; guard++) {
    const key = `${year}-${pad(month)}`
    points.set(key, emptyPoint(key, monthLabel(key)))
    if (key >= last) break
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  for (const op of ops) {
    const point = points.get(op.date.slice(0, 7))
    if (point) accumulate(point, op)
  }
  return [...points.values()]
}

export function yearlySeries(ops: Operation[]): MonthPoint[] {
  const points = new Map<string, MonthPoint>()
  for (const op of ops) {
    const key = op.date.slice(0, 4)
    const point = points.get(key) ?? emptyPoint(key, key)
    accumulate(point, op)
    points.set(key, point)
  }
  return [...points.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export interface ProductStat {
  productId: string
  name: string
  opsCompras: number
  opsVentas: number
  unitsBought: number
  unitsSold: number
  purchaseTotal: number
  salesTotal: number
  avgCost: number | null
  avgPrice: number | null
  unitDiff: number | null
  marginPct: number | null
  estMargin: number | null
  movement: number
}

export function productStats(ops: Operation[], basis: CostBasis): ProductStat[] {
  const stats = new Map<string, ProductStat>()
  for (const op of ops) {
    const stat =
      stats.get(op.productId) ??
      ({
        productId: op.productId,
        name: op.productName,
        opsCompras: 0,
        opsVentas: 0,
        unitsBought: 0,
        unitsSold: 0,
        purchaseTotal: 0,
        salesTotal: 0,
        avgCost: null,
        avgPrice: null,
        unitDiff: null,
        marginPct: null,
        estMargin: null,
        movement: 0,
      } satisfies ProductStat)
    if (op.kind === 'compra') {
      stat.opsCompras += 1
      stat.unitsBought += op.quantity
      stat.purchaseTotal += op.total
    } else {
      stat.opsVentas += 1
      stat.unitsSold += op.quantity
      stat.salesTotal += op.total
      const margin = saleMargin(op, basis)
      if (margin !== null) stat.estMargin = (stat.estMargin ?? 0) + margin
    }
    stats.set(op.productId, stat)
  }
  for (const stat of stats.values()) {
    stat.avgCost = stat.unitsBought > 0 ? stat.purchaseTotal / stat.unitsBought : null
    stat.avgPrice = stat.unitsSold > 0 ? stat.salesTotal / stat.unitsSold : null
    stat.unitDiff = stat.avgCost !== null && stat.avgPrice !== null ? stat.avgPrice - stat.avgCost : null
    stat.marginPct = stat.unitDiff !== null && stat.avgPrice ? (stat.unitDiff / stat.avgPrice) * 100 : null
    stat.movement = stat.unitsBought + stat.unitsSold
  }
  return [...stats.values()].sort((a, b) => b.movement - a.movement)
}

export function topByTotal(ops: Operation[], limit: number): Operation[] {
  return [...ops].sort((a, b) => b.total - a.total).slice(0, limit)
}

export function extremes(ops: Operation[]): { max: Operation; min: Operation } | null {
  if (ops.length === 0) return null
  const sorted = [...ops].sort((a, b) => a.total - b.total)
  return { min: sorted[0]!, max: sorted[sorted.length - 1]! }
}

export function latestDate(ops: Operation[]): string | null {
  return ops.reduce<string | null>((latest, op) => (latest === null || op.date > latest ? op.date : latest), null)
}

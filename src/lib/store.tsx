'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import useSWR from 'swr'
import {
  EMPTY_FILTERS,
  buildCostBasis,
  inRange,
  isActive,
  latestDate,
  matchesFilters,
  resolveComparison,
  toOperations,
  type ComparisonPeriods,
  type CostBasis,
} from './analytics'
import { createSeedDatabase } from './seed'
import type { Database, Filters, Operation, OperationInput, OperationKind, Product, Purchase, Sale } from './types'

/*
 * PERSISTENCIA LOCAL (SIMULACIÓN)
 * localStorage hace las veces de base de datos de un solo navegador y un solo usuario.
 * En producción, esta capa se reemplaza por un backend real:
 *  - API de compras y ventas: readDatabase/writeDatabase pasarían a ser llamadas REST
 *    (GET/POST/PUT/DELETE /api/compras y /api/ventas) con validación en el servidor.
 *  - Base de datos: las colecciones products, purchases y sales ya están separadas para
 *    migrarlas a tablas relacionales (PostgreSQL) con llaves foráneas a productos.
 *  - Autenticación y administración de usuarios: hoy no existe sesión ni permisos.
 *  - Almacenamiento centralizado: los datos no se comparten entre equipos ni usuarios.
 *  - Auditoría: no se registra quién crea, modifica o elimina cada operación.
 *  - Integración con el inventario existente: los productos son un catálogo local.
 */
const STORAGE_KEY = 'nexametrics:db:v1'

const EMPTY_DATABASE: Database = { version: 1, products: [], purchases: [], sales: [] }

function isDatabase(value: unknown): value is Database {
  if (!value || typeof value !== 'object') return false
  const db = value as Partial<Database>
  return db.version === 1 && Array.isArray(db.products) && Array.isArray(db.purchases) && Array.isArray(db.sales)
}

function writeDatabase(db: Database) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // Almacenamiento no disponible (modo privado o cuota llena): los datos viven solo en memoria.
  }
}

function readDatabase(): Database {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isDatabase(parsed)) return parsed
    }
  } catch {
    // Datos corruptos o almacenamiento bloqueado: se restauran los datos de ejemplo.
  }
  const seed = createSeedDatabase()
  writeDatabase(seed)
  return seed
}

export type SaveResult = { ok: true; code: string } | { ok: false; message: string }

interface ComparisonData {
  periods: ComparisonPeriods
  label: string
  current: Operation[]
  previous: Operation[]
}

interface NexaContextValue {
  ready: boolean
  products: Product[]
  suppliers: string[]
  clients: string[]
  years: string[]
  allOperations: Operation[]
  baseOperations: Operation[]
  purchases: Operation[]
  sales: Operation[]
  activePurchases: Operation[]
  activeSales: Operation[]
  activeOperations: Operation[]
  costBasis: CostBasis
  comparison: ComparisonData | null
  filters: Filters
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void
  resetFilters: () => void
  nextCode: (kind: OperationKind) => string
  saveOperation: (
    kind: OperationKind,
    input: OperationInput,
    options?: { originalCode?: string; newProductName?: string },
  ) => SaveResult
  deleteOperation: (kind: OperationKind, code: string) => void
  resetData: () => void
}

const NexaContext = createContext<NexaContextValue | null>(null)

const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, 'es'))

export function NexaProvider({ children }: { children: ReactNode }) {
  const { data, mutate } = useSWR<Database>(STORAGE_KEY, readDatabase, {
    revalidateOnFocus: true,
    revalidateOnReconnect: false,
  })
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const db = data ?? EMPTY_DATABASE

  const commit = useCallback(
    (next: Database) => {
      writeDatabase(next)
      void mutate(next, { revalidate: false })
    },
    [mutate],
  )

  const setFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }, [])
  const resetFilters = useCallback(() => setFilters(EMPTY_FILTERS), [])

  const nextCode = useCallback(
    (kind: OperationKind) => {
      const prefix = kind === 'compra' ? 'COM' : 'VEN'
      const records: (Purchase | Sale)[] = kind === 'compra' ? db.purchases : db.sales
      const highest = records.reduce((max, record) => {
        const match = /(\d+)$/.exec(record.code)
        return match ? Math.max(max, Number(match[1])) : max
      }, 0)
      return `${prefix}-${String(highest + 1).padStart(3, '0')}`
    },
    [db],
  )

  const saveOperation = useCallback<NexaContextValue['saveOperation']>(
    (kind, input, options = {}) => {
      const code = input.code.trim().toUpperCase()
      const clashes = (records: (Purchase | Sale)[], sameKind: boolean) =>
        records.some(
          (record) => record.code.toUpperCase() === code && !(sameKind && record.code === options.originalCode),
        )
      if (clashes(db.purchases, kind === 'compra') || clashes(db.sales, kind === 'venta')) {
        return { ok: false, message: `El código ${code} ya está registrado en otra operación.` }
      }

      let products = db.products
      let productId = input.productId
      const newName = options.newProductName?.trim()
      if (newName) {
        const existing = products.find((product) => product.name.toLowerCase() === newName.toLowerCase())
        if (existing) {
          productId = existing.id
        } else {
          const highest = products.reduce((max, product) => {
            const match = /(\d+)$/.exec(product.id)
            return match ? Math.max(max, Number(match[1])) : max
          }, 0)
          productId = `PRD-${String(highest + 1).padStart(3, '0')}`
          products = [...products, { id: productId, name: newName, category: 'Sin categoría' }]
        }
      }

      const base = {
        code,
        productId,
        date: input.date,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        notes: input.notes.trim(),
        status: input.status,
      }
      const upsert = <T extends Purchase | Sale>(records: T[], record: T) =>
        options.originalCode
          ? records.map((item) => (item.code === options.originalCode ? record : item))
          : [...records, record]

      commit(
        kind === 'compra'
          ? { ...db, products, purchases: upsert(db.purchases, { ...base, supplier: input.party.trim() }) }
          : { ...db, products, sales: upsert(db.sales, { ...base, client: input.party.trim() }) },
      )
      return { ok: true, code }
    },
    [commit, db],
  )

  const deleteOperation = useCallback(
    (kind: OperationKind, code: string) => {
      commit(
        kind === 'compra'
          ? { ...db, purchases: db.purchases.filter((record) => record.code !== code) }
          : { ...db, sales: db.sales.filter((record) => record.code !== code) },
      )
    },
    [commit, db],
  )

  const resetData = useCallback(() => {
    commit(createSeedDatabase())
    setFilters(EMPTY_FILTERS)
  }, [commit])

  const derived = useMemo(() => {
    const allOperations = toOperations(db)
    const costBasis = buildCostBasis(allOperations.filter((op) => op.kind === 'compra' && isActive(op)))
    const filtered = allOperations.filter((op) => matchesFilters(op, filters))
    const purchases = filtered.filter((op) => op.kind === 'compra')
    const sales = filtered.filter((op) => op.kind === 'venta')
    const activePurchases = purchases.filter(isActive)
    const activeSales = sales.filter(isActive)
    const baseOperations = allOperations.filter(
      (op) => isActive(op) && matchesFilters(op, filters, { ignoreDates: true }),
    )
    const periods = resolveComparison(filters, latestDate(baseOperations))
    const comparison: ComparisonData | null = periods
      ? {
          periods,
          label: periods.label,
          current: baseOperations.filter(inRange(periods.current)),
          previous: baseOperations.filter(inRange(periods.previous)),
        }
      : null
    return {
      allOperations,
      baseOperations,
      purchases,
      sales,
      activePurchases,
      activeSales,
      activeOperations: [...activePurchases, ...activeSales],
      costBasis,
      comparison,
      suppliers: unique(db.purchases.map((purchase) => purchase.supplier)),
      clients: unique(db.sales.map((sale) => sale.client)),
      years: unique(allOperations.map((op) => op.date.slice(0, 4))),
    }
  }, [db, filters])

  const value = useMemo<NexaContextValue>(
    () => ({
      ready: data !== undefined,
      products: db.products,
      ...derived,
      filters,
      setFilter,
      resetFilters,
      nextCode,
      saveOperation,
      deleteOperation,
      resetData,
    }),
    [data, db.products, derived, filters, setFilter, resetFilters, nextCode, saveOperation, deleteOperation, resetData],
  )

  return <NexaContext.Provider value={value}>{children}</NexaContext.Provider>
}

export function useNexa(): NexaContextValue {
  const context = useContext(NexaContext)
  if (!context) throw new Error('useNexa debe usarse dentro de NexaProvider')
  return context
}

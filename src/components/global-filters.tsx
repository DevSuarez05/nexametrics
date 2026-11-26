'use client'

import { useMemo, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { OptionSelect, type Option } from '@/components/option-select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { countActiveFilters } from '@/lib/analytics'
import { MONTHS_LONG } from '@/lib/format'
import { useNexa } from '@/lib/store'
import type { Filters } from '@/lib/types'
import { cn } from '@/lib/utils'

const MONTH_OPTIONS: Option[] = [
  { value: 'all', label: 'Todos los meses' },
  ...MONTHS_LONG.map((label, index) => ({ value: String(index + 1).padStart(2, '0'), label })),
]

const KIND_OPTIONS: Option[] = [
  { value: 'all', label: 'Compras y ventas' },
  { value: 'compra', label: 'Solo compras' },
  { value: 'venta', label: 'Solo ventas' },
]

const withAll = (label: string, values: Option[]): Option[] => [{ value: 'all', label }, ...values]

export function GlobalFilters() {
  const { filters, setFilter, resetFilters, products, suppliers, clients, years } = useNexa()
  const [open, setOpen] = useState(false)
  const active = countActiveFilters(filters)
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to)

  const options = useMemo(
    () => ({
      years: withAll(
        'Todos los años',
        years.map((year) => ({ value: year, label: year })),
      ),
      products: withAll(
        'Todos los productos',
        products.map((product) => ({ value: product.id, label: product.name })),
      ),
      suppliers: withAll(
        'Todos los proveedores',
        suppliers.map((name) => ({ value: name, label: name })),
      ),
      clients: withAll(
        'Todos los clientes',
        clients.map((name) => ({ value: name, label: name })),
      ),
    }),
    [years, products, suppliers, clients],
  )

  return (
    <section
      aria-label="Filtros globales"
      className="@container/filters border-b bg-card px-4 py-3 lg:px-6 print:hidden"
    >
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="@3xl/filters:hidden"
          aria-expanded={open}
          aria-controls="global-filters"
          onClick={() => setOpen((value) => !value)}
        >
          <SlidersHorizontal data-icon="inline-start" aria-hidden="true" />
          Filtros
        </Button>
        <span className="hidden text-xs font-medium tracking-wide text-muted-foreground uppercase @3xl/filters:inline">
          Filtros globales
        </span>
        {active > 0 && (
          <Badge variant="secondary">
            {active} {active === 1 ? 'activo' : 'activos'}
          </Badge>
        )}
        <Button variant="ghost" size="sm" className="ml-auto" disabled={active === 0} onClick={resetFilters}>
          <X data-icon="inline-start" aria-hidden="true" />
          Limpiar
        </Button>
      </div>

      <div
        id="global-filters"
        className={cn(
          'mt-3 grid-cols-2 gap-x-3 gap-y-3 @3xl/filters:grid @3xl/filters:grid-cols-4 @6xl/filters:grid-cols-8',
          open ? 'grid' : 'hidden',
        )}
      >
        <FilterField id="filter-from" label="Fecha inicial">
          <Input
            id="filter-from"
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            aria-invalid={invalidRange || undefined}
            onChange={(event) => setFilter('from', event.target.value)}
          />
        </FilterField>
        <FilterField id="filter-to" label="Fecha final">
          <Input
            id="filter-to"
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            aria-invalid={invalidRange || undefined}
            onChange={(event) => setFilter('to', event.target.value)}
          />
        </FilterField>
        <FilterField id="filter-month" label="Mes">
          <OptionSelect
            id="filter-month"
            value={filters.month}
            options={MONTH_OPTIONS}
            onChange={(value) => setFilter('month', value || 'all')}
          />
        </FilterField>
        <FilterField id="filter-year" label="Año">
          <OptionSelect
            id="filter-year"
            value={filters.year}
            options={options.years}
            onChange={(value) => setFilter('year', value || 'all')}
          />
        </FilterField>
        <FilterField id="filter-product" label="Producto">
          <OptionSelect
            id="filter-product"
            value={filters.productId}
            options={options.products}
            onChange={(value) => setFilter('productId', value || 'all')}
          />
        </FilterField>
        <FilterField id="filter-kind" label="Tipo de operación">
          <OptionSelect
            id="filter-kind"
            value={filters.kind}
            options={KIND_OPTIONS}
            onChange={(value) => setFilter('kind', (value || 'all') as Filters['kind'])}
          />
        </FilterField>
        <FilterField id="filter-supplier" label="Proveedor">
          <OptionSelect
            id="filter-supplier"
            value={filters.supplier}
            options={options.suppliers}
            onChange={(value) => setFilter('supplier', value || 'all')}
          />
        </FilterField>
        <FilterField id="filter-client" label="Cliente">
          <OptionSelect
            id="filter-client"
            value={filters.client}
            options={options.clients}
            onChange={(value) => setFilter('client', value || 'all')}
          />
        </FilterField>
      </div>

      {invalidRange && (
        <p role="alert" className="mt-2 text-xs font-medium text-destructive">
          La fecha inicial es posterior a la fecha final: ningún registro cumple ese rango.
        </p>
      )}
    </section>
  )
}

function FilterField({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

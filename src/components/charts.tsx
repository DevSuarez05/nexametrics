'use client'

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'

export interface SeriesDef {
  key: string
  label: string
  color: string
}

export const PURCHASE_SERIES: SeriesDef = { key: 'compras', label: 'Compras', color: 'var(--chart-1)' }
export const SALES_SERIES: SeriesDef = { key: 'ventas', label: 'Ventas', color: 'var(--chart-2)' }

type Datum = Record<string, string | number | null>

interface ChartProps {
  data: Datum[]
  categoryKey: string
  series: SeriesDef[]
  format: (value: number) => string
  tickFormat?: (value: number) => string
  className?: string
  label: string
}

const toConfig = (series: SeriesDef[]): ChartConfig =>
  Object.fromEntries(series.map((item) => [item.key, { label: item.label, color: item.color }]))

function tooltip(series: SeriesDef[], format: (value: number) => string) {
  const labels = new Map(series.map((item) => [item.key, item]))
  return (
    <ChartTooltipContent
      formatter={(value, name) => {
        const item = labels.get(String(name))
        return (
          <div className="flex w-full items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2.5 rounded-[2px]" style={{ background: item?.color }} aria-hidden="true" />
              {item?.label ?? String(name)}
            </span>
            <span className="font-mono font-medium tabular-nums">{format(Number(value))}</span>
          </div>
        )
      }}
    />
  )
}

export function GroupedBars({
  data,
  categoryKey,
  series,
  format,
  tickFormat = format,
  className,
  label,
  horizontal = false,
}: ChartProps & { horizontal?: boolean }) {
  return (
    <ChartContainer
      config={toConfig(series)}
      className={cn('aspect-auto h-72 w-full', className)}
      role="img"
      aria-label={label}
    >
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={tickFormat} />
            <YAxis
              type="category"
              dataKey={categoryKey}
              tickLine={false}
              axisLine={false}
              width={132}
              tick={{ fontSize: 11 }}
            />
          </>
        ) : (
          <>
            <XAxis dataKey={categoryKey} tickLine={false} axisLine={false} tickMargin={8} minTickGap={12} />
            <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={tickFormat} />
          </>
        )}
        <ChartTooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={tooltip(series, format)} />
        <ChartLegend content={<ChartLegendContent />} />
        {series.map((item) => (
          <Bar key={item.key} dataKey={item.key} fill={`var(--color-${item.key})`} radius={3} maxBarSize={28} />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

export function TrendLines({ data, categoryKey, series, format, tickFormat = format, className, label }: ChartProps) {
  return (
    <ChartContainer
      config={toConfig(series)}
      className={cn('aspect-auto h-72 w-full', className)}
      role="img"
      aria-label={label}
    >
      <LineChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey={categoryKey} tickLine={false} axisLine={false} tickMargin={8} minTickGap={12} />
        <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={tickFormat} />
        <ChartTooltip content={tooltip(series, format)} />
        <ChartLegend content={<ChartLegendContent />} />
        {series.map((item) => (
          <Line
            key={item.key}
            type="monotone"
            dataKey={item.key}
            stroke={`var(--color-${item.key})`}
            strokeWidth={2.25}
            dot={{ r: 2.5 }}
            activeDot={{ r: 4.5 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}

export interface PieSlice {
  name: string
  value: number
}

const PIE_COLORS: string[] = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

export function DistributionPie({
  data,
  format,
  label,
  className,
}: {
  data: PieSlice[]
  format: (value: number) => string
  label: string
  className?: string
}) {
  const total = data.reduce((acc, d) => acc + d.value, 0)
  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [d.name, { label: d.name, color: PIE_COLORS[i % PIE_COLORS.length]! }]),
  )
  return (
    <div className={cn('pie-animate flex flex-col items-center gap-4 @2xl/main:flex-row', className)}>
      <ChartContainer config={config} className="aspect-square h-60 w-60 shrink-0" role="img" aria-label={label}>
        <PieChart>
          <ChartTooltip
            content={<ChartTooltipContent hideLabel formatter={(value, name) => `${String(name)}: ${format(Number(value))}`} />}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={100}
            paddingAngle={2}
            strokeWidth={2}
            animationDuration={900}
          >
            {data.map((d, i) => (
              <Cell key={d.name} fill={PIE_COLORS[i % PIE_COLORS.length]!} stroke="var(--card)" />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="flex w-full flex-col gap-2 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: PIE_COLORS[i % PIE_COLORS.length]! }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{d.name}</span>
            <span className="tabular-nums text-muted-foreground">{total ? ((d.value / total) * 100).toFixed(1) : '0'}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

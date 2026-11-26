const currency = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})
const compact = new Intl.NumberFormat('es-CO', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const integer = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

export const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export const MONTHS_LONG = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export function formatCOP(value: number): string {
  return currency.format(Math.round(value))
}

export function formatCompact(value: number): string {
  return `$${compact.format(value)}`
}

export function formatNumber(value: number): string {
  return integer.format(value)
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toLocaleString('es-CO', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`
}

export function formatSignedPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${formatPercent(value)}`
}

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  const name = MONTHS_SHORT[Number(month) - 1]
  return name ? `${day} ${name} ${year}` : iso
}

export function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  return `${MONTHS_SHORT[Number(month) - 1]} ${(year ?? '').slice(2)}`
}

export function monthLabelLong(key: string): string {
  const [year, month] = key.split('-')
  return `${MONTHS_LONG[Number(month) - 1]} ${year}`
}

export function shortName(name: string): string {
  return name.split(' ').slice(0, 2).join(' ')
}

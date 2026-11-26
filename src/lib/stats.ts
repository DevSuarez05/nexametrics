export interface Descriptive {
  count: number
  total: number
  mean: number
  median: number
  min: number
  max: number
  sdPopulation: number
  sdSample: number | null
}

export function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0)
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

export function describe(values: number[]): Descriptive | null {
  const count = values.length
  if (count === 0) return null
  const total = sum(values)
  const mean = total / count
  const squares = values.reduce((acc, value) => acc + (value - mean) ** 2, 0)
  return {
    count,
    total,
    mean,
    median: median(values),
    min: Math.min(...values),
    max: Math.max(...values),
    sdPopulation: Math.sqrt(squares / count),
    sdSample: count > 1 ? Math.sqrt(squares / (count - 1)) : null,
  }
}

export function pctChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

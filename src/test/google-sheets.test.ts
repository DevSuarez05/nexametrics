import { buildCostBasis, EMPTY_FILTERS, isActive, toOperations } from '@/lib/analytics'
import { buildWorkbook } from '@/lib/google-sheets'
import { createSeedDatabase } from '@/lib/seed'

describe('buildWorkbook', () => {
  const db = createSeedDatabase()
  const operations = toOperations(db)
  const activeOperations = operations.filter(isActive)
  const costBasis = buildCostBasis(activeOperations.filter((op) => op.kind === 'compra'))
  const workbook = buildWorkbook({
    operations,
    activeOperations,
    costBasis,
    filters: EMPTY_FILTERS,
    products: db.products,
    generatedAt: new Date('2026-11-26T12:00:00Z'),
  })
  const sheet = (title: string) => workbook.sheets.find((s) => s.title === title)!

  it('crea las cuatro pestañas con encabezado', () => {
    expect(workbook.title).toBe('NexaMetrics · Reporte 2026-11-26')
    expect(workbook.sheets.map((s) => s.title)).toEqual(['Resumen', 'Por mes', 'Por producto', 'Operaciones'])
  })

  it('incluye todas las operaciones y totales coherentes', () => {
    expect(sheet('Operaciones').rows).toHaveLength(operations.length + 1)
    const ventas = sheet('Resumen').rows.find((r) => r[0] === 'Total ventas (COP)')![1]
    const porMes = sheet('Por mes').rows.slice(1).reduce((acc, r) => acc + (r[2] as number), 0)
    expect(ventas).toBe(porMes)
  })
})

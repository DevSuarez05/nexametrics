import { describeFilters, monthlySeries, productStats, summarize, type CostBasis } from './analytics'
import { monthLabelLong } from './format'
import type { Filters, Operation, Product } from './types'

/*
 * Conector de Google Sheets (solo navegador).
 * - Inicio de sesión con Google Identity Services (modelo de token): no hay secretos en el servidor.
 * - Permiso drive.file: la app solo puede crear y ver los archivos que ella misma crea, no el resto del Drive.
 * - Requiere VITE_GOOGLE_CLIENT_ID (ID de cliente OAuth "Aplicación web", es público) y la Google Sheets API activa.
 */

const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const GIS_SRC = 'https://accounts.google.com/gsi/client'

type Cell = string | number | null
export interface SheetData {
  title: string
  rows: Cell[][]
}
export interface Workbook {
  title: string
  sheets: SheetData[]
}

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}
interface TokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
            error_callback?: (error: { type?: string }) => void
          }) => TokenClient
        }
      }
    }
  }
}

export class GoogleSheetsError extends Error {
  constructor(
    public readonly code: 'missing_client_id' | 'cancelled' | 'api_disabled' | 'failed',
    message: string,
  ) {
    super(message)
  }
}

export const googleClientId = (): string | undefined => import.meta.env['VITE_GOOGLE_CLIENT_ID'] || undefined

let gisPromise: Promise<void> | null = null
/** Carga el script de Google una sola vez (conviene llamarla antes del clic para no perder el gesto del usuario). */
export function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve()
  gisPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      gisPromise = null
      reject(new GoogleSheetsError('failed', 'No se pudo cargar el inicio de sesión de Google. Revisa tu conexión.'))
    }
    document.head.appendChild(script)
  })
  return gisPromise
}

let cachedToken: { value: string; expiresAt: number } | null = null

async function getAccessToken(clientId: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value
  await loadGoogleIdentity()
  const oauth2 = window.google?.accounts.oauth2
  if (!oauth2) throw new GoogleSheetsError('failed', 'El inicio de sesión de Google no está disponible.')
  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response) => {
        if (!response.access_token) {
          reject(new GoogleSheetsError('cancelled', 'No se concedió el permiso para crear la hoja en tu Google Drive.'))
          return
        }
        cachedToken = { value: response.access_token, expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000 }
        resolve(response.access_token)
      },
      error_callback: () => reject(new GoogleSheetsError('cancelled', 'Se canceló el inicio de sesión con Google.')),
    })
    client.requestAccessToken()
  })
}

/** Arma las 4 pestañas del libro (función pura, sin red). */
export function buildWorkbook(input: {
  operations: Operation[]
  activeOperations: Operation[]
  costBasis: CostBasis
  filters: Filters
  products: Product[]
  generatedAt?: Date
}): Workbook {
  const { operations, activeOperations, costBasis, filters, products } = input
  const generatedAt = input.generatedAt ?? new Date()
  const productName = products.find((product) => product.id === filters.productId)?.name
  const s = summarize(activeOperations, costBasis)
  const date = generatedAt.toISOString().slice(0, 10)

  const resumen: Cell[][] = [
    ['Indicador', 'Valor'],
    ['Alcance', describeFilters(filters, productName)],
    ['Generado', date],
    ['Total compras (COP)', s.purchaseTotal],
    ['Total ventas (COP)', s.salesTotal],
    ['Diferencia ventas - compras (COP)', s.difference],
    ['Operaciones de compra', s.purchaseCount],
    ['Operaciones de venta', s.saleCount],
    ['Unidades compradas', s.unitsBought],
    ['Unidades vendidas', s.unitsSold],
    ['Ticket promedio de venta (COP)', s.avgSale === null ? null : Math.round(s.avgSale)],
    ['Margen estimado (COP)', s.margin.available ? Math.round(s.margin.margin) : null],
    ['Margen estimado (%)', s.margin.marginPct === null ? null : Number(s.margin.marginPct.toFixed(1))],
  ]

  const porMes: Cell[][] = [
    ['Mes', 'Compras (COP)', 'Ventas (COP)', 'Diferencia (COP)', 'Op. compra', 'Op. venta', 'Unid. compradas', 'Unid. vendidas'],
    ...monthlySeries(activeOperations).map((m) => [
      monthLabelLong(m.key),
      m.compras,
      m.ventas,
      m.diferencia,
      m.opsCompras,
      m.opsVentas,
      m.unidadesCompradas,
      m.unidadesVendidas,
    ]),
  ]

  const round = (value: number | null, digits = 0) => (value === null ? null : Number(value.toFixed(digits)))
  const porProducto: Cell[][] = [
    [
      'Producto',
      'Unid. compradas',
      'Compras (COP)',
      'Unid. vendidas',
      'Ventas (COP)',
      'Costo promedio',
      'Precio promedio',
      'Margen estimado (COP)',
      'Margen (%)',
    ],
    ...productStats(activeOperations, costBasis).map((p) => [
      p.name,
      p.unitsBought,
      p.purchaseTotal,
      p.unitsSold,
      p.salesTotal,
      round(p.avgCost),
      round(p.avgPrice),
      round(p.estMargin),
      round(p.marginPct, 1),
    ]),
  ]

  const operaciones: Cell[][] = [
    ['Tipo', 'Código', 'Fecha', 'Producto', 'Proveedor / cliente', 'Cantidad', 'Precio unitario', 'Total', 'Estado', 'Notas'],
    ...[...operations]
      .sort((a, b) => a.date.localeCompare(b.date) || a.code.localeCompare(b.code))
      .map((op) => [
        op.kind === 'compra' ? 'Compra' : 'Venta',
        op.code,
        op.date,
        op.productName,
        op.party,
        op.quantity,
        op.unitPrice,
        op.total,
        op.status,
        op.notes,
      ]),
  ]

  return {
    title: `NexaMetrics · Reporte ${date}`,
    sheets: [
      { title: 'Resumen', rows: resumen },
      { title: 'Por mes', rows: porMes },
      { title: 'Por producto', rows: porProducto },
      { title: 'Operaciones', rows: operaciones },
    ],
  }
}

const toCell = (value: Cell, header: boolean) => ({
  userEnteredValue:
    typeof value === 'number' ? { numberValue: value } : { stringValue: value ?? '' },
  ...(header ? { userEnteredFormat: { textFormat: { bold: true } } } : {}),
})

/** Crea la hoja en el Drive del usuario y devuelve su URL. Pide iniciar sesión con Google si hace falta. */
export async function exportToGoogleSheets(workbook: Workbook): Promise<string> {
  const clientId = googleClientId()
  if (!clientId) {
    throw new GoogleSheetsError(
      'missing_client_id',
      'Falta configurar la conexión con Google (VITE_GOOGLE_CLIENT_ID). Pídele al administrador que la agregue.',
    )
  }
  const token = await getAccessToken(clientId)
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: { title: workbook.title, locale: 'es_CO' },
      sheets: workbook.sheets.map((sheet) => ({
        properties: { title: sheet.title, gridProperties: { frozenRowCount: 1 } },
        data: [{ startRow: 0, startColumn: 0, rowData: sheet.rows.map((row, i) => ({ values: row.map((cell) => toCell(cell, i === 0)) })) }],
      })),
    }),
  })
  if (response.status === 401) cachedToken = null
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    if (response.status === 403 && /SERVICE_DISABLED|has not been used|is disabled/i.test(detail)) {
      throw new GoogleSheetsError('api_disabled', 'La Google Sheets API no está activada en el proyecto de Google Cloud.')
    }
    throw new GoogleSheetsError('failed', `Google Sheets rechazó la exportación (${response.status}). Inténtalo de nuevo.`)
  }
  const created = (await response.json()) as { spreadsheetUrl?: string; spreadsheetId?: string }
  return created.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${created.spreadsheetId}/edit`
}

export const STATUSES = ['Completada', 'Pendiente', 'Anulada'] as const
export type OperationStatus = (typeof STATUSES)[number]
export type OperationKind = 'compra' | 'venta'

export interface Product {
  id: string
  name: string
  category: string
}

interface BaseRecord {
  code: string
  productId: string
  date: string
  quantity: number
  unitPrice: number
  notes: string
  status: OperationStatus
}

export interface Purchase extends BaseRecord {
  supplier: string
}

export interface Sale extends BaseRecord {
  client: string
}

export interface Database {
  version: 1
  products: Product[]
  purchases: Purchase[]
  sales: Sale[]
}

export interface Operation extends BaseRecord {
  kind: OperationKind
  party: string
  productName: string
  total: number
}

export interface OperationInput {
  code: string
  productId: string
  party: string
  date: string
  quantity: number
  unitPrice: number
  notes: string
  status: OperationStatus
}

export interface Filters {
  from: string
  to: string
  month: string
  year: string
  productId: string
  kind: 'all' | OperationKind
  supplier: string
  client: string
}

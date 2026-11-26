import type { Database, OperationStatus, Product, Purchase, Sale } from './types'

const PRODUCTS: Product[] = [
  { id: 'PRD-001', name: 'Laptop Lenovo ThinkPad E14', category: 'Computadores' },
  { id: 'PRD-002', name: 'Monitor LG 24 pulgadas', category: 'Monitores' },
  { id: 'PRD-003', name: 'Teclado mecánico Redragon Kumara', category: 'Periféricos' },
  { id: 'PRD-004', name: 'Mouse inalámbrico Logitech M185', category: 'Periféricos' },
  { id: 'PRD-005', name: 'Impresora Epson EcoTank L3250', category: 'Impresión' },
  { id: 'PRD-006', name: 'Disco SSD Kingston 480GB', category: 'Almacenamiento' },
  { id: 'PRD-007', name: 'Router TP-Link Archer C6', category: 'Redes' },
  { id: 'PRD-008', name: 'Audífonos JBL Tune 510BT', category: 'Audio' },
]

const LAP = 'PRD-001'
const MON = 'PRD-002'
const TEC = 'PRD-003'
const MOU = 'PRD-004'
const IMP = 'PRD-005'
const SSD = 'PRD-006'
const ROU = 'PRD-007'
const AUD = 'PRD-008'

const TECNOIMPORT = 'TecnoImport S.A.S.'
const ANDINA = 'Distribuidora Andina de Tecnología'
const MAYORISTA = 'Mayorista Digital Colombia'
const COMPUPARTES = 'CompuPartes del Valle'
const GLOBAL = 'Global Hardware Ltda.'

const ALTAVISTA = 'Constructora Altavista S.A.S.'
const PUNTO = 'Papelería El Punto'
const PIXEL = 'Estudio Creativo Pixel'
const COLEGIO = 'Colegio San Rafael'
const MONTENEGRO = 'Inversiones Montenegro Ltda.'
const CLINICA = 'Clínica Santa Lucía'
const MOSTRADOR = 'Cliente de mostrador'

type Row = [date: string, productId: string, party: string, quantity: number, unitPrice: number, status: OperationStatus, notes: string]

const C: OperationStatus = 'Completada'
const P: OperationStatus = 'Pendiente'
const A: OperationStatus = 'Anulada'

const PURCHASE_ROWS: Row[] = [
  ['2025-11-04', LAP, TECNOIMPORT, 10, 2850000, C, 'Pedido inicial para la temporada de fin de año.'],
  ['2025-11-12', MOU, MAYORISTA, 120, 38000, C, 'Descuento por volumen del 5% ya incluido en el precio unitario.'],
  ['2025-11-25', MON, ANDINA, 25, 520000, C, 'Entrega recibida en dos despachos parciales.'],
  ['2025-12-03', AUD, GLOBAL, 60, 155000, C, 'Reposición para ventas navideñas.'],
  ['2025-12-10', TEC, COMPUPARTES, 40, 145000, C, 'Primer pedido a este proveedor; pago a 30 días.'],
  ['2025-12-18', LAP, TECNOIMPORT, 15, 2900000, C, 'Compra corporativa anticipada; incluye garantía extendida.'],
  ['2026-01-09', SSD, MAYORISTA, 80, 135000, C, 'Precio promocional de inicio de año.'],
  ['2026-01-21', ROU, ANDINA, 30, 165000, C, 'Pedido regular de reposición.'],
  ['2026-02-05', IMP, GLOBAL, 12, 780000, C, 'Incluye kit de tintas de cortesía por unidad.'],
  ['2026-02-17', MOU, COMPUPARTES, 100, 41000, C, 'Cambio de proveedor por falta de stock del habitual.'],
  ['2026-03-02', MON, TECNOIMPORT, 20, 540000, C, 'Aumento de precio por variación de la tasa de cambio.'],
  ['2026-03-14', TEC, MAYORISTA, 35, 150000, C, 'Entrega en bodega principal.'],
  ['2026-03-27', AUD, GLOBAL, 45, 160000, C, 'Dos unidades llegaron con empaque averiado; se aceptaron con nota.'],
  ['2026-04-08', LAP, ANDINA, 8, 3050000, C, 'Lote con procesador actualizado; mayor costo unitario.'],
  ['2026-04-22', SSD, COMPUPARTES, 60, 142000, C, 'Pago de contado con descuento por pronto pago.'],
  ['2026-05-06', ROU, TECNOIMPORT, 25, 172000, C, 'Pedido para proyecto de redes de un cliente empresarial.'],
  ['2026-05-19', IMP, MAYORISTA, 10, 800000, C, 'Entrega con una semana de retraso.'],
  ['2026-06-03', MOU, MAYORISTA, 150, 39500, C, 'Compra de mayor volumen del año; negociación por cantidad.'],
  ['2026-06-16', MON, ANDINA, 18, 555000, C, 'Reposición de mitad de año.'],
  ['2026-07-01', TEC, COMPUPARTES, 5, 160000, C, 'Pedido mínimo de urgencia para cubrir una venta comprometida.'],
  ['2026-07-15', AUD, GLOBAL, 50, 158000, C, 'Pedido regular de reposición.'],
  ['2026-08-04', LAP, TECNOIMPORT, 12, 2980000, C, 'Preparación para temporada escolar y universitaria.'],
  ['2026-08-20', SSD, MAYORISTA, 70, 138000, C, 'Factura recibida con fecha del día siguiente.'],
  ['2026-09-02', ROU, ANDINA, 20, 180000, C, 'Incremento de precio informado por el proveedor.'],
  ['2026-09-17', IMP, GLOBAL, 6, 820000, A, 'Pedido anulado por demora del proveedor; no ingresó a inventario.'],
  ['2026-10-05', MOU, COMPUPARTES, 10, 45000, C, 'Compra menor para reposición urgente de vitrina.'],
  ['2026-10-19', MON, TECNOIMPORT, 30, 530000, C, 'Abastecimiento previo a Black Friday.'],
  ['2026-11-03', LAP, ANDINA, 14, 3100000, C, 'Abastecimiento para Black Friday y fin de año.'],
  ['2026-11-12', AUD, GLOBAL, 80, 152000, P, 'Mercancía en tránsito; entrega estimada en diciembre.'],
  ['2026-11-20', TEC, MAYORISTA, 45, 148000, P, 'Orden confirmada; pendiente de despacho y factura.'],
]

const SALE_ROWS: Row[] = [
  ['2025-11-10', LAP, ALTAVISTA, 4, 3650000, C, 'Equipos para el área de diseño de obra.'],
  ['2025-11-18', MOU, PUNTO, 40, 62000, C, 'Venta al por mayor para reventa.'],
  ['2025-11-28', MON, PIXEL, 10, 690000, C, 'Promoción de Black Friday; pago con transferencia.'],
  ['2025-12-06', AUD, PUNTO, 25, 229000, C, 'Pedido para temporada navideña.'],
  ['2025-12-15', LAP, COLEGIO, 12, 3700000, C, 'Dotación de sala de informática; factura a 30 días.'],
  ['2025-12-22', TEC, PIXEL, 18, 210000, C, 'Renovación de puestos de trabajo.'],
  ['2026-01-14', SSD, MONTENEGRO, 30, 195000, C, 'Actualización de equipos de oficina.'],
  ['2026-01-27', ROU, CLINICA, 12, 240000, C, 'Ampliación de cobertura wifi en consultorios.'],
  ['2026-02-10', IMP, CLINICA, 5, 1050000, C, 'Incluye instalación y configuración en sitio.'],
  ['2026-02-24', MOU, COLEGIO, 60, 64000, C, 'Reposición para salas de informática.'],
  ['2026-03-09', MON, ALTAVISTA, 14, 700000, C, 'Entrega en la sede administrativa.'],
  ['2026-03-20', AUD, PUNTO, 30, 235000, C, 'Cliente solicita factura electrónica consolidada.'],
  ['2026-04-02', LAP, MONTENEGRO, 6, 3800000, C, 'Venta con garantía extendida de dos años.'],
  ['2026-04-15', TEC, PUNTO, 20, 215000, C, 'Pedido recurrente mensual.'],
  ['2026-04-28', SSD, PIXEL, 45, 199000, C, 'Descuento del 3% por pago de contado ya aplicado.'],
  ['2026-05-12', ROU, ALTAVISTA, 18, 245000, C, 'Proyecto de redes para campamento de obra.'],
  ['2026-05-26', IMP, COLEGIO, 6, 1080000, C, 'Entrega coordinada con el área de sistemas.'],
  ['2026-06-09', MOU, PUNTO, 90, 63000, C, 'Venta de mayor volumen del semestre.'],
  ['2026-06-23', MON, CLINICA, 15, 710000, C, 'Monitores para puestos de admisiones.'],
  ['2026-07-07', TEC, MONTENEGRO, 12, 220000, C, 'Venta comprometida cubierta con pedido de urgencia.'],
  ['2026-07-21', AUD, PUNTO, 40, 238000, C, 'Reposición de inventario del cliente.'],
  ['2026-08-11', LAP, COLEGIO, 9, 3850000, C, 'Equipos para docentes; inicio de semestre.'],
  ['2026-08-25', SSD, PIXEL, 50, 205000, C, 'Ampliación de almacenamiento para estaciones de edición.'],
  ['2026-09-08', ROU, CLINICA, 15, 250000, C, 'Segunda fase del proyecto de conectividad.'],
  ['2026-09-22', IMP, MONTENEGRO, 4, 1100000, C, 'Entrega inmediata desde bodega.'],
  ['2026-10-06', MOU, MOSTRADOR, 2, 68000, C, 'Venta directa en punto físico; pago en efectivo.'],
  ['2026-10-20', MON, ALTAVISTA, 16, 720000, C, 'Dotación de nueva oficina de proyectos.'],
  ['2026-10-29', TEC, PIXEL, 8, 225000, A, 'Venta anulada por devolución total del cliente.'],
  ['2026-11-06', LAP, ALTAVISTA, 10, 3900000, C, 'Renovación de equipos de ingeniería.'],
  ['2026-11-18', AUD, PUNTO, 35, 245000, P, 'Pedido confirmado; pendiente de entrega y pago.'],
]

const code = (prefix: string, index: number) => `${prefix}-${String(index + 1).padStart(3, '0')}`

export function createSeedDatabase(): Database {
  const purchases: Purchase[] = PURCHASE_ROWS.map(([date, productId, supplier, quantity, unitPrice, status, notes], index) => ({
    code: code('COM', index),
    productId,
    supplier,
    date,
    quantity,
    unitPrice,
    notes,
    status,
  }))
  const sales: Sale[] = SALE_ROWS.map(([date, productId, client, quantity, unitPrice, status, notes], index) => ({
    code: code('VEN', index),
    productId,
    client,
    date,
    quantity,
    unitPrice,
    notes,
    status,
  }))
  return { version: 1, products: PRODUCTS.map((product) => ({ ...product })), purchases, sales }
}

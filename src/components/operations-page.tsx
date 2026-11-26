import { useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, PageSkeleton, NoData, StatusBadge, KpiCard } from '@/components/common'
import { DistributionPie } from '@/components/charts'
import { OptionSelect } from '@/components/option-select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { ShoppingCart, Receipt, Hash, Package } from 'lucide-react'
import { formatCOP, formatDate, formatNumber, shortName } from '@/lib/format'
import { useNexa } from '@/lib/store'
import { STATUSES, type Operation, type OperationKind, type OperationStatus } from '@/lib/types'

const NEW_PRODUCT = '__new__'

interface FormState {
  code: string
  productId: string
  newProduct: string
  party: string
  date: string
  quantity: string
  unitPrice: string
  notes: string
  status: OperationStatus
}

function OperationDialog({
  kind,
  editing,
  open,
  onOpenChange,
}: {
  kind: OperationKind
  editing: Operation | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { products, nextCode, saveOperation } = useNexa()
  const partyLabel = kind === 'compra' ? 'Proveedor' : 'Cliente'
  const initial = (): FormState =>
    editing
      ? {
          code: editing.code,
          productId: editing.productId,
          newProduct: '',
          party: editing.party,
          date: editing.date,
          quantity: String(editing.quantity),
          unitPrice: String(editing.unitPrice),
          notes: editing.notes,
          status: editing.status,
        }
      : {
          code: nextCode(kind),
          productId: products[0]?.id ?? '',
          newProduct: '',
          party: '',
          date: new Date().toISOString().slice(0, 10),
          quantity: '1',
          unitPrice: '',
          notes: '',
          status: 'Completada',
        }
  const [form, setForm] = useState<FormState>(initial)
  const [error, setError] = useState<string | null>(null)
  const [lastKey, setLastKey] = useState<string | null>(null)
  const key = `${open}-${editing?.code ?? 'new'}`
  if (key !== lastKey) {
    setLastKey(key)
    if (open) {
      setForm(initial())
      setError(null)
    }
  }
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const quantity = Number(form.quantity)
    const unitPrice = Number(form.unitPrice)
    if (!form.code.trim()) return setError('El código es obligatorio.')
    if (form.productId === NEW_PRODUCT && !form.newProduct.trim()) return setError('Escribe el nombre del nuevo producto.')
    if (!form.productId) return setError('Selecciona un producto.')
    if (!form.party.trim()) return setError(`El ${partyLabel.toLowerCase()} es obligatorio.`)
    if (!form.date) return setError('La fecha es obligatoria.')
    if (!Number.isInteger(quantity) || quantity <= 0) return setError('La cantidad debe ser un entero mayor que cero.')
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) return setError('El precio unitario debe ser mayor que cero.')
    const result = saveOperation(
      kind,
      {
        code: form.code,
        productId: form.productId === NEW_PRODUCT ? '' : form.productId,
        party: form.party,
        date: form.date,
        quantity,
        unitPrice,
        notes: form.notes,
        status: form.status,
      },
      {
        ...(editing ? { originalCode: editing.code } : {}),
        ...(form.productId === NEW_PRODUCT ? { newProductName: form.newProduct } : {}),
      },
    )
    if (!result.ok) return setError(result.message)
    toast.success(`${kind === 'compra' ? 'Compra' : 'Venta'} ${result.code} ${editing ? 'actualizada' : 'registrada'}`)
    onOpenChange(false)
  }

  const productOptions = [
    ...products.map((p) => ({ value: p.id, label: p.name })),
    { value: NEW_PRODUCT, label: '+ Nuevo producto' },
  ]
  const total = Number(form.quantity) * Number(form.unitPrice)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar' : 'Registrar'} {kind === 'compra' ? 'compra' : 'venta'}
            </DialogTitle>
            <DialogDescription>Los cambios se guardan en este navegador.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="op-code">Código</Label>
              <Input id="op-code" value={form.code} onChange={(e) => set('code', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="op-date">Fecha</Label>
              <Input id="op-date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="op-product">Producto</Label>
              <OptionSelect id="op-product" value={form.productId} options={productOptions} onChange={(v) => set('productId', v)} />
              {form.productId === NEW_PRODUCT && (
                <Input
                  aria-label="Nombre del nuevo producto"
                  placeholder="Nombre del nuevo producto"
                  value={form.newProduct}
                  onChange={(e) => set('newProduct', e.target.value)}
                />
              )}
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="op-party">{partyLabel}</Label>
              <Input id="op-party" value={form.party} onChange={(e) => set('party', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="op-qty">Cantidad</Label>
              <Input id="op-qty" type="number" min={1} step={1} value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="op-price">Precio unitario (COP)</Label>
              <Input id="op-price" type="number" min={1} value={form.unitPrice} onChange={(e) => set('unitPrice', e.target.value)} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="op-status">Estado</Label>
              <OptionSelect
                id="op-status"
                value={form.status}
                options={STATUSES.map((s) => ({ value: s, label: s }))}
                onChange={(v) => set('status', (v || 'Completada') as OperationStatus)}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="op-notes">Notas</Label>
              <Textarea id="op-notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground tabular-nums">{Number.isFinite(total) ? formatCOP(total) : '—'}</span>
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function OperationsTable({
  operations,
  showKind = false,
  onEdit,
  onDelete,
}: {
  operations: Operation[]
  showKind?: boolean
  onEdit?: (op: Operation) => void
  onDelete?: (op: Operation) => void
}) {
  if (operations.length === 0) return <NoData />
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          {showKind && <TableHead>Tipo</TableHead>}
          <TableHead>Fecha</TableHead>
          <TableHead>Producto</TableHead>
          <TableHead>Tercero</TableHead>
          <TableHead className="text-right">Cant.</TableHead>
          <TableHead className="text-right">Precio unit.</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Estado</TableHead>
          {(onEdit || onDelete) && <TableHead className="sr-only">Acciones</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {operations.map((op) => (
          <TableRow key={`${op.kind}-${op.code}`}>
            <TableCell className="font-mono text-xs">{op.code}</TableCell>
            {showKind && <TableCell>{op.kind === 'compra' ? 'Compra' : 'Venta'}</TableCell>}
            <TableCell className="whitespace-nowrap">{formatDate(op.date)}</TableCell>
            <TableCell className="max-w-48 truncate">{op.productName}</TableCell>
            <TableCell className="max-w-48 truncate">{op.party}</TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(op.quantity)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCOP(op.unitPrice)}</TableCell>
            <TableCell className="text-right font-medium tabular-nums">{formatCOP(op.total)}</TableCell>
            <TableCell>
              <StatusBadge status={op.status} />
            </TableCell>
            {(onEdit || onDelete) && (
              <TableCell className="text-right whitespace-nowrap">
                {onEdit && (
                  <Button variant="ghost" size="icon-sm" aria-label={`Editar ${op.code}`} onClick={() => onEdit(op)}>
                    <Pencil />
                  </Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${op.code}`} onClick={() => onDelete(op)}>
                    <Trash2 />
                  </Button>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function OperationsPage({ kind }: { kind: OperationKind }) {
  const nexa = useNexa()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Operation | null>(null)
  const [deleting, setDeleting] = useState<Operation | null>(null)
  const isPurchase = kind === 'compra'
  const all = isPurchase ? nexa.purchases : nexa.sales
  const active = isPurchase ? nexa.activePurchases : nexa.activeSales

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? all.filter((op) => [op.code, op.productName, op.party, op.notes].some((v) => v.toLowerCase().includes(q)))
      : all
    return [...list].sort((a, b) => b.date.localeCompare(a.date) || b.code.localeCompare(a.code))
  }, [all, search])

  if (!nexa.ready) return <PageSkeleton />
  const total = active.reduce((acc, op) => acc + op.total, 0)
  const units = active.reduce((acc, op) => acc + op.quantity, 0)

  const byProduct = new Map<string, number>()
  for (const op of active) byProduct.set(op.productName, (byProduct.get(op.productName) ?? 0) + op.total)
  const ranked = [...byProduct.entries()].sort((a, b) => b[1] - a[1])
  const pieData = [
    ...ranked.slice(0, 4).map(([name, value]) => ({ name: shortName(name), value })),
    ...(ranked.length > 4 ? [{ name: 'Otros', value: ranked.slice(4).reduce((acc, [, value]) => acc + value, 0) }] : []),
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isPurchase ? 'Compras' : 'Ventas'}
        description={
          isPurchase
            ? 'Registra, edita y consulta las compras a proveedores. Las anuladas no suman en los indicadores.'
            : 'Registra, edita y consulta las ventas a clientes. Las anuladas no suman en los indicadores.'
        }
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus data-icon="inline-start" />
            Nueva {isPurchase ? 'compra' : 'venta'}
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-4 @4xl/main:grid-cols-4">
        <KpiCard label={`Total ${isPurchase ? 'comprado' : 'vendido'}`} value={formatCOP(total)} icon={isPurchase ? ShoppingCart : Receipt} />
        <KpiCard label="Operaciones activas" value={formatNumber(active.length)} icon={Hash} />
        <KpiCard label="Unidades" value={formatNumber(units)} icon={Package} />
        <KpiCard label="Promedio por operación" value={active.length ? formatCOP(total / active.length) : '—'} icon={Hash} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Distribución de {isPurchase ? 'compras' : 'ventas'} por producto</CardTitle>
          <CardDescription>
            Participación de cada producto en el total {isPurchase ? 'comprado' : 'vendido'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pieData.length ? (
            <DistributionPie
              data={pieData}
              format={formatCOP}
              label={`Distribución de ${isPurchase ? 'compras' : 'ventas'} por producto`}
            />
          ) : (
            <NoData />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Registro de {isPurchase ? 'compras' : 'ventas'}</CardTitle>
          <CardDescription>{rows.length} operaciones con los filtros actuales</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Buscar operaciones"
              placeholder="Buscar por código, producto o tercero"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <OperationsTable
            operations={rows}
            onEdit={(op) => {
              setEditing(op)
              setDialogOpen(true)
            }}
            onDelete={setDeleting}
          />
        </CardContent>
      </Card>
      <OperationDialog kind={kind} editing={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar {deleting?.code}</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleting) {
                  nexa.deleteOperation(kind, deleting.code)
                  toast.success(`${deleting.code} eliminada`)
                }
                setDeleting(null)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

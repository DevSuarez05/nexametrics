import { createFileRoute } from '@tanstack/react-router'
import { OperationsPage } from '@/components/operations-page'
import { pageHead } from '@/lib/seo'

export const Route = createFileRoute('/compras')({
  head: () => pageHead('Compras', 'Registra y consulta las compras a proveedores.'),
  component: () => <OperationsPage kind="compra" />,
})

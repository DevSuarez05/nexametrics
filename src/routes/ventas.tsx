import { createFileRoute } from '@tanstack/react-router'
import { OperationsPage } from '@/components/operations-page'
import { pageHead } from '@/lib/seo'

export const Route = createFileRoute('/ventas')({
  head: () => pageHead('Ventas', 'Registra y consulta las ventas a clientes.'),
  component: () => <OperationsPage kind="venta" />,
})

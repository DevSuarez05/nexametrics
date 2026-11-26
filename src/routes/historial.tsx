import { createFileRoute } from '@tanstack/react-router'
import { PageHeader, PageSkeleton } from '@/components/common'
import { OperationsTable } from '@/components/operations-page'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { pageHead } from '@/lib/seo'
import { useNexa } from '@/lib/store'

export const Route = createFileRoute('/historial')({
  head: () => pageHead('Historial de operaciones', 'Todas las compras y ventas en orden cronológico.'),
  component: Historial,
})

function Historial() {
  const { ready, purchases, sales } = useNexa()
  if (!ready) return <PageSkeleton />
  const ops = [...purchases, ...sales].sort((a, b) => b.date.localeCompare(a.date) || b.code.localeCompare(a.code))
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Historial de operaciones" description="Todas las compras y ventas, incluidas las anuladas, de la más reciente a la más antigua." />
      <Card>
        <CardHeader>
          <CardTitle>Operaciones</CardTitle>
          <CardDescription>{ops.length} registros con los filtros actuales</CardDescription>
        </CardHeader>
        <CardContent>
          <OperationsTable operations={ops} showKind />
        </CardContent>
      </Card>
    </div>
  )
}

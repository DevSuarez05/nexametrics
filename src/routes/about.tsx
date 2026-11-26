import { createFileRoute } from '@tanstack/react-router'
import { Logo } from '@/components/logo'
import { PageHeader } from '@/components/common'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { pageHead } from '@/lib/seo'

export const Route = createFileRoute('/about')({
  head: () => pageHead('About NexaMetrics', 'Quiénes somos y cómo NexaMetrics convierte datos en decisiones.'),
  component: About,
})

function About() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title="About NexaMetrics" description="Turn Data Into Decisions." />
      <Card>
        <CardHeader>
          <CardTitle>
            <Logo />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm leading-relaxed">
          <p>
            NexaMetrics es una plataforma de inteligencia empresarial que convierte tus compras y ventas en indicadores,
            estadística descriptiva y comparaciones entre periodos para que tomes mejores decisiones.
          </p>
          <p>
            <span className="font-medium">Equipo fundador:</span> Juan Fernando Carvajal, Daniel Andres Suarez Ramirez y Juan Manuel.
          </p>
          <p className="text-muted-foreground">
            Este prototipo guarda los datos solo en este navegador. Puedes restablecer los datos de ejemplo en cualquier momento.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

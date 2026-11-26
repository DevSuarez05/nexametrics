'use client'

import { useState, type ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useTheme } from 'next-themes'
import {
  Database,
  FileText,
  GitCompareArrows,
  History,
  Info,
  LayoutDashboard,
  Menu,
  Moon,
  Receipt,
  RotateCcw,
  ShoppingCart,
  Sigma,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { GlobalFilters } from '@/components/global-filters'
import { Logo } from '@/components/logo'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useNexa } from '@/lib/store'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

const NAV: NavItem[] = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/compras', label: 'Compras', icon: ShoppingCart },
  { href: '/ventas', label: 'Ventas', icon: Receipt },
  { href: '/comparativa', label: 'Comparativa', icon: GitCompareArrows },
  { href: '/analisis', label: 'Análisis estadístico', icon: Sigma },
  { href: '/historial', label: 'Historial de operaciones', icon: History },
  { href: '/reportes', label: 'Reportes', icon: FileText },
  { href: '/about', label: 'About NexaMetrics', icon: Info },
]

const FOUNDERS = 'Juan Fernando Carvajar, Daniel Andres Suarez Ramirez y Juan Manuel'

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Módulos" className="flex flex-col gap-1 px-3">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            to={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/75 outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              active &&
                'bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-sidebar-primary',
            )}
          >
            <Icon className={cn('size-4 shrink-0', active && 'text-sidebar-primary')} aria-hidden="true" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarCredits() {
  return (
    <div className="mt-auto flex flex-col gap-1 border-t border-sidebar-border px-5 py-4 text-xs leading-relaxed text-sidebar-foreground/65">
      <span className="font-medium text-sidebar-foreground/85">Equipo fundador</span>
      <span>{FOUNDERS}</span>
    </div>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Cambiar entre modo claro y oscuro"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Moon className="dark:hidden" aria-hidden="true" />
      <Sun className="hidden dark:block" aria-hidden="true" />
    </Button>
  )
}

function ResetDataButton() {
  const { resetData } = useNexa()
  const [open, setOpen] = useState(false)
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        <RotateCcw data-icon="inline-start" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Restablecer datos de ejemplo</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restablecer datos de ejemplo</AlertDialogTitle>
          <AlertDialogDescription>
            Se reemplazarán todas las compras, ventas y productos guardados en este navegador por los 60 registros de
            ejemplo. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              resetData()
              setOpen(false)
              toast.success('Datos de ejemplo restablecidos')
            }}
          >
            Restablecer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [menuOpen, setMenuOpen] = useState(false)
  const current = NAV.find((item) => item.href === pathname)

  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex print:hidden">
        <Link to="/" className="px-5 py-5 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
          <Logo />
        </Link>
        <NavLinks pathname={pathname} />
        <SidebarCredits />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur lg:px-6 print:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger render={<Button variant="outline" size="icon" className="lg:hidden" />}>
              <Menu aria-hidden="true" />
              <span className="sr-only">Abrir menú de módulos</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0 text-sidebar-foreground">
              <SheetHeader className="px-5 py-5">
                <SheetTitle className="text-sidebar-foreground">
                  <Logo />
                </SheetTitle>
                <SheetDescription className="sr-only">Navegación entre los módulos de NexaMetrics</SheetDescription>
              </SheetHeader>
              <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
              <SidebarCredits />
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold">{current?.label ?? 'NexaMetrics'}</span>
            <span className="hidden truncate text-xs text-muted-foreground sm:block">
              Conoce tus números, compara tus operaciones y toma mejores decisiones.
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="hidden md:inline-flex">
              <Database aria-hidden="true" />
              Datos locales (simulación)
            </Badge>
            <ResetDataButton />
            <ThemeToggle />
          </div>
        </header>

        {pathname !== '/about' && <GlobalFilters />}

        <main className="@container/main flex-1 p-4 lg:p-6">{children}</main>

        <footer className="border-t px-4 py-4 text-xs leading-relaxed text-muted-foreground lg:px-6 print:hidden">
          <span className="font-medium text-foreground">NexaMetrics</span> · Turn Data Into Decisions. Fundado por{' '}
          {FOUNDERS}. Prototipo con persistencia local: los datos se guardan solo en este navegador.
        </footer>
      </div>
    </div>
  )
}

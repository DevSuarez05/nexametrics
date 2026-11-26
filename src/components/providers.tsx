'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { AppShell } from '@/components/app-shell'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { NexaProvider } from '@/lib/store'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <TooltipProvider>
        <NexaProvider>
          <AppShell>{children}</AppShell>
          <Toaster position="bottom-right" />
        </NexaProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}

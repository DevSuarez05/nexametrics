import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8 shrink-0', className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M7.5 22.5 13.5 15l5 3.5 6-9.5"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary-foreground"
      />
      <circle cx="7.5" cy="22.5" r="2.4" className="fill-primary-foreground" />
      <circle cx="13.5" cy="15" r="2.4" className="fill-primary-foreground" />
      <circle cx="18.5" cy="18.5" r="2.4" className="fill-primary-foreground" />
      <circle cx="24.5" cy="9" r="2.4" className="fill-primary-foreground" />
    </svg>
  )
}

export function Logo({ className, tagline = true }: { className?: string; tagline?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-base font-semibold tracking-tight">
          Nexa<span className="text-primary">Metrics</span>
        </span>
        {tagline && <span className="mt-1 text-[11px] opacity-70">Turn Data Into Decisions.</span>}
      </span>
    </span>
  )
}

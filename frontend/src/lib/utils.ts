import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Formatting ─────────────────────────────────────────────────────────────
export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n)
}

export function formatCompact(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}K`
  return formatCurrency(n)
}

export function formatDate(date: string | Date, fmt = 'dd MMM yyyy'): string {
  return format(new Date(date), fmt)
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function daysUntil(date: string | Date): number {
  return differenceInDays(new Date(date), new Date())
}

export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`
}

// ── Policy helpers ─────────────────────────────────────────────────────────
export function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    HEALTH: 'text-neon-green  bg-neon-green/10  border-neon-green/20',
    LIFE:   'text-neon-purple bg-neon-purple/10 border-neon-purple/20',
    TERM:   'text-neon-blue   bg-neon-blue/10   border-neon-blue/20',
    MOTOR:  'text-neon-amber  bg-neon-amber/10  border-neon-amber/20',
    TRAVEL: 'text-sky-400     bg-sky-400/10     border-sky-400/20',
    HOME:   'text-rose-400    bg-rose-400/10    border-rose-400/20',
  }
  return map[category] || 'text-tx-secondary bg-bg-elevated border-bd-base'
}

export function getCategoryIcon(category: string): string {
  const map: Record<string, string> = {
    HEALTH: '🏥',
    LIFE:   '❤️',
    TERM:   '🛡️',
    MOTOR:  '🚗',
    TRAVEL: '✈️',
    HOME:   '🏠',
  }
  return map[category] || '📋'
}

export function getCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    HEALTH: 'Health',
    LIFE:   'Life',
    TERM:   'Term Life',
    MOTOR:  'Motor',
    TRAVEL: 'Travel',
    HOME:   'Home',
  }
  return map[category] || category
}

export function getPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    HIGH:   'text-rose-400   bg-rose-400/10   border-rose-400/20',
    MEDIUM: 'text-amber-400  bg-amber-400/10  border-amber-400/20',
    LOW:    'text-neon-green bg-neon-green/10 border-neon-green/20',
  }
  return map[priority] || ''
}

export function getInsightIcon(type: string): string {
  const map: Record<string, string> = {
    ACTION: '⚡',
    TIP:    '💡',
    ALERT:  '⚠️',
    GAP:    '🕳️',
  }
  return map[type] || '📌'
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    ACTIVE:    'text-neon-green  bg-neon-green/10  border-neon-green/20',
    PENDING:   'text-neon-amber  bg-neon-amber/10  border-neon-amber/20',
    EXPIRED:   'text-tx-muted    bg-bg-elevated    border-bd-base',
    CANCELLED: 'text-rose-400    bg-rose-400/10    border-rose-400/20',
    CAPTURED:  'text-neon-green  bg-neon-green/10  border-neon-green/20',
    FAILED:    'text-rose-400    bg-rose-400/10    border-rose-400/20',
  }
  return map[status] || 'text-tx-secondary bg-bg-elevated border-bd-base'
}

// ── Validation ─────────────────────────────────────────────────────────────
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ── Misc ───────────────────────────────────────────────────────────────────
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function truncate(str: string, len = 60): string {
  return str.length > len ? `${str.slice(0, len)}…` : str
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

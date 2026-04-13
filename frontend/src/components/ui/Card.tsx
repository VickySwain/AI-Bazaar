'use client'
import { HTMLAttributes, forwardRef } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

// ── Card ───────────────────────────────────────────────────────────────────
interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'elevated' | 'glass' | 'bordered' | 'gradient'
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const cardVariants: Record<string, string> = {
  default:  'bg-bg-surface border border-bd-subtle shadow-card',
  elevated: 'bg-bg-elevated border border-bd-base shadow-card',
  glass:    'glass shadow-card',
  bordered: 'bg-bg-surface border border-bd-strong',
  gradient: 'bg-gradient-to-br from-bg-surface to-bg-elevated border border-bd-subtle',
}

const paddingVariants: Record<string, string> = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', hover = false, padding = 'md', className, children, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn(
        'rounded-2xl overflow-hidden relative',
        cardVariants[variant],
        paddingVariants[padding],
        hover && 'cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover hover:border-bd-strong',
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  ),
)
Card.displayName = 'Card'

// ── Badge ──────────────────────────────────────────────────────────────────
interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'custom'
  size?: 'sm' | 'md'
  dot?: boolean
}

const badgeVariants: Record<string, string> = {
  default: 'bg-bg-muted/50  text-tx-secondary border-bd-base',
  success: 'bg-neon-green/10 text-neon-green  border-neon-green/20',
  warning: 'bg-neon-amber/10 text-neon-amber  border-neon-amber/20',
  danger:  'bg-rose-400/10   text-rose-400    border-rose-400/20',
  info:    'bg-neon-blue/10  text-neon-blue   border-neon-blue/20',
  purple:  'bg-neon-purple/10 text-neon-purple border-neon-purple/20',
  custom:  '',
}

export function Badge({ variant = 'default', size = 'sm', dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        badgeVariants[variant],
        className,
      )}
      {...props}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────
interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string
  height?: string
}

export function Skeleton({ width, height, className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('shimmer rounded-lg', className)}
      style={{ width, height }}
      {...props}
    />
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('card-base rounded-2xl p-6 space-y-4', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
    </div>
  )
}

// ── Divider ────────────────────────────────────────────────────────────────
export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px bg-bd-subtle', className)} />
}

// ── StatCard ───────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon?: React.ReactNode
  className?: string
}

export function StatCard({ label, value, change, changeType = 'neutral', icon, className }: StatCardProps) {
  return (
    <Card className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-tx-secondary">{label}</span>
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-brand-400/10 flex items-center justify-center text-brand-400">
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-display font-semibold text-tx-primary">{value}</span>
        {change && (
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full border',
            changeType === 'positive' && 'text-neon-green bg-neon-green/10 border-neon-green/20',
            changeType === 'negative' && 'text-rose-400 bg-rose-400/10 border-rose-400/20',
            changeType === 'neutral'  && 'text-tx-secondary bg-bg-elevated border-bd-base',
          )}>
            {change}
          </span>
        )}
      </div>
    </Card>
  )
}

'use client'
import { forwardRef, ButtonHTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'glass'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  glow?: boolean
  fullWidth?: boolean
}

const variantStyles: Record<string, string> = {
  primary:   'bg-brand-gradient text-white shadow-glow-sm hover:shadow-glow-md border border-brand-400/20',
  secondary: 'bg-bg-elevated text-tx-primary border border-bd-base hover:bg-bg-muted hover:border-bd-strong',
  ghost:     'bg-transparent text-tx-secondary hover:bg-bg-elevated hover:text-tx-primary border border-transparent hover:border-bd-subtle',
  danger:    'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20',
  outline:   'bg-transparent text-tx-primary border border-bd-strong hover:border-brand-400/50 hover:text-brand-400',
  glass:     'glass text-tx-primary hover:bg-bg-surface/80',
}

const sizeStyles: Record<string, string> = {
  sm:  'h-8  px-3  text-xs  gap-1.5 rounded-lg',
  md:  'h-10 px-4  text-sm  gap-2   rounded-xl',
  lg:  'h-12 px-6  text-base gap-2.5 rounded-xl',
  xl:  'h-14 px-8  text-lg  gap-3   rounded-2xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconRight,
      glow = false,
      fullWidth = false,
      children,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading

    return (
      <motion.button
        ref={ref as any}
        whileTap={{ scale: isDisabled ? 1 : 0.97 }}
        whileHover={{ scale: isDisabled ? 1 : 1.01 }}
        transition={{ duration: 0.15 }}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-200 cursor-pointer select-none',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-base',
          variantStyles[variant],
          sizeStyles[size],
          glow && 'animate-glow-pulse',
          fullWidth && 'w-full',
          className,
        )}
        {...(props as any)}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          icon && <span className="flex-shrink-0">{icon}</span>
        )}
        {children && <span>{children}</span>}
        {iconRight && !loading && <span className="flex-shrink-0">{iconRight}</span>}
      </motion.button>
    )
  },
)

Button.displayName = 'Button'

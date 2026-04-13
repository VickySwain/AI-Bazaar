'use client'
import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// ── Input ──────────────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightElement?: React.ReactNode
  containerClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightElement, containerClassName, className, ...props }, ref) => (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label className="text-sm font-medium text-tx-secondary">
          {label}
          {props.required && <span className="text-rose-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-tx-muted flex items-center pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full h-11 bg-bg-elevated border rounded-xl text-tx-primary text-sm',
            'placeholder:text-tx-muted transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400/60',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-rose-500/50 focus:ring-rose-500/30 focus:border-rose-500/50' : 'border-bd-base hover:border-bd-strong',
            leftIcon ? 'pl-10' : 'pl-4',
            rightElement ? 'pr-10' : 'pr-4',
            className,
          )}
          {...props}
        />
        {rightElement && (
          <span className="absolute right-3 flex items-center">{rightElement}</span>
        )}
      </div>
      {error && <p className="text-xs text-rose-400 flex items-center gap-1">{error}</p>}
      {hint && !error && <p className="text-xs text-tx-muted">{hint}</p>}
    </div>
  ),
)
Input.displayName = 'Input'

// ── Textarea ───────────────────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-tx-secondary">{label}</label>}
      <textarea
        ref={ref}
        className={cn(
          'w-full bg-bg-elevated border rounded-xl text-tx-primary text-sm px-4 py-3',
          'placeholder:text-tx-muted transition-all duration-200 resize-none',
          'focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400/60',
          error ? 'border-rose-500/50' : 'border-bd-base hover:border-bd-strong',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  ),
)
Textarea.displayName = 'Textarea'

// ── Select ─────────────────────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: Array<{ value: string; label: string }>
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-tx-secondary">{label}</label>}
      <select
        ref={ref}
        className={cn(
          'w-full h-11 bg-bg-elevated border rounded-xl text-tx-primary text-sm px-4',
          'transition-all duration-200 cursor-pointer appearance-none',
          'focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400/60',
          error ? 'border-rose-500/50' : 'border-bd-base hover:border-bd-strong',
          className,
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-bg-elevated">
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  ),
)
Select.displayName = 'Select'

'use client'
// src/components/recommendations/MlStatusBadge.tsx
// Shows whether recommendations are from the ML model or the fallback scorer.
// Used in the recommendation page and dashboard.

import { motion, AnimatePresence } from 'framer-motion'
import { Brain, AlertTriangle, Zap, RefreshCw } from 'lucide-react'
import { useMlHealth } from '@/hooks/useRecommendations'
import { cn } from '@/lib/utils'

interface MlStatusBadgeProps {
  isFallback?: boolean
  modelVersion?: string
  inferenceMs?: number
  compact?: boolean
  className?: string
}

export function MlStatusBadge({
  isFallback,
  modelVersion,
  inferenceMs,
  compact = false,
  className,
}: MlStatusBadgeProps) {
  const { data: health } = useMlHealth()

  const isFromMl = !isFallback
  const circuitOpen = health?.circuitBreaker === 'OPEN'
  const modelLoaded = health?.modelLoaded ?? true

  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border',
          isFromMl
            ? 'bg-brand-400/10 text-brand-400 border-brand-400/20'
            : 'bg-neon-amber/10 text-neon-amber border-neon-amber/20',
          className,
        )}
      >
        {isFromMl ? (
          <Brain className="w-3 h-3" />
        ) : (
          <Zap className="w-3 h-3" />
        )}
        {isFromMl ? `AI (${modelVersion || 'v1'})` : 'Rule-based'}
        {inferenceMs !== undefined && (
          <span className="opacity-60">{inferenceMs.toFixed(0)}ms</span>
        )}
      </span>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isFallback ? 'fallback' : 'ml'}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-2xl border',
          isFromMl
            ? 'bg-brand-400/8 border-brand-400/20'
            : 'bg-neon-amber/8 border-neon-amber/20',
          className,
        )}
      >
        <div
          className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
            isFromMl ? 'bg-brand-400/15' : 'bg-neon-amber/15',
          )}
        >
          {isFromMl ? (
            <Brain className="w-4 h-4 text-brand-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-neon-amber" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-semibold', isFromMl ? 'text-brand-400' : 'text-neon-amber')}>
            {isFromMl ? 'AI-Powered Recommendations' : 'Rule-Based Recommendations'}
          </p>
          <p className="text-xs text-tx-muted">
            {isFromMl
              ? `XGBoost model ${modelVersion || ''}${inferenceMs ? ` · ${inferenceMs.toFixed(0)}ms` : ''}`
              : 'ML service unavailable — showing smart defaults'}
          </p>
        </div>
        {circuitOpen && (
          <span className="flex items-center gap-1 text-xs text-rose-400 bg-rose-400/10 border border-rose-400/20 px-2 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Reconnecting
          </span>
        )}
        {isFromMl && !circuitOpen && (
          <span className="flex items-center gap-1 text-xs text-neon-green">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
            Live
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

// ── Minimal inline version for cards ──────────────────────────────────────
export function ModelVersionTag({
  modelVersion,
  className,
}: {
  modelVersion: string
  className?: string
}) {
  const isFallback = modelVersion.includes('fallback') || modelVersion.includes('rule')

  return (
    <span
      className={cn(
        'text-xs px-1.5 py-0.5 rounded-md font-mono',
        isFallback
          ? 'bg-neon-amber/10 text-neon-amber/70'
          : 'bg-brand-400/10 text-brand-400/70',
        className,
      )}
    >
      {modelVersion}
    </span>
  )
}

'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Star, CheckCircle2, XCircle, GitCompare, ArrowRight, Zap } from 'lucide-react'
import { Policy } from '@/types'
import { cn, formatCurrency, getCategoryColor, getCategoryLabel, truncate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Card'
import { useCompareStore } from '@/store/compareStore'
import { useCreateQuote } from '@/hooks/usePolicies'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface PolicyCardProps {
  policy: Policy
  index?: number
  showCompare?: boolean
  compact?: boolean
}

export function PolicyCard({ policy, index = 0, showCompare = true, compact = false }: PolicyCardProps) {
  const { togglePolicy, selectedIds, canAdd } = useCompareStore()
  const { mutateAsync: createQuote, isPending: quotingId } = useCreateQuote()
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)

  const isCompared = selectedIds.includes(policy.id)
  const categoryStyle = getCategoryColor(policy.category)

  const handleGetQuote = async () => {
    if (!isAuthenticated) {
      toast('Sign in to get a personalised quote', { icon: '🔐' })
      router.push('/login')
      return
    }
    const quote = await createQuote({ policyId: policy.id })
    if (quote) router.push(`/checkout?quoteId=${quote.id}`)
  }

  const handleCompare = () => {
    if (!isCompared && !canAdd()) {
      toast.error('You can compare up to 4 policies at a time')
      return
    }
    togglePolicy(policy)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative bg-bg-surface rounded-2xl border border-bd-subtle',
        'transition-all duration-300 hover:-translate-y-0.5 hover:border-bd-strong hover:shadow-card-hover group',
        'flex flex-col',
      )}
    >
      {/* Featured glow */}
      {policy.isFeatured && (
        <div className="absolute inset-0 rounded-2xl bg-brand-gradient opacity-[0.03] pointer-events-none" />
      )}

      {/* Card Header */}
      <div className="p-5 pb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Insurer logo placeholder */}
          <div className="w-11 h-11 rounded-xl bg-bg-elevated border border-bd-base flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-tx-secondary">
              {policy.insurer?.name?.[0] || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', categoryStyle)}>
                {getCategoryLabel(policy.category)}
              </span>
              {policy.isFeatured && (
                <span className="flex items-center gap-1 text-xs font-medium text-neon-amber bg-neon-amber/10 border border-neon-amber/20 px-2 py-0.5 rounded-full">
                  <Zap className="w-3 h-3" /> Featured
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-tx-primary leading-snug truncate group-hover:text-brand-400 transition-colors">
              {policy.name}
            </h3>
            <p className="text-xs text-tx-muted mt-0.5">{policy.insurer?.name}</p>
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Star className="w-3.5 h-3.5 text-neon-amber fill-neon-amber" />
          <span className="text-sm font-semibold text-tx-primary">{Number(policy.avgRating)?.toFixed(1)}</span>
          <span className="text-xs text-tx-muted">({Number(policy.totalReviews)?.toLocaleString()})</span>
        </div>
      </div>

      {/* Premium */}
      <div className="px-5 pb-4">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-display font-bold text-tx-primary">
            {formatCurrency(policy.basePremium)}
          </span>
          <span className="text-sm text-tx-muted">/year</span>
        </div>
        {policy.sumAssured && (
          <p className="text-xs text-tx-secondary mt-0.5">
            Cover: <span className="font-semibold text-tx-primary">{formatCurrency(policy.sumAssured)}</span>
          </p>
        )}
      </div>

      {/* Key stats */}
      <div className="px-5 pb-4 grid grid-cols-2 gap-2">
        {policy.cashlessHospitals && (
          <div className="bg-bg-elevated rounded-xl p-2.5 border border-bd-subtle">
            <p className="text-xs text-tx-muted">Cashless Hospitals</p>
            <p className="text-sm font-semibold text-tx-primary">{policy.cashlessHospitals.toLocaleString()}+</p>
          </div>
        )}
        {policy.waitingPeriodDays !== undefined && (
          <div className="bg-bg-elevated rounded-xl p-2.5 border border-bd-subtle">
            <p className="text-xs text-tx-muted">Waiting Period</p>
            <p className="text-sm font-semibold text-tx-primary">
              {policy.waitingPeriodDays === 0 ? 'None' : `${policy.waitingPeriodDays} days`}
            </p>
          </div>
        )}
        {policy.insurer?.claimSettlementRatio && (
          <div className="bg-bg-elevated rounded-xl p-2.5 border border-bd-subtle">
            <p className="text-xs text-tx-muted">Claim Ratio</p>
            <p className="text-sm font-semibold text-neon-green">{policy.insurer.claimSettlementRatio}%</p>
          </div>
        )}
        <div className="bg-bg-elevated rounded-xl p-2.5 border border-bd-subtle">
          <p className="text-xs text-tx-muted">Co-payment</p>
          <p className="text-sm font-semibold text-tx-primary">
            {policy.coPaymentPercent === 0 ? 'None' : `${policy.coPaymentPercent}%`}
          </p>
        </div>
      </div>

      {/* Inclusions */}
      {!compact && policy.inclusions && policy.inclusions.length > 0 && (
        <div className="px-5 pb-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium text-tx-muted hover:text-tx-secondary transition-colors mb-2"
          >
            {expanded ? 'Hide' : 'Show'} coverage details
          </button>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1.5"
            >
              {policy.inclusions.slice(0, 4).map((inc, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neon-green mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-tx-secondary">{inc}</span>
                </div>
              ))}
              {policy.exclusions?.slice(0, 2).map((exc, i) => (
                <div key={i} className="flex items-start gap-2">
                  <XCircle className="w-3.5 h-3.5 text-rose-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-tx-muted">{exc}</span>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="px-5 pb-5 flex gap-2">
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          loading={quotingId}
          onClick={handleGetQuote}
          iconRight={<ArrowRight className="w-3.5 h-3.5" />}
        >
          Get Quote
        </Button>
        {showCompare && (
          <Button
            variant={isCompared ? 'danger' : 'secondary'}
            size="sm"
            onClick={handleCompare}
            icon={<GitCompare className="w-3.5 h-3.5" />}
          >
            {isCompared ? 'Remove' : 'Compare'}
          </Button>
        )}
      </div>
    </motion.div>
  )
}

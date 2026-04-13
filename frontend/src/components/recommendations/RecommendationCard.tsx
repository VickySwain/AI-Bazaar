'use client'
import { motion } from 'framer-motion'
import { Sparkles, ArrowRight, Star, CheckCircle2 } from 'lucide-react'
import { Recommendation } from '@/types'
import { Button } from '@/components/ui/Button'
import { getCategoryColor, getCategoryLabel, formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useCreateQuote } from '@/hooks/usePolicies'

interface RecommendationCardProps {
  recommendation: Recommendation
  index: number
}

export function RecommendationCard({ recommendation, index }: RecommendationCardProps) {
  const { policy, score, reasons, rank } = recommendation
  const router = useRouter()
  const { mutateAsync: createQuote, isPending } = useCreateQuote()

  const handleGetQuote = async () => {
    const quote = await createQuote({ policyId: policy.id })
    if (quote) router.push(`/checkout?quoteId=${quote.id}`)
  }

  const isTop = rank === 1
  const categoryStyle = getCategoryColor(policy.category)

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative rounded-2xl border overflow-hidden flex flex-col',
        'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover',
        isTop
          ? 'bg-gradient-to-br from-brand-400/10 via-bg-surface to-bg-surface border-brand-400/30'
          : 'bg-bg-surface border-bd-subtle',
      )}
    >
      {/* Top pick badge */}
      {isTop && (
        <div className="absolute top-4 right-4 flex items-center gap-1 bg-brand-gradient text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-glow-sm">
          <Sparkles className="w-3 h-3" />
          Top Pick
        </div>
      )}

      {/* Rank */}
      <div className="absolute top-4 left-4 w-7 h-7 rounded-xl bg-bg-elevated border border-bd-base flex items-center justify-center">
        <span className="text-xs font-bold text-tx-muted">#{rank}</span>
      </div>

      <div className="p-5 pt-14">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-bg-elevated border border-bd-base flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-tx-secondary">{policy.insurer?.name?.[0]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', categoryStyle)}>
              {getCategoryLabel(policy.category)}
            </span>
            <h3 className="text-sm font-semibold text-tx-primary mt-1 leading-snug">{policy.name}</h3>
            <p className="text-xs text-tx-muted">{policy.insurer?.name}</p>
          </div>
        </div>

        {/* Score bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-tx-muted">AI Match Score</span>
            <span className="text-xs font-bold text-neon-purple">{Math.round(score)}%</span>
          </div>
          <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(score, 100)}%` }}
              transition={{ duration: 0.8, delay: index * 0.1 + 0.3, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-neon-blue"
            />
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1.5 mb-4">
          <span className="text-xl font-display font-bold text-tx-primary">
            {formatCurrency(policy.basePremium)}
          </span>
          <span className="text-sm text-tx-muted">/year</span>
          <div className="ml-auto flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-neon-amber fill-neon-amber" />
            <span className="text-sm font-medium text-tx-primary">{policy.avgRating?.toFixed(1)}</span>
          </div>
        </div>

        {/* Reasons */}
        {reasons.length > 0 && (
          <div className="space-y-1.5 mb-4">
            {reasons.slice(0, 3).map((reason, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-neon-green mt-0.5 flex-shrink-0" />
                <span className="text-xs text-tx-secondary">{reason}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action */}
        <Button
          fullWidth
          size="sm"
          variant={isTop ? 'primary' : 'secondary'}
          glow={isTop}
          loading={isPending}
          onClick={handleGetQuote}
          iconRight={<ArrowRight className="w-3.5 h-3.5" />}
        >
          Get Quote
        </Button>
      </div>
    </motion.div>
  )
}

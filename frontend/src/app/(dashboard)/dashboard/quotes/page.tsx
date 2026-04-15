'use client'
import { motion } from 'framer-motion'
import { MessageSquare, ArrowRight, Clock, AlertTriangle } from 'lucide-react'
import { useMyQuotes } from '@/hooks/usePolicies'
import { Card, Badge, SkeletonCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate, daysUntil, getCategoryLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Quote } from '@/types'
import Link from 'next/link'

export default function QuotesPage() {
  const { data: quotes, isLoading } = useMyQuotes()

  const activeQuotes  = quotes?.filter((q) => q.status === 'ACTIVE')
  const expiredQuotes = quotes?.filter((q) => q.status !== 'ACTIVE' && q.status !== 'PURCHASED')
  const purchased     = quotes?.filter((q) => q.status === 'PURCHASED')

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-tx-primary mb-1">My Quotes</h1>
        <p className="text-tx-secondary">Saved quotes are valid for 30 days. Complete your purchase before they expire.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : quotes?.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare className="w-12 h-12 text-tx-muted mx-auto mb-4" />
          <h3 className="font-display font-semibold text-xl text-tx-primary mb-2">No quotes yet</h3>
          <p className="text-tx-secondary mb-6">Browse plans and generate a quote to get started.</p>
          <Link href="/policies"><Button>Browse Plans</Button></Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active quotes */}
          {activeQuotes && activeQuotes.length > 0 && (
            <div>
              <h2 className="font-display font-semibold text-tx-primary mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neon-green" />
                Active Quotes ({activeQuotes.length})
              </h2>
              <div className="space-y-3">
                {activeQuotes.map((q, i) => <QuoteCard key={q.id} quote={q} index={i} />)}
              </div>
            </div>
          )}

          {/* Purchased */}
          {purchased && purchased.length > 0 && (
            <div>
              <h2 className="font-display font-semibold text-tx-primary mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-400" />
                Purchased ({purchased.length})
              </h2>
              <div className="space-y-3">
                {purchased.map((q, i) => <QuoteCard key={q.id} quote={q} index={i} />)}
              </div>
            </div>
          )}

          {/* Expired */}
          {expiredQuotes && expiredQuotes.length > 0 && (
            <div>
              <h2 className="font-display font-semibold text-tx-secondary mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-tx-muted" />
                Expired ({expiredQuotes.length})
              </h2>
              <div className="space-y-3 opacity-60">
                {expiredQuotes.map((q, i) => <QuoteCard key={q.id} quote={q} index={i} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function QuoteCard({ quote, index }: { quote: Quote; index: number }) {
  const days = daysUntil(quote.expiresAt)
  const isExpiringSoon = days <= 5 && days > 0 && quote.status === 'ACTIVE'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card hover padding="none">
        <div className="flex items-center gap-4 p-5">
          {/* Policy icon */}
          <div className="w-11 h-11 rounded-xl bg-bg-elevated border border-bd-base flex items-center justify-center flex-shrink-0">
            <span className="text-base font-bold text-tx-secondary">
              {quote.policy?.insurer?.name?.[0] || '?'}
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-sm font-semibold text-tx-primary truncate">{quote.policy?.name}</span>
              <Badge
                variant={
                  quote.status === 'ACTIVE'    ? 'success' :
                  quote.status === 'PURCHASED' ? 'purple'  :
                  quote.status === 'EXPIRED'   ? 'default' : 'warning'
                }
                dot
              >
                {quote.status}
              </Badge>
            </div>
            <p className="text-xs text-tx-muted">
              {getCategoryLabel(quote.policy?.category)} · {quote.policy?.insurer?.name}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-tx-secondary flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {quote.status === 'ACTIVE'
                  ? `Expires ${formatDate(quote.expiresAt)}`
                  : `Expired ${formatDate(quote.expiresAt)}`}
              </span>
              {isExpiringSoon && (
                <span className="text-xs text-neon-amber flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Expires in {days} day{days !== 1 ? 's' : ''}!
                </span>
              )}
            </div>
          </div>

          {/* Premium + action */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-lg font-display font-bold text-tx-primary">{formatCurrency(quote.totalPremium)}</p>
              <p className="text-xs text-tx-muted">/year incl. GST</p>
            </div>
            {quote.status === 'ACTIVE' && (
              <Link href={`/checkout?quoteId=${quote.id}`}>
                <Button size="sm" iconRight={<ArrowRight className="w-3.5 h-3.5" />}>
                  Buy Now
                </Button>
              </Link>
            )}
            {quote.status === 'PURCHASED' && (
              <Link href="/dashboard/policies">
                <Button size="sm" variant="secondary">View Policy</Button>
              </Link>
            )}
            {(quote.status === 'EXPIRED' || quote.status === 'CANCELLED') && (
              <Link href={`/policies`}>
                <Button size="sm" variant="ghost">Re-quote</Button>
              </Link>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

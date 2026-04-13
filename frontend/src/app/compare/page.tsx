'use client'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { GitCompare, CheckCircle2, XCircle, Star, TrendingUp, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useComparePolicies } from '@/hooks/usePolicies'
import { useCompareStore } from '@/store/compareStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatCurrency, getCategoryLabel, getCategoryColor } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ComparisonField } from '@/types'

function formatFieldValue(value: any, format: string): string {
  if (value === null || value === undefined) return '—'
  switch (format) {
    case 'currency': return formatCurrency(Number(value))
    case 'percent':  return `${value}%`
    case 'rating':   return `${Number(value).toFixed(1)} ★`
    default:         return String(value)
  }
}

export default function ComparePage() {
  const searchParams = useSearchParams()
  const { policies, selectedIds } = useCompareStore()
  const { mutate: compare, data: result, isPending, reset } = useComparePolicies()

  useEffect(() => {
    const idsFromUrl = searchParams.get('ids')?.split(',').filter(Boolean) ?? []
    const ids = idsFromUrl.length > 0 ? idsFromUrl : selectedIds
    if (ids.length >= 2) compare({ policyIds: ids })
  }, [])

  return (
    <div className="min-h-screen pt-20 pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
          <div className="inline-flex items-center gap-2 glass border border-bd-base rounded-full px-4 py-2 mb-5">
            <GitCompare className="w-4 h-4 text-brand-400" />
            <span className="text-sm text-tx-secondary">Side-by-Side Comparison</span>
          </div>
          <h1 className="font-display font-bold text-4xl lg:text-5xl text-tx-primary mb-3">
            Compare Plans
          </h1>
          <p className="text-tx-secondary text-lg max-w-xl mx-auto">
            Every metric, side by side. Best values are highlighted automatically.
          </p>
        </motion.div>

        {/* Empty state */}
        {!isPending && !result && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl bg-brand-400/10 border border-brand-400/20 flex items-center justify-center mx-auto mb-6">
              <GitCompare className="w-9 h-9 text-brand-400" />
            </div>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-3">Select plans to compare</h2>
            <p className="text-tx-secondary mb-8">Browse our plans and add up to 4 to compare side by side.</p>
            <Link href="/policies">
              <Button size="lg" iconRight={<ArrowRight className="w-4 h-4" />}>Browse Plans</Button>
            </Link>
          </div>
        )}

        {isPending && (
          <div className="flex items-center justify-center py-20 gap-3">
            <div className="w-6 h-6 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin" />
            <span className="text-tx-secondary">Comparing plans…</span>
          </div>
        )}

        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            {/* Policy Headers */}
            <div
              className="grid gap-4 mb-6"
              style={{ gridTemplateColumns: `200px repeat(${result.policies.length}, 1fr)` }}
            >
              <div />
              {result.policies.map((policy) => (
                <Card key={policy.id} className="text-center" padding="sm">
                  <div className="w-12 h-12 rounded-xl bg-bg-elevated border border-bd-base flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl font-bold text-tx-secondary">{policy.insurer?.name?.[0]}</span>
                  </div>
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', getCategoryColor(policy.category))}>
                    {getCategoryLabel(policy.category)}
                  </span>
                  <h3 className="text-sm font-semibold text-tx-primary mt-2 leading-snug">{policy.name}</h3>
                  <p className="text-xs text-tx-muted mb-3">{policy.insurer?.name}</p>
                  <div className="flex items-center justify-center gap-1 mb-3">
                    <Star className="w-3.5 h-3.5 text-neon-amber fill-neon-amber" />
                    <span className="text-sm font-bold text-tx-primary">{policy.avgRating?.toFixed(1)}</span>
                  </div>
                  <p className="text-xl font-display font-bold text-tx-primary">
                    {formatCurrency(policy.basePremium)}
                    <span className="text-xs font-normal text-tx-muted">/yr</span>
                  </p>
                  <Link href={`/checkout?policyId=${policy.id}`} className="mt-3 block">
                    <Button size="sm" fullWidth iconRight={<ArrowRight className="w-3.5 h-3.5" />}>
                      Get Quote
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>

            {/* Comparison Matrix */}
            <Card padding="none" className="overflow-hidden">
              <div className="p-5 border-b border-bd-subtle flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-400" />
                <h2 className="font-display font-semibold text-tx-primary">Detailed Comparison</h2>
                <span className="text-xs text-tx-muted ml-1">· Best values highlighted in green</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <colgroup>
                    <col style={{ width: '200px' }} />
                    {result.policies.map((p) => <col key={p.id} />)}
                  </colgroup>
                  <tbody className="divide-y divide-bd-subtle">
                    {result.comparisonMatrix.map((field: ComparisonField) => (
                      <tr key={field.key} className="hover:bg-bg-elevated/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-medium text-tx-secondary">{field.label}</span>
                        </td>
                        {field.values.map((v, i) => (
                          <td key={i} className={cn('px-5 py-3.5 text-center', v.isBest && 'bg-neon-green/5')}>
                            <div className="flex items-center justify-center gap-1.5">
                              {v.isBest && <CheckCircle2 className="w-3.5 h-3.5 text-neon-green flex-shrink-0" />}
                              <span className={cn('text-sm font-semibold', v.isBest ? 'text-neon-green' : 'text-tx-primary')}>
                                {formatFieldValue(v.value, field.format)}
                              </span>
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Inclusions comparison */}
            <div className="mt-6 grid gap-4" style={{ gridTemplateColumns: `repeat(${result.policies.length}, 1fr)` }}>
              {result.policies.map((policy) => (
                <Card key={policy.id} padding="sm">
                  <h3 className="text-sm font-semibold text-tx-primary mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-neon-green" />
                    What's covered
                  </h3>
                  <div className="space-y-1.5">
                    {policy.inclusions?.slice(0, 6).map((inc: string, i: number) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-neon-green mt-1.5 flex-shrink-0" />
                        <span className="text-xs text-tx-secondary">{inc}</span>
                      </div>
                    ))}
                  </div>
                  {policy.exclusions && policy.exclusions.length > 0 && (
                    <>
                      <h3 className="text-sm font-semibold text-tx-primary mt-4 mb-2 flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-rose-400" />
                        Exclusions
                      </h3>
                      <div className="space-y-1.5">
                        {policy.exclusions.slice(0, 3).map((exc: string, i: number) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                            <span className="text-xs text-tx-muted">{exc}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </Card>
              ))}
            </div>

            <div className="text-center mt-8">
              <Button variant="secondary" onClick={() => { reset(); window.history.back() }}>
                ← Compare different plans
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

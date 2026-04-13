'use client'
// src/app/recommend/page.tsx  — UPDATED for full ML integration
// Uses useRecommendationFlow() which handles ML + fallback + interaction tracking

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Brain, RefreshCw, AlertTriangle, Zap } from 'lucide-react'
import Link from 'next/link'
import {
  useRecommendationFlow,
  useInsights,
  useMlHealth,
} from '@/hooks/useRecommendations'
import { RecommendationCard } from '@/components/recommendations/RecommendationCard'
import { MlStatusBadge } from '@/components/recommendations/MlStatusBadge'
import { SkeletonCard, Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PolicyCategory } from '@/types'
import { cn, getCategoryLabel, getPriorityColor, getInsightIcon } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

const CATEGORIES: Array<{ value: PolicyCategory | ''; label: string }> = [
  { value: '',        label: 'All Categories' },
  { value: 'HEALTH',  label: 'Health' },
  { value: 'TERM',    label: 'Term Life' },
  { value: 'LIFE',    label: 'Life' },
  { value: 'MOTOR',   label: 'Motor' },
  { value: 'TRAVEL',  label: 'Travel' },
]

export default function RecommendPage() {
  const [category, setCategory] = useState<PolicyCategory | ''>('')
  const { isAuthenticated } = useAuthStore()
  const { data: health } = useMlHealth()
  const { data: insights, isLoading: insightsLoading } = useInsights()

  const {
    recommendations,
    total,
    generatedAt,
    isLoading,
    isFetching,
    isFallback,
    isFromMlModel,
    refetch,
    handleClick,
    handleQuote,
    handlePurchase,
  } = useRecommendationFlow(category || undefined)

  return (
    <div className="min-h-screen pt-20 pb-20">
      {/* Hero */}
      <div className="relative bg-bg-surface border-b border-bd-subtle overflow-hidden py-14 px-4 sm:px-6 mb-8">
        <div className="absolute inset-0 bg-mesh pointer-events-none" />
        <div className="max-w-7xl mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-brand-400/10 border border-brand-400/20 rounded-full px-3 py-1.5 mb-5">
              <Brain className="w-3.5 h-3.5 text-brand-400" />
              <span className="text-xs font-semibold text-brand-400">
                {isFromMlModel ? 'XGBoost ML Model Active' : 'Smart Recommendations'}
              </span>
              {health?.modelLoaded && (
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
              )}
            </div>
            <h1 className="font-display font-bold text-4xl lg:text-5xl text-tx-primary mb-4 leading-tight">
              Plans chosen{' '}
              <span className="text-gradient">just for you</span>
            </h1>
            <p className="text-tx-secondary text-lg leading-relaxed mb-6">
              Our machine learning model analyses your profile across 44 dimensions
              to surface the policies most likely to serve you best.
            </p>

            {/* ML Status */}
            <MlStatusBadge
              isFallback={isFallback}
              modelVersion={recommendations[0]?.modelVersion}
              inferenceMs={undefined}
            />

            {!isAuthenticated && (
              <div className="flex items-center gap-3 p-4 bg-neon-amber/5 border border-neon-amber/20 rounded-2xl mt-4">
                <AlertTriangle className="w-5 h-5 text-neon-amber flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-tx-primary">Sign in for personalised picks</p>
                  <p className="text-xs text-tx-secondary">Currently showing general recommendations.</p>
                </div>
                <Link href="/login" className="ml-auto">
                  <Button size="sm">Sign In</Button>
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Main recommendations */}
          <div className="flex-1">
            {/* Category filter + refresh */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
              {CATEGORIES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setCategory(value as PolicyCategory | '')}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium border whitespace-nowrap transition-all flex-shrink-0',
                    category === value
                      ? 'bg-brand-400/10 text-brand-400 border-brand-400/30'
                      : 'text-tx-secondary border-bd-base hover:border-bd-strong hover:text-tx-primary',
                  )}
                >
                  {label}
                </button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto flex-shrink-0"
                loading={isFetching && !isLoading}
                onClick={() => refetch()}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Refresh
              </Button>
            </div>

            {/* Meta info */}
            {generatedAt && !isLoading && (
              <div className="flex items-center gap-2 mb-5 text-xs text-tx-muted">
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                {total} recommendations · Generated {new Date(generatedAt).toLocaleTimeString()}
                {isFallback && (
                  <Badge variant="warning" className="ml-2">Fallback Mode</Badge>
                )}
              </div>
            )}

            {/* Cards */}
            {isLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-4">🤔</p>
                <p className="text-xl font-display font-semibold text-tx-primary mb-2">No picks yet</p>
                <p className="text-tx-secondary mb-6">Complete your profile for better recommendations.</p>
                <Link href="/profile"><Button>Update Profile</Button></Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {recommendations.map((rec, i) => (
                  <div
                    key={rec.policy.id}
                    onClick={() => handleClick(rec.policy.id, rec.policy.id)}
                  >
                    <RecommendationCard
                      recommendation={{
                        policy: rec.policy as any,
                        score: rec.score * 100,
                        reasons: rec.reasons,
                        rank: rec.rank,
                      }}
                      index={i}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Insights sidebar */}
          <div className="lg:w-72 flex-shrink-0 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-neon-amber" />
              <h2 className="font-display font-semibold text-tx-primary">Your Insights</h2>
            </div>

            {/* ML health mini-card */}
            {health && (
              <Card padding="sm" className="border-bd-subtle">
                <p className="text-xs font-semibold text-tx-muted uppercase tracking-widest mb-2">ML Status</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-tx-secondary">Model</span>
                  <span className={health.modelLoaded ? 'text-neon-green' : 'text-neon-amber'}>
                    {health.modelLoaded ? '✓ Loaded' : '⚠ Fallback'}
                  </span>
                </div>
                {health.modelVersion && (
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-tx-secondary">Version</span>
                    <span className="font-mono text-tx-muted">{health.modelVersion}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-tx-secondary">Circuit</span>
                  <span className={cn(
                    health.circuitBreaker === 'CLOSED' ? 'text-neon-green' :
                    health.circuitBreaker === 'OPEN' ? 'text-rose-400' : 'text-neon-amber',
                  )}>
                    {health.circuitBreaker}
                  </span>
                </div>
              </Card>
            )}

            {/* Insight cards */}
            {insightsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 shimmer rounded-2xl" />
              ))
            ) : insights?.length === 0 ? (
              <Card>
                <p className="text-sm text-tx-secondary text-center py-4">
                  Complete your profile to see personalised insights.
                </p>
              </Card>
            ) : (
              insights?.map((insight, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card hover className="cursor-default">
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">{getInsightIcon(insight.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            'text-xs font-medium px-2 py-0.5 rounded-full border',
                            getPriorityColor(insight.priority),
                          )}>
                            {insight.priority}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-tx-primary mb-1">{insight.title}</p>
                        <p className="text-xs text-tx-secondary leading-relaxed">{insight.description}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

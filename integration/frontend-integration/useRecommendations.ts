// src/hooks/useRecommendations.ts
// Full integration hook connecting Next.js → NestJS → FastAPI ML service.
// Handles loading states, fallback detection, and interaction tracking.

'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api, extractData } from '@/lib/api'
import { Recommendation, Insight } from '@/types'
import { PolicyCategory } from '@/types'

// ── Response types matching NestJS API ────────────────────────────────────
export interface RecommendationResult {
  policy: {
    id: string
    name: string
    category: string
    insurer?: { name: string }
    basePremium: number
    sumAssured?: number
    avgRating: number
    isFeatured: boolean
    inclusions?: string[]
  }
  score: number
  rank: number
  reasons: string[]
  modelVersion: string
  featureContributions?: Record<string, number>
}

export interface RecommendationsData {
  recommendations: RecommendationResult[]
  total: number
  generatedAt: string
}

export interface MlHealthData {
  status: string
  modelLoaded: boolean
  modelVersion?: string
  circuitBreaker: string
  uptime?: number
}

// ── Main recommendations hook ─────────────────────────────────────────────
export function useRecommendations(params: {
  category?: PolicyCategory
  limit?: number
  enabled?: boolean
} = {}) {
  const { category, limit = 5, enabled = true } = params

  return useQuery({
    queryKey: ['recommendations', { category, limit }],
    queryFn: async () => {
      const searchParams: Record<string, any> = { limit }
      if (category) searchParams.category = category

      const res = await api.get('/recommendations', { params: searchParams })
      return extractData<RecommendationsData>(res)
    },
    enabled,
    staleTime: 30 * 60 * 1000, // 30 min — ML service caches for 1hr
    gcTime: 60 * 60 * 1000,
    retry: (failureCount, error: any) => {
      // Don't retry auth errors
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
  })
}

// ── Insights hook ─────────────────────────────────────────────────────────
export function useInsights() {
  return useQuery({
    queryKey: ['insights'],
    queryFn: async () => {
      const res = await api.get('/recommendations/insights')
      return extractData<{ insights: Insight[] }>(res).insights
    },
    staleTime: 30 * 60 * 1000,
  })
}

// ── ML Service health hook ────────────────────────────────────────────────
export function useMlHealth() {
  return useQuery({
    queryKey: ['ml-health'],
    queryFn: async () => {
      const res = await api.get('/recommendations/ml-health')
      return extractData<MlHealthData>(res)
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000,
  })
}

// ── Track interaction hook ─────────────────────────────────────────────────
export function useTrackRecommendationInteraction() {
  return useMutation({
    mutationFn: async (payload: {
      recommendationId?: string
      policyId?: string
      action: 'click' | 'quote' | 'purchase' | 'dismiss'
    }) => {
      // Fire-and-forget — never surface errors to user
      await api.post('/recommendations/track', payload).catch(() => {})
    },
  })
}

// ── Composite hook: recommendations + interaction tracking ─────────────────
export function useRecommendationFlow(category?: PolicyCategory) {
  const qc = useQueryClient()
  const { data, isLoading, isFetching, refetch, error } = useRecommendations({ category })
  const { mutate: track } = useTrackRecommendationInteraction()

  const handleClick = (recommendationId: string, policyId: string) => {
    track({ recommendationId, policyId, action: 'click' })
  }

  const handleQuote = (recommendationId: string, policyId: string) => {
    track({ recommendationId, policyId, action: 'quote' })
  }

  const handlePurchase = (policyId: string) => {
    track({ policyId, action: 'purchase' })
    // Invalidate cache so next visit gets fresh recommendations
    qc.invalidateQueries({ queryKey: ['recommendations'] })
    qc.invalidateQueries({ queryKey: ['insights'] })
  }

  const isFallback = data?.recommendations?.some(
    (r) => r.modelVersion?.includes('fallback') || r.modelVersion?.includes('rule-based'),
  ) ?? false

  const isFromMlModel = !isFallback && (data?.recommendations?.length ?? 0) > 0

  return {
    recommendations: data?.recommendations ?? [],
    total: data?.total ?? 0,
    generatedAt: data?.generatedAt,
    isLoading,
    isFetching,
    error,
    isFallback,
    isFromMlModel,
    refetch,
    handleClick,
    handleQuote,
    handlePurchase,
  }
}

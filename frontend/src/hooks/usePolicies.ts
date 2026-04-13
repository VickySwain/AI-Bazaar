'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api, extractData } from '@/lib/api'
import { Policy, Quote, FilterPoliciesParams, ComparisonResult, Insurer } from '@/types'

// ── List Policies ──────────────────────────────────────────────────────────
export function usePolicies(params: FilterPoliciesParams = {}) {
  return useQuery({
    queryKey: ['policies', params],
    queryFn: async () => {
      const res = await api.get('/policies', { params })
      return extractData<{ policies: Policy[]; pagination: any }>(res)
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  })
}

// ── Single Policy ──────────────────────────────────────────────────────────
export function usePolicy(id: string | null) {
  return useQuery({
    queryKey: ['policy', id],
    queryFn: async () => {
      const res = await api.get(`/policies/${id}`)
      return extractData<{ policy: Policy }>(res).policy
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  })
}

// ── Featured Policies ──────────────────────────────────────────────────────
export function useFeaturedPolicies(limit = 6) {
  return useQuery({
    queryKey: ['policies', 'featured', limit],
    queryFn: async () => {
      const res = await api.get('/policies', { params: { isFeatured: true, limit, sortBy: 'popularityScore' } })
      return extractData<{ policies: Policy[] }>(res).policies
    },
    staleTime: 10 * 60 * 1000,
  })
}

// ── Policy Categories ──────────────────────────────────────────────────────
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/policies/categories')
      return extractData<{ categories: Array<{ value: string; label: string }> }>(res).categories
    },
    staleTime: Infinity,
  })
}

// ── Insurers ───────────────────────────────────────────────────────────────
export function useInsurers() {
  return useQuery({
    queryKey: ['insurers'],
    queryFn: async () => {
      const res = await api.get('/policies/insurers')
      return extractData<{ insurers: Insurer[] }>(res).insurers
    },
    staleTime: Infinity,
  })
}

// ── Compare Policies ───────────────────────────────────────────────────────
export function useComparePolicies() {
  return useMutation({
    mutationFn: async (payload: { policyIds: string[]; age?: number; sumAssured?: number }) => {
      const res = await api.post('/policies/compare', payload)
      return extractData<ComparisonResult>(res)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Comparison failed')
    },
  })
}

// ── Create Quote ───────────────────────────────────────────────────────────
export function useCreateQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { policyId: string; age?: number; sumAssured?: number; policyTerm?: number }) => {
      const res = await api.post('/policies/quote', payload)
      return extractData<{ quote: Quote }>(res).quote
    },
    onSuccess: (quote) => {
      qc.invalidateQueries({ queryKey: ['my-quotes'] })
      toast.success('Quote generated!')
      return quote
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to generate quote')
    },
  })
}

// ── My Quotes ──────────────────────────────────────────────────────────────
export function useMyQuotes() {
  return useQuery({
    queryKey: ['my-quotes'],
    queryFn: async () => {
      const res = await api.get('/users/quotes')
      return extractData<{ quotes: Quote[] }>(res).quotes
    },
  })
}

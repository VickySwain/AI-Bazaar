'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api, extractData } from '@/lib/api'
import { DashboardData, Purchase, UserProfile, RazorpayOrder, Recommendation, Insight } from '@/types'

// ── Dashboard ──────────────────────────────────────────────────────────────
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/users/dashboard')
      return extractData<DashboardData>(res)
    },
    staleTime: 2 * 60 * 1000,
  })
}

// ── My Policies ────────────────────────────────────────────────────────────
export function useMyPolicies() {
  return useQuery({
    queryKey: ['my-policies'],
    queryFn: async () => {
      const res = await api.get('/users/policies')
      return extractData<{ policies: Purchase[] }>(res).policies
    },
  })
}

// ── Update Profile ─────────────────────────────────────────────────────────
export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<UserProfile> & { fullName?: string; phone?: string }) => {
      const res = await api.put('/users/profile', payload)
      return extractData<{ user: any }>(res).user
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Profile updated!')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Update failed')
    },
  })
}

// ── Submit KYC ─────────────────────────────────────────────────────────────
export function useSubmitKyc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { documentType: string; documentNumber: string }) => {
      const res = await api.post('/users/kyc', payload)
      return extractData(res)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] })
      toast.success('KYC submitted successfully!')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'KYC submission failed')
    },
  })
}

// ── Create Payment Order ───────────────────────────────────────────────────
export function useCreateOrder() {
  return useMutation({
    mutationFn: async (payload: { quoteId: string; insuredDetails?: any; nomineeDetails?: any }) => {
      const res = await api.post('/payments/order', payload)
      return extractData<RazorpayOrder>(res)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create payment order')
    },
  })
}

// ── Verify Payment ─────────────────────────────────────────────────────────
export function useVerifyPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      razorpayOrderId: string
      razorpayPaymentId: string
      razorpaySignature: string
    }) => {
      const res = await api.post('/payments/verify', payload)
      return extractData(res)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-policies'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Payment successful! Your policy is now active. 🎉')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Payment verification failed')
    },
  })
}

// ── Payment History ────────────────────────────────────────────────────────
export function usePaymentHistory(page = 1) {
  return useQuery({
    queryKey: ['payment-history', page],
    queryFn: async () => {
      const res = await api.get('/payments/history', { params: { page, limit: 10 } })
      return extractData(res)
    },
  })
}

// ── Recommendations ────────────────────────────────────────────────────────
export function useRecommendations(params: { category?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ['recommendations', params],
    queryFn: async () => {
      const res = await api.get('/recommendations', { params })
      return extractData<{ recommendations: Recommendation[]; modelVersion: string; generatedAt: string }>(res)
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}

// ── Insights ───────────────────────────────────────────────────────────────
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

// ── Track Recommendation Interaction ──────────────────────────────────────
export function useTrackInteraction() {
  return useMutation({
    mutationFn: async (payload: { recommendationId: string; action: 'click' | 'quote' | 'purchase' }) => {
      await api.post('/recommendations/track', payload)
    },
  })
}

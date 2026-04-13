'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { api, extractData } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { AuthUser, AuthTokens } from '@/types'

interface LoginPayload   { email: string; password: string }
interface RegisterPayload { email: string; fullName: string; password: string; phone?: string }
interface ForgotPayload  { email: string }
interface ResetPayload   { token: string; password: string }
interface ChangePayload  { currentPassword: string; newPassword: string }

interface AuthResult {
  user: AuthUser
  tokens: AuthTokens
}

// ── Register ───────────────────────────────────────────────────────────────
export function useRegister() {
  const { setTokensAndUser } = useAuthStore()
  const router = useRouter()

  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const res = await api.post('/auth/register', payload)
      console.log('RAW RESPONSE:', JSON.stringify(res.data, null, 2))
      return extractData<AuthResult>(res)
    },
    onSuccess: (data) => {
      setTokensAndUser(data.user, data.tokens.accessToken, data.tokens.refreshToken)
      toast.success('Welcome to CoverAI! 🎉')
      router.push('/dashboard')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Registration failed')
    },
  })
}

// ── Login ──────────────────────────────────────────────────────────────────
export function useLogin() {
  const { setTokensAndUser } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const res = await api.post('/auth/login', payload)
      return extractData<AuthResult>(res)
    },
    onSuccess: (data) => {
      setTokensAndUser(data.user, data.tokens.accessToken, data.tokens.refreshToken)
      qc.invalidateQueries({ queryKey: ['me'] })
      toast.success(`Welcome back, ${data.user.fullName.split(' ')[0]}!`)
      router.push('/dashboard')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Invalid credentials')
    },
  })
}

// ── Logout ─────────────────────────────────────────────────────────────────
export function useLogout() {
  const { logout } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      logout()
      qc.clear()
      toast.success('Logged out successfully')
      router.push('/')
    },
  })
}

// ── Current User ───────────────────────────────────────────────────────────
export function useMe() {
  const { setUser, isAuthenticated } = useAuthStore()

  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me')
      const user = extractData<{ user: AuthUser }>(res).user
      setUser(user)
      return user
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 min
    retry: false,
  })
}

// ── Forgot Password ────────────────────────────────────────────────────────
export function useForgotPassword() {
  return useMutation({
    mutationFn: async (payload: ForgotPayload) => {
      await api.post('/auth/forgot-password', payload)
    },
    onSuccess: () => {
      toast.success('Reset link sent! Check your email.')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Something went wrong')
    },
  })
}

// ── Reset Password ─────────────────────────────────────────────────────────
export function useResetPassword() {
  const router = useRouter()
  return useMutation({
    mutationFn: async (payload: ResetPayload) => {
      await api.post('/auth/reset-password', payload)
    },
    onSuccess: () => {
      toast.success('Password reset! Please login.')
      router.push('/login')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Invalid or expired token')
    },
  })
}

// ── Change Password ────────────────────────────────────────────────────────
export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: ChangePayload) => {
      await api.post('/auth/change-password', payload)
    },
    onSuccess: () => toast.success('Password changed successfully'),
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to change password')
    },
  })
}

// ── Verify Email ───────────────────────────────────────────────────────────
export function useVerifyEmail() {
  return useMutation({
    mutationFn: async (token: string) => {
      await api.post('/auth/verify-email', { token })
    },
    onSuccess: () => toast.success('Email verified successfully!'),
    onError: () => toast.error('Invalid or expired verification link'),
  })
}

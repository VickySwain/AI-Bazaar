'use client'
import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setTokensAndUser } = useAuthStore()

  useEffect(() => {
    const accessToken = searchParams.get('accessToken')
    const refreshToken = searchParams.get('refreshToken')

    if (accessToken) {
      fetch('${process.env.NEXT_PUBLIC_API_URL || `https://ai-bazaar-production.up.railway.app/api/v1`}/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data?.data?.user?.id || data?.id) {
          setTokensAndUser(data?.data?.user || data, accessToken, refreshToken || '')
          router.push('/dashboard')
        } else {
          router.push('/login?error=oauth_failed')
        }
      })
      .catch(() => router.push('/login?error=oauth_failed'))
    } else {
      router.push('/login?error=no_token')
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-tx-secondary">Signing you in...</p>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}

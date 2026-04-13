import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import Cookies from 'js-cookie'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

// ── Axios Instance ─────────────────────────────────────────────────────────
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request Interceptor — attach token ─────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = Cookies.get('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ── Response Interceptor — auto token refresh ──────────────────────────────
let isRefreshing = false
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = Cookies.get('refreshToken')
      if (!refreshToken) {
        isRefreshing = false
        clearTokens()
        if (typeof window !== 'undefined') window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken })
        const tokens = data?.data?.tokens || data?.tokens
        const accessToken = tokens?.accessToken
        const newRefresh = tokens?.refreshToken

        setTokens(accessToken, newRefresh)
        processQueue(null, accessToken)
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearTokens()
        if (typeof window !== 'undefined') window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

// ── Token helpers ──────────────────────────────────────────────────────────
export const setTokens = (accessToken: string, refreshToken: string) => {
  Cookies.set('accessToken', accessToken, { expires: 1 / 96, sameSite: 'lax' })
  Cookies.set('refreshToken', refreshToken, { expires: 7, sameSite: 'lax' })
}

export const clearTokens = () => {
  Cookies.remove('accessToken')
  Cookies.remove('refreshToken')
}

export const getAccessToken = () => Cookies.get('accessToken')
export const getRefreshToken = () => Cookies.get('refreshToken')

// ── API helpers ────────────────────────────────────────────────────────────
export const extractData = <T>(response: any): T => {
  const d = response.data
  if (d?.success && d?.data) return d.data
  if (d?.data) return d.data
  return d
}

export const extractMessage = (response: any): string =>
  response.data?.message || 'Success'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { AuthUser } from '@/types'
import { clearTokens, setTokens } from '@/lib/api'

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean

  setUser: (user: AuthUser) => void
  setTokensAndUser: (user: AuthUser, accessToken: string, refreshToken: string) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  updateUser: (partial: Partial<AuthUser>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),

      setTokensAndUser: (user, accessToken, refreshToken) => {
        setTokens(accessToken, refreshToken)
        set({ user, isAuthenticated: true, isLoading: false })
      },

      logout: () => {
        clearTokens()
        set({ user: null, isAuthenticated: false, isLoading: false })
      },

      setLoading: (isLoading) => set({ isLoading }),

      updateUser: (partial) => {
        const current = get().user
        if (current) set({ user: { ...current, ...partial } })
      },
    }),
    {
      name: 'coverai-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setLoading(false)
      },
    },
  ),
)

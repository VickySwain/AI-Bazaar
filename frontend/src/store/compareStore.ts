import { create } from 'zustand'
import { Policy } from '@/types'

interface CompareState {
  selectedIds: string[]
  policies: Policy[]

  addPolicy: (policy: Policy) => void
  removePolicy: (id: string) => void
  togglePolicy: (policy: Policy) => void
  clearAll: () => void
  canAdd: () => boolean
}

export const useCompareStore = create<CompareState>()((set, get) => ({
  selectedIds: [],
  policies: [],

  addPolicy: (policy) => {
    const { selectedIds, policies } = get()
    if (selectedIds.length >= 4 || selectedIds.includes(policy.id)) return
    set({ selectedIds: [...selectedIds, policy.id], policies: [...policies, policy] })
  },

  removePolicy: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.filter((i) => i !== id),
      policies: state.policies.filter((p) => p.id !== id),
    })),

  togglePolicy: (policy) => {
    const { selectedIds } = get()
    if (selectedIds.includes(policy.id)) get().removePolicy(policy.id)
    else get().addPolicy(policy)
  },

  clearAll: () => set({ selectedIds: [], policies: [] }),

  canAdd: () => get().selectedIds.length < 4,
}))

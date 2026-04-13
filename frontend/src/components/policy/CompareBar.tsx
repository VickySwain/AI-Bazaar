'use client'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { GitCompare, X, ArrowRight } from 'lucide-react'
import { useCompareStore } from '@/store/compareStore'
import { Button } from '@/components/ui/Button'

export function CompareBar() {
  const router = useRouter()
  const { policies, selectedIds, removePolicy, clearAll } = useCompareStore()

  if (selectedIds.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
      >
        <div className="glass-strong border border-bd-strong rounded-2xl shadow-dialog px-5 py-4 flex items-center gap-4">
          {/* Count */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow-sm">
              <GitCompare className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-tx-primary">{selectedIds.length} selected</p>
              <p className="text-xs text-tx-muted">Up to 4 policies</p>
            </div>
          </div>

          {/* Policy pills */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="flex items-center gap-1.5 bg-bg-elevated border border-bd-base rounded-xl px-2.5 py-1.5 flex-shrink-0"
              >
                <span className="text-xs text-tx-primary font-medium max-w-[100px] truncate">
                  {policy.name}
                </span>
                <button
                  onClick={() => removePolicy(policy.id)}
                  className="text-tx-muted hover:text-rose-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={clearAll}
              className="text-xs text-tx-muted hover:text-tx-secondary transition-colors px-2"
            >
              Clear
            </button>
            <Button
              size="sm"
              onClick={() => router.push(`/compare?ids=${selectedIds.join(',')}`)}
              disabled={selectedIds.length < 2}
              iconRight={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Compare Now
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

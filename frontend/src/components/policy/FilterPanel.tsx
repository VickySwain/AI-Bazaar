'use client'
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { FilterPoliciesParams, PolicyCategory } from '@/types'
import { Button } from '@/components/ui/Button'
import { cn, getCategoryLabel } from '@/lib/utils'

interface FilterPanelProps {
  filters: FilterPoliciesParams
  onChange: (filters: FilterPoliciesParams) => void
  onReset: () => void
  className?: string
}

const CATEGORIES: PolicyCategory[] = ['HEALTH', 'LIFE', 'TERM', 'MOTOR', 'TRAVEL', 'HOME']

const PREMIUM_RANGES = [
  { label: 'Under ₹5K', min: 0,    max: 5000  },
  { label: '₹5K–₹15K', min: 5000, max: 15000 },
  { label: '₹15K–₹30K',min: 15000,max: 30000 },
  { label: 'Above ₹30K',min: 30000,max: undefined },
]

const SUM_ASSURED_RANGES = [
  { label: '₹5L–₹25L',  min: 500000,   max: 2500000  },
  { label: '₹25L–₹1Cr', min: 2500000,  max: 10000000 },
  { label: 'Above ₹1Cr', min: 10000000, max: undefined },
]

const SORT_OPTIONS = [
  { value: 'popularityScore', label: 'Most Popular' },
  { value: 'basePremium:ASC', label: 'Price: Low to High' },
  { value: 'basePremium:DESC',label: 'Price: High to Low' },
  { value: 'avgRating',       label: 'Highest Rated' },
  { value: 'sumAssured',      label: 'Cover Amount' },
]

export function FilterPanel({ filters, onChange, onReset, className }: FilterPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const setFilter = useCallback(
    <K extends keyof FilterPoliciesParams>(key: K, value: FilterPoliciesParams[K]) => {
      onChange({ ...filters, [key]: value, page: 1 })
    },
    [filters, onChange],
  )

  const toggleCategory = (cat: PolicyCategory) => {
    setFilter('category', filters.category === cat ? undefined : cat)
  }

  const setPremiumRange = (min?: number, max?: number) => {
    onChange({ ...filters, minPremium: min, maxPremium: max, page: 1 })
  }

  const setSortOption = (val: string) => {
    const [field, order] = val.split(':')
    onChange({ ...filters, sortBy: field, sortOrder: (order as 'ASC' | 'DESC') || 'DESC', page: 1 })
  }

  const activeFiltersCount = [
    filters.category,
    filters.minPremium || filters.maxPremium,
    filters.minSumAssured || filters.maxSumAssured,
    filters.sortBy && filters.sortBy !== 'popularityScore',
  ].filter(Boolean).length

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Sort */}
      <div>
        <h3 className="text-xs font-semibold text-tx-muted uppercase tracking-widest mb-3">Sort By</h3>
        <div className="space-y-1">
          {SORT_OPTIONS.map((opt) => {
            const [field, order] = opt.value.split(':')
            const isActive = filters.sortBy === field && (order ? filters.sortOrder === order : true)
            return (
              <button
                key={opt.value}
                onClick={() => setSortOption(opt.value)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-xl text-sm transition-all',
                  isActive
                    ? 'bg-brand-400/10 text-brand-400 font-medium border border-brand-400/20'
                    : 'text-tx-secondary hover:text-tx-primary hover:bg-bg-elevated',
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Category */}
      <div>
        <h3 className="text-xs font-semibold text-tx-muted uppercase tracking-widest mb-3">Category</h3>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                filters.category === cat
                  ? 'bg-brand-400/10 text-brand-400 border-brand-400/30'
                  : 'text-tx-secondary border-bd-base hover:border-bd-strong hover:text-tx-primary',
              )}
            >
              {getCategoryLabel(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Premium Range */}
      <div>
        <h3 className="text-xs font-semibold text-tx-muted uppercase tracking-widest mb-3">Annual Premium</h3>
        <div className="space-y-1">
          {PREMIUM_RANGES.map((range) => {
            const isActive = filters.minPremium === range.min && filters.maxPremium === range.max
            return (
              <button
                key={range.label}
                onClick={() => isActive ? setPremiumRange() : setPremiumRange(range.min, range.max)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-xl text-sm transition-all',
                  isActive
                    ? 'bg-brand-400/10 text-brand-400 font-medium border border-brand-400/20'
                    : 'text-tx-secondary hover:text-tx-primary hover:bg-bg-elevated',
                )}
              >
                {range.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sum Assured */}
      <div>
        <h3 className="text-xs font-semibold text-tx-muted uppercase tracking-widest mb-3">Cover Amount</h3>
        <div className="space-y-1">
          {SUM_ASSURED_RANGES.map((range) => {
            const isActive = filters.minSumAssured === range.min && filters.maxSumAssured === range.max
            return (
              <button
                key={range.label}
                onClick={() => isActive
                  ? onChange({ ...filters, minSumAssured: undefined, maxSumAssured: undefined, page: 1 })
                  : onChange({ ...filters, minSumAssured: range.min, maxSumAssured: range.max, page: 1 })}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-xl text-sm transition-all',
                  isActive
                    ? 'bg-brand-400/10 text-brand-400 font-medium border border-brand-400/20'
                    : 'text-tx-secondary hover:text-tx-primary hover:bg-bg-elevated',
                )}
              >
                {range.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Reset */}
      {activeFiltersCount > 0 && (
        <Button variant="ghost" size="sm" fullWidth onClick={onReset} icon={<X className="w-4 h-4" />}>
          Reset Filters ({activeFiltersCount})
        </Button>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <div className={cn('hidden lg:block', className)}>
        <FilterContent />
      </div>

      {/* Mobile trigger */}
      <div className="lg:hidden">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setMobileOpen(true)}
          icon={<SlidersHorizontal className="w-4 h-4" />}
        >
          Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </Button>

        <AnimatePresence>
          {mobileOpen && (
            <div className="fixed inset-0 z-50 flex">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-bg-base/80 backdrop-blur-sm"
                onClick={() => setMobileOpen(false)}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="relative ml-auto w-80 h-full bg-bg-surface border-l border-bd-base overflow-y-auto p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display font-semibold text-tx-primary">Filters</h2>
                  <button onClick={() => setMobileOpen(false)} className="text-tx-muted hover:text-tx-primary">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <FilterContent />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

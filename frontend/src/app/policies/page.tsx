'use client'
import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Search, LayoutGrid, List } from 'lucide-react'
import { usePolicies } from '@/hooks/usePolicies'
import { FilterPoliciesParams } from '@/types'
import { PolicyCard } from '@/components/policy/PolicyCard'
import { FilterPanel } from '@/components/policy/FilterPanel'
import { CompareBar } from '@/components/policy/CompareBar'
import { SkeletonCard } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const DEFAULT_FILTERS: FilterPoliciesParams = { page: 1, limit: 12, sortBy: 'popularityScore', sortOrder: 'DESC' }

export default function PoliciesPage() {
  const [filters, setFilters] = useState<FilterPoliciesParams>(DEFAULT_FILTERS)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { data, isLoading, isFetching } = usePolicies({ ...filters, search: search || undefined })

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters((f) => ({ ...f, page: 1 }))
  }

  const handleFiltersChange = useCallback((newFilters: FilterPoliciesParams) => {
    setFilters(newFilters)
  }, [])

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS)
    setSearch('')
  }

  return (
    <div className="min-h-screen pt-20 pb-20">
      {/* Page header */}
      <div className="bg-bg-surface border-b border-bd-subtle py-10 px-4 sm:px-6 mb-8">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display font-bold text-3xl lg:text-4xl text-tx-primary mb-2">
              Find Your Perfect Plan
            </h1>
            <p className="text-tx-secondary mb-6">
              {data?.pagination.total ?? '500'}+ policies from {50}+ trusted insurers
            </p>

            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex gap-3 max-w-lg">
              <Input
                placeholder="Search plans, insurers..."
                leftIcon={<Search className="w-4 h-4" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                containerClassName="flex-1"
              />
              <Button type="submit" variant="secondary">Search</Button>
            </form>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex gap-8">
          {/* Sidebar Filters - Desktop only */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <FilterPanel filters={filters} onChange={handleFiltersChange} onReset={handleReset} />
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                {!isLoading && (
                  <span className="text-sm text-tx-muted">
                    {data?.pagination.total ?? 0} plans found
                    {isFetching && !isLoading && ' · Updating…'}
                  </span>
                )}
              </div>
              <div className="hidden sm:flex border border-bd-base rounded-xl overflow-hidden">
                {(['grid', 'list'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      'p-2.5 transition-colors',
                      viewMode === mode ? 'bg-brand-400/10 text-brand-400' : 'text-tx-muted hover:text-tx-secondary',
                    )}
                  >
                    {mode === 'grid' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            {isLoading ? (
              <div className={cn('grid gap-5', viewMode === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1')}>
                {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : data?.policies.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-4">🔍</p>
                <p className="text-xl font-display font-semibold text-tx-primary mb-2">No plans found</p>
                <p className="text-tx-secondary mb-6">Try adjusting your filters or search term.</p>
                <Button variant="secondary" onClick={handleReset}>Reset Filters</Button>
              </div>
            ) : (
              <div className={cn('grid gap-5', viewMode === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1')}>
                {data?.policies.map((policy, i) => (
                  <PolicyCard key={policy.id} policy={policy} index={i} compact={viewMode === 'list'} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <Button
                  variant="secondary" size="sm"
                  disabled={filters.page === 1}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}
                >
                  Previous
                </Button>
                {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => Math.abs(p - (filters.page || 1)) <= 2)
                  .map((p) => (
                    <Button
                      key={p}
                      variant={p === filters.page ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setFilters((f) => ({ ...f, page: p }))}
                    >
                      {p}
                    </Button>
                  ))}
                <Button
                  variant="secondary" size="sm"
                  disabled={filters.page === data.pagination.totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <CompareBar />
    </div>
  )
}
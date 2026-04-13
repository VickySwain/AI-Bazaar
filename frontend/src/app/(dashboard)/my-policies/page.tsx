'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, FileText, Download, RefreshCw, Search, Calendar } from 'lucide-react'
import { useMyPolicies } from '@/hooks/useUser'
import { Card, Badge, SkeletonCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency, formatDate, daysUntil, getStatusColor, getCategoryLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Purchase } from '@/types'
import Link from 'next/link'

export default function MyPoliciesPage() {
  const { data: policies, isLoading, refetch } = useMyPolicies()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const filtered = policies?.filter((p) => {
    const matchSearch =
      !search ||
      p.policy?.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.policyNumber?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl text-tx-primary mb-1">My Policies</h1>
          <p className="text-tx-secondary">All your active and past insurance policies in one place.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} icon={<RefreshCw className="w-4 h-4" />}>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          placeholder="Search by name or policy number…"
          leftIcon={<Search className="w-4 h-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          containerClassName="flex-1"
        />
        <div className="flex gap-2">
          {['ALL', 'ACTIVE', 'PENDING', 'EXPIRED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-medium border transition-all',
                statusFilter === s
                  ? 'bg-brand-400/10 text-brand-400 border-brand-400/30'
                  : 'text-tx-secondary border-bd-base hover:border-bd-strong',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-tx-muted mx-auto mb-4" />
          <h3 className="font-display font-semibold text-xl text-tx-primary mb-2">
            {search || statusFilter !== 'ALL' ? 'No matching policies' : 'No policies yet'}
          </h3>
          <p className="text-tx-secondary mb-6">
            {search || statusFilter !== 'ALL'
              ? 'Try clearing your filters.'
              : 'Browse our plans and protect what matters most.'}
          </p>
          <Link href="/policies">
            <Button>Browse Insurance Plans</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered?.map((purchase, i) => (
            <PolicyRow key={purchase.id} purchase={purchase} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

function PolicyRow({ purchase, index }: { purchase: Purchase; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const days = purchase.expiresAt ? daysUntil(purchase.expiresAt) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      <Card hover padding="none" className="overflow-hidden">
        <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
          <div className="flex items-center gap-4 p-5">
            {/* Icon */}
            <div className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
              purchase.status === 'ACTIVE' ? 'bg-brand-400/10 border border-brand-400/20' : 'bg-bg-elevated border border-bd-base',
            )}>
              <Shield className={cn('w-5 h-5', purchase.status === 'ACTIVE' ? 'text-brand-400' : 'text-tx-muted')} />
            </div>

            {/* Main info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-tx-primary truncate">
                  {purchase.policy?.name}
                </h3>
                <Badge
                  className={cn('text-xs border', getStatusColor(purchase.status))}
                  variant="custom"
                  dot
                >
                  {purchase.status}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-tx-muted">
                  {getCategoryLabel(purchase.policy?.category)} · {purchase.policy?.insurer?.name}
                </span>
                {purchase.policyNumber && (
                  <span className="text-xs font-mono text-tx-muted">{purchase.policyNumber}</span>
                )}
              </div>
            </div>

            {/* Right info */}
            <div className="text-right flex-shrink-0 hidden sm:block">
              <p className="text-sm font-semibold text-tx-primary">{formatCurrency(purchase.premiumPaid)}</p>
              <p className="text-xs text-tx-muted">Annual premium</p>
              {days !== null && purchase.status === 'ACTIVE' && (
                <p className={cn('text-xs mt-1', days <= 30 ? 'text-rose-400 font-medium' : 'text-tx-muted')}>
                  {days > 0 ? `Expires in ${days} days` : 'Expired'}
                </p>
              )}
            </div>
          </div>
        </button>

        {/* Expanded */}
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-bd-subtle"
          >
            <div className="p-5 grid sm:grid-cols-3 gap-4">
              {[
                { label: 'Sum Assured',   value: purchase.sumAssured ? formatCurrency(purchase.sumAssured) : '—' },
                { label: 'Activated On',  value: purchase.activatedAt ? formatDate(purchase.activatedAt) : '—' },
                { label: 'Valid Until',   value: purchase.expiresAt ? formatDate(purchase.expiresAt) : '—' },
                { label: 'Next Renewal',  value: purchase.nextRenewalAt ? formatDate(purchase.nextRenewalAt) : '—' },
                { label: 'Premium Paid',  value: formatCurrency(purchase.premiumPaid) },
                { label: 'Policy No.',    value: purchase.policyNumber || 'Pending' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-bg-elevated rounded-xl p-3 border border-bd-subtle">
                  <p className="text-xs text-tx-muted mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-tx-primary">{value}</p>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5 flex gap-2">
              {purchase.documentUrl && (
                <a href={purchase.documentUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />}>
                    Download Policy
                  </Button>
                </a>
              )}
              {purchase.status === 'ACTIVE' && (
                <Button variant="ghost" size="sm" icon={<Calendar className="w-3.5 h-3.5" />}>
                  Renew Early
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </Card>
    </motion.div>
  )
}

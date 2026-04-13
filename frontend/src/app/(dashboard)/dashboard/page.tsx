'use client'
import { motion } from 'framer-motion'
import { Shield, TrendingUp, AlertTriangle, DollarSign, ArrowRight, Calendar, FileText } from 'lucide-react'
import Link from 'next/link'
import { useDashboard } from '@/hooks/useUser'
import { useAuthStore } from '@/store/authStore'
import { StatCard, Card, SkeletonCard, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate, daysUntil, getStatusColor, getCategoryLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data, isLoading } = useDashboard()

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display font-bold text-3xl text-tx-primary">
          {greeting()}, {user?.fullName?.split(' ')[0]} 👋
        </h1>
        <p className="text-tx-secondary mt-1">Here's your insurance overview for today.</p>
      </motion.div>

      {/* Stats grid */}
      <motion.div variants={container} initial="hidden" animate="visible" className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <motion.div variants={item}>
              <StatCard
                label="Active Policies"
                value={data?.stats.activePolicies ?? 0}
                change={`${data?.stats.totalPolicies ?? 0} total`}
                changeType="neutral"
                icon={<Shield className="w-4 h-4" />}
              />
            </motion.div>
            <motion.div variants={item}>
              <StatCard
                label="Total Premium Paid"
                value={formatCurrency(data?.stats.totalPremiumPaid ?? 0)}
                changeType="positive"
                icon={<DollarSign className="w-4 h-4" />}
              />
            </motion.div>
            <motion.div variants={item}>
              <StatCard
                label="Expiring Soon"
                value={data?.stats.expiringSoon ?? 0}
                change={data?.stats.expiringSoon ? 'Action needed' : 'All good'}
                changeType={data?.stats.expiringSoon ? 'negative' : 'positive'}
                icon={<AlertTriangle className="w-4 h-4" />}
              />
            </motion.div>
            <motion.div variants={item}>
              <StatCard
                label="Coverage Score"
                value="78/100"
                change="+5 this month"
                changeType="positive"
                icon={<TrendingUp className="w-4 h-4" />}
              />
            </motion.div>
          </>
        )}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Policies */}
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="flex items-center justify-between p-5 border-b border-bd-subtle">
              <h2 className="font-display font-semibold text-tx-primary">My Policies</h2>
              <Link href="/dashboard/policies">
                <Button variant="ghost" size="sm" iconRight={<ArrowRight className="w-3.5 h-3.5" />}>
                  View all
                </Button>
              </Link>
            </div>
            <div className="divide-y divide-bd-subtle">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 shimmer rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 shimmer rounded w-3/4" />
                      <div className="h-3 shimmer rounded w-1/2" />
                    </div>
                  </div>
                ))
              ) : data?.recentPolicies.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="w-10 h-10 text-tx-muted mx-auto mb-3" />
                  <p className="text-tx-secondary text-sm mb-3">No policies yet</p>
                  <Link href="/policies">
                    <Button size="sm">Browse Plans</Button>
                  </Link>
                </div>
              ) : (
                data?.recentPolicies.map((purchase, i) => {
                  const days = purchase.expiresAt ? daysUntil(purchase.expiresAt) : null
                  return (
                    <motion.div
                      key={purchase.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-4 p-4 hover:bg-bg-elevated transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-brand-400/10 border border-brand-400/20 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-4 h-4 text-brand-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-tx-primary truncate">
                          {purchase.policy?.name}
                        </p>
                        <p className="text-xs text-tx-muted">
                          {purchase.policyNumber || 'Pending'} · {getCategoryLabel(purchase.policy?.category)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant={purchase.status === 'ACTIVE' ? 'success' : purchase.status === 'PENDING' ? 'warning' : 'default'}
                          dot
                        >
                          {purchase.status}
                        </Badge>
                        {days !== null && (
                          <span className={cn('text-xs', days <= 30 ? 'text-rose-400' : 'text-tx-muted')}>
                            {days > 0 ? `${days}d left` : 'Expired'}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar widgets */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <h3 className="font-display font-semibold text-tx-primary mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: 'Compare Plans',      href: '/compare',    icon: TrendingUp },
                { label: 'AI Recommendations', href: '/recommend',  icon: Shield },
                { label: 'Browse Insurance',   href: '/policies',   icon: FileText },
              ].map(({ label, href, icon: Icon }) => (
                <Link key={href} href={href}>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-bg-elevated transition-all group">
                    <div className="w-8 h-8 rounded-lg bg-brand-400/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-brand-400" />
                    </div>
                    <span className="text-sm text-tx-secondary group-hover:text-tx-primary transition-colors">{label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-tx-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          {/* Expiring Soon */}
          {data?.expiringSoon && data.expiringSoon.length > 0 && (
            <Card className="border-neon-amber/20 bg-neon-amber/5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-neon-amber" />
                <h3 className="text-sm font-semibold text-neon-amber">Expiring Soon</h3>
              </div>
              {data.expiringSoon.map((p) => (
                <div key={p.id} className="text-xs text-tx-secondary mb-1">
                  <span className="font-medium text-tx-primary">{p.policy?.name}</span>
                  {' '}· {p.expiresAt && formatDate(p.expiresAt)}
                </div>
              ))}
              <Button variant="secondary" size="sm" fullWidth className="mt-3">
                Renew Now
              </Button>
            </Card>
          )}

          {/* Profile completion */}
          {!user?.profile?.age && (
            <Card className="border-brand-400/20 bg-brand-400/5">
              <h3 className="text-sm font-semibold text-brand-400 mb-1">Complete Your Profile</h3>
              <p className="text-xs text-tx-secondary mb-3">
                Add your details to get personalised recommendations.
              </p>
              <div className="h-1.5 bg-bg-elevated rounded-full mb-3">
                <div className="h-full w-1/3 bg-brand-gradient rounded-full" />
              </div>
              <Link href="/profile">
                <Button variant="outline" size="sm" fullWidth>Update Profile</Button>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

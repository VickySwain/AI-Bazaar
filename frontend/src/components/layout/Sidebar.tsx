'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, FileText, MessageSquare, Sparkles,
  CreditCard, User, Shield, Settings, HelpCircle, LogOut, TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'
import { getInitials } from '@/lib/utils'

const navItems = [
  { label: 'Overview',        href: '/dashboard',          icon: LayoutDashboard },
  { label: 'My Policies',     href: '/dashboard/my-policies', icon: FileText },
  { label: 'Quotes',          href: '/dashboard/quotes',   icon: MessageSquare },
  { label: 'AI Picks',        href: '/recommend',          icon: Sparkles },
  { label: 'Compare Plans',   href: '/compare',            icon: TrendingUp },
  { label: 'Payments',        href: '/dashboard/payments', icon: CreditCard },
]

const bottomItems = [
  { label: 'Profile',         href: '/profile',  icon: User },
  { label: 'Help',            href: '/help',     icon: HelpCircle },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { mutate: logout } = useLogout()

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-bg-surface border-r border-bd-subtle flex flex-col z-30 hidden lg:flex">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-bd-subtle flex-shrink-0">
        <Link href="/" className="flex items-center">
          <img 
           src="/logo.png" 
           alt="Market Prime Capital" 
           className="h-10 w-auto object-contain" 
          />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ x: 2 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                  active
                    ? 'bg-brand-400/10 text-brand-400 border border-brand-400/20'
                    : 'text-tx-secondary hover:text-tx-primary hover:bg-bg-elevated',
                )}
              >
                <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-brand-400' : 'text-tx-muted group-hover:text-tx-secondary')} />
                {label}
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400"
                  />
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-bd-subtle space-y-0.5">
        {bottomItems.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href}>
            <div className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              pathname === href
                ? 'bg-brand-400/10 text-brand-400'
                : 'text-tx-secondary hover:text-tx-primary hover:bg-bg-elevated',
            )}>
              <Icon className="w-4 h-4 flex-shrink-0 text-tx-muted" />
              {label}
            </div>
          </Link>
        ))}
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-400/10 transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sign Out
        </button>

        {/* User card */}
        {user && (
          <div className="mt-2 p-3 rounded-xl bg-bg-elevated border border-bd-subtle flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {getInitials(user.fullName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-tx-primary truncate">{user.fullName}</p>
              <p className="text-xs text-tx-muted truncate">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

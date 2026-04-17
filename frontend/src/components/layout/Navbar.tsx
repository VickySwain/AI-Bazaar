'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Menu, X, ChevronDown, Bell, User, LogOut, LayoutDashboard, FileText, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { getInitials } from '@/lib/utils'
import { InsuranceQuizModal } from '@/components/policy/InsuranceQuizModal'

const navLinks = [
  { label: 'Compare', href: '/compare' },
  { label: 'AI Picks', href: '/recommend' },
]

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const pathname = usePathname()
  const { user, isAuthenticated } = useAuthStore()
  const { mutate: logout } = useLogout()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-40 transition-all duration-300',
          scrolled ? 'glass-strong border-b border-bd-subtle shadow-card' : 'bg-transparent',
        )}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
           <div className="w-8 h-8 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow-sm">
             <Shield className="w-4 h-4 text-white" />
           </div>
           <span className="font-display font-semibold text-lg text-tx-primary tracking-tight">
             Market Prime <span className="text-gradient">Capital</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {/* Insurance — Quiz Modal trigger karta hai */}
            <button
              onClick={() => setQuizOpen(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 text-tx-secondary hover:text-tx-primary hover:bg-bg-elevated"
            >
              Insurance
            </button>

            {/* Baaki links same */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive(link.href)
                    ? 'bg-brand-400/10 text-brand-400 border border-brand-400/20'
                    : 'text-tx-secondary hover:text-tx-primary hover:bg-bg-elevated',
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Right */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                {/* Notifications */}
                <button className="relative w-9 h-9 rounded-xl flex items-center justify-center text-tx-secondary hover:text-tx-primary hover:bg-bg-elevated transition-colors border border-bd-subtle">
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-400 ring-2 ring-bg-base" />
                </button>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-bd-base hover:border-bd-strong hover:bg-bg-elevated transition-all duration-200"
                  >
                    <div className="w-7 h-7 rounded-lg bg-brand-gradient flex items-center justify-center text-xs font-bold text-white">
                      {getInitials(user.fullName)}
                    </div>
                    <span className="text-sm font-medium text-tx-primary max-w-[100px] truncate">
                      {user.fullName.split(' ')[0]}
                    </span>
                    <ChevronDown className={cn('w-3.5 h-3.5 text-tx-muted transition-transform', userMenuOpen && 'rotate-180')} />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.97 }}
                          transition={{ duration: 0.18 }}
                          className="absolute right-0 top-full mt-2 w-52 glass-strong rounded-2xl border border-bd-base shadow-dialog z-20 overflow-hidden"
                        >
                          <div className="p-3 border-b border-bd-subtle">
                            <p className="text-sm font-medium text-tx-primary truncate">{user.fullName}</p>
                            <p className="text-xs text-tx-muted truncate">{user.email}</p>
                          </div>
                          <div className="p-2">
                            {[
                              { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                              { href: '/dashboard/my-policies', icon: FileText, label: 'My Policies' },
                              { href: '/profile', icon: User, label: 'Profile' },
                            ].map(({ href, icon: Icon, label }) => (
                              <Link
                                key={href}
                                href={href}
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-tx-secondary hover:text-tx-primary hover:bg-bg-elevated transition-all"
                              >
                                <Icon className="w-4 h-4" />
                                {label}
                              </Link>
                            ))}
                          </div>
                          <div className="p-2 border-t border-bd-subtle">
                            <button
                              onClick={() => { setUserMenuOpen(false); logout() }}
                              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-rose-400 hover:bg-rose-400/10 transition-all"
                            >
                              <LogOut className="w-4 h-4" />
                              Sign out
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Sign in</Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" glow>Get Started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-tx-secondary hover:text-tx-primary hover:bg-bg-elevated transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden glass-strong border-t border-bd-subtle overflow-hidden"
            >
              <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-2">
                {/* Insurance button mobile mein */}
                <button
                  onClick={() => { setMobileOpen(false); setQuizOpen(true) }}
                  className="flex items-center px-4 py-3 rounded-xl text-sm font-medium text-tx-secondary hover:text-tx-primary hover:bg-bg-elevated transition-all"
                >
                  Insurance
                </button>

                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all',
                      isActive(link.href)
                        ? 'bg-brand-400/10 text-brand-400 border border-brand-400/20'
                        : 'text-tx-secondary hover:text-tx-primary hover:bg-bg-elevated',
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-2 border-t border-bd-subtle mt-2 flex flex-col gap-2">
                  {isAuthenticated ? (
                    <>
                      <Link href="/dashboard"><Button variant="secondary" fullWidth>Dashboard</Button></Link>
                      <Button variant="ghost" fullWidth onClick={() => logout()}>Sign Out</Button>
                    </>
                  ) : (
                    <>
                      <Link href="/login"><Button variant="secondary" fullWidth>Sign In</Button></Link>
                      <Link href="/signup"><Button fullWidth>Get Started</Button></Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Quiz Modal */}
      <InsuranceQuizModal isOpen={quizOpen} onClose={() => setQuizOpen(false)} />
    </>
  )
}

'use client'
import { useRef } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  Shield, Sparkles, ArrowRight, CheckCircle2, Star, TrendingUp,
  Zap, Users, Award, ChevronRight, Brain, GitCompare, CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useFeaturedPolicies } from '@/hooks/usePolicies'
import { PolicyCard } from '@/components/policy/PolicyCard'
import { CompareBar } from '@/components/policy/CompareBar'
import { formatCurrency } from '@/lib/utils'

const STATS = [
  { value: '₹1,200Cr+', label: 'Claims Settled',     icon: Shield },
  { value: '4.8M+',     label: 'Happy Customers',    icon: Users },
  { value: '50+',       label: 'Insurance Partners', icon: Award },
  { value: '99.4%',     label: 'Claim Success Rate', icon: TrendingUp },
]

const FEATURES = [
  {
    icon: Brain,
    title: 'AI-Powered Matching',
    description: 'Our ML engine analyses 40+ parameters to find policies perfectly calibrated to your life, health, and finances.',
    accent: 'from-brand-400 to-neon-purple',
    glow: 'rgba(124,58,237,0.3)',
  },
  {
    icon: GitCompare,
    title: 'Side-by-Side Compare',
    description: 'Compare up to 4 policies at once across 20+ parameters. Our visual comparison matrix makes the best choice obvious.',
    accent: 'from-neon-blue to-brand-400',
    glow: 'rgba(56,189,248,0.3)',
  },
  {
    icon: CreditCard,
    title: 'Instant Policy Issuance',
    description: 'Pay securely via UPI, card, or net banking. Get your policy document in under 2 minutes — no paperwork.',
    accent: 'from-neon-green to-neon-blue',
    glow: 'rgba(52,211,153,0.3)',
  },
  {
    icon: Zap,
    title: 'Real-Time Quotes',
    description: 'Live premium quotes from 50+ insurers simultaneously. No waiting, no callbacks — just accurate numbers instantly.',
    accent: 'from-neon-amber to-neon-green',
    glow: 'rgba(251,191,36,0.3)',
  },
]

const TRUST_ITEMS = [
  'IRDAI Registered Broker',
  'ISO 27001 Certified',
  '256-bit SSL Encrypted',
  'Zero Hidden Fees',
]

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  const { data: featuredPolicies, isLoading } = useFeaturedPolicies(6)

  return (
    <div className="relative overflow-x-hidden">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-16">
        {/* Background mesh */}
        <div className="absolute inset-0 bg-mesh pointer-events-none" />
        <div className="absolute inset-0 bg-noise opacity-40 pointer-events-none" />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-brand-400/8 blur-3xl pointer-events-none animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-neon-blue/6 blur-3xl pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }} />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 text-center"
        >
          {/* Pill badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 glass border border-brand-400/20 rounded-full px-4 py-2 mb-8"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-xs font-semibold text-tx-secondary">AI-Powered Insurance Platform</span>
            <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
            <span className="text-xs text-neon-green font-medium">Live</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl text-tx-primary leading-[1.08] tracking-tight mb-6"
          >
            Insurance that{' '}
            <span className="relative">
              <span className="text-gradient">actually fits</span>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-brand-gradient rounded-full origin-left"
              />
            </span>
            <br />
            your life.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-tx-secondary max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Compare 500+ plans from 50+ insurers. Get AI-matched recommendations.
            Buy in 2 minutes — fully online, zero paperwork.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Link href="/recommend">
              <Button size="xl" glow iconRight={<ArrowRight className="w-5 h-5" />}>
                Get AI Recommendations
              </Button>
            </Link>
            <Link href="/policies">
              <Button size="xl" variant="secondary">
                Browse All Plans
              </Button>
            </Link>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            {TRUST_ITEMS.map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-neon-green" />
                <span className="text-xs text-tx-muted">{item}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-xs text-tx-muted">Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-5 h-8 border border-bd-strong rounded-full flex items-start justify-center pt-1.5"
          >
            <div className="w-1 h-2 bg-tx-muted rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <section className="py-16 border-y border-bd-subtle bg-bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map(({ value, label, icon: Icon }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex flex-col items-center text-center gap-2"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-400/10 border border-brand-400/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-brand-400" />
                </div>
                <span className="font-display font-bold text-3xl text-tx-primary">{value}</span>
                <span className="text-sm text-tx-secondary">{label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-3 block">
            Why CoverAI
          </span>
          <h2 className="font-display font-bold text-4xl lg:text-5xl text-tx-primary mb-4">
            Built different, from the ground up
          </h2>
          <p className="text-tx-secondary text-lg max-w-2xl mx-auto">
            Every feature exists to make buying insurance faster, smarter, and more transparent.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {FEATURES.map(({ icon: Icon, title, description, accent, glow }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Card
                hover
                className="h-full group"
                whileHover={{ boxShadow: `0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(148,163,184,0.2)` }}
              >
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${accent} p-0.5 mb-5`}
                  style={{ boxShadow: `0 0 20px ${glow}` }}
                >
                  <div className="w-full h-full rounded-[14px] bg-bg-surface flex items-center justify-center">
                    <Icon className="w-5 h-5 text-tx-primary" />
                  </div>
                </div>
                <h3 className="font-display font-semibold text-xl text-tx-primary mb-2 group-hover:text-gradient transition-all">
                  {title}
                </h3>
                <p className="text-tx-secondary text-sm leading-relaxed">{description}</p>
                <div className="flex items-center gap-1 mt-4 text-brand-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more <ChevronRight className="w-4 h-4" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Featured Plans ─────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 bg-bg-surface border-y border-bd-subtle">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest block mb-2">
                Top Picks
              </span>
              <h2 className="font-display font-bold text-3xl lg:text-4xl text-tx-primary">
                Most popular plans
              </h2>
            </div>
            <Link href="/policies">
              <Button variant="ghost" iconRight={<ArrowRight className="w-4 h-4" />}>
                View all
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-80 shimmer rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredPolicies?.map((policy, i) => (
                <PolicyCard key={policy.id} policy={policy} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden bg-bg-surface border border-bd-base p-10 sm:p-14 text-center"
          >
            <div className="absolute inset-0 bg-mesh pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-br from-brand-400/10 via-transparent to-neon-blue/8 pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-brand-400/10 border border-brand-400/20 rounded-full px-4 py-2 mb-6">
                <Star className="w-4 h-4 text-neon-amber fill-neon-amber" />
                <span className="text-sm font-medium text-tx-secondary">Trusted by 4.8M+ Indians</span>
              </div>
              <h2 className="font-display font-bold text-4xl sm:text-5xl text-tx-primary mb-5">
                Your perfect policy,<br />
                <span className="text-gradient">found in 2 minutes.</span>
              </h2>
              <p className="text-tx-secondary text-lg mb-8 max-w-xl mx-auto">
                Answer a few quick questions and let our AI find the insurance plan tailor-made for you.
              </p>
              <Link href="/signup">
                <Button size="xl" glow iconRight={<ArrowRight className="w-5 h-5" />}>
                  Start for Free
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <CompareBar />
    </div>
  )
}

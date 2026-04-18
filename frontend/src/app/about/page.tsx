import Link from 'next/link'
import { Shield, Target, Users, TrendingUp, Award, Heart } from 'lucide-react'

export const metadata = {
  title: 'About Us — Market Prime Capital',
  description: 'Learn about Market Prime Capital, India\'s most intelligent insurance platform.',
}

const stats = [
  { value: '4.8M+', label: 'Happy Customers' },
  { value: '50+', label: 'Insurance Partners' },
  { value: '₹1,200Cr+', label: 'Claims Settled' },
  { value: '99.4%', label: 'Claim Success Rate' },
]

const values = [
  {
    icon: Shield,
    title: 'Trust & Transparency',
    description: 'We believe insurance should be simple and honest. No hidden charges, no misleading terms — just clear, straightforward coverage.',
  },
  {
    icon: Target,
    title: 'Customer First',
    description: 'Every feature we build, every policy we list, every decision we make — it all starts and ends with our customers\' best interests.',
  },
  {
    icon: TrendingUp,
    title: 'Innovation',
    description: 'We leverage cutting-edge AI and machine learning to match you with the perfect policy — faster and more accurately than ever before.',
  },
  {
    icon: Heart,
    title: 'Empathy',
    description: 'Insurance is about protecting what matters most. We treat every customer with the care and respect they deserve.',
  },
]

const team = [
  {
    name: 'Vicky Swain',
    role: 'Founder & CEO',
    bio: 'Visionary entrepreneur with a passion for making insurance accessible to every Indian.',
    initials: 'VS',
  },
  {
    name: 'Priya Sharma',
    role: 'Chief Technology Officer',
    bio: 'AI/ML expert with 10+ years of experience building scalable fintech platforms.',
    initials: 'PS',
  },
  {
    name: 'Rahul Mehta',
    role: 'Chief Insurance Officer',
    bio: 'Former LIC executive with deep expertise in insurance products and regulations.',
    initials: 'RM',
  },
  {
    name: 'Anjali Verma',
    role: 'Head of Customer Experience',
    bio: 'Dedicated to ensuring every customer has a seamless and satisfying journey.',
    initials: 'AV',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-bg-base">
      {/* Hero */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-mesh pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-brand-400/10 blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            About Market Prime Capital
          </div>
          <h1 className="font-display font-bold text-5xl text-tx-primary mb-6 leading-tight">
            Reimagining Insurance for <span className="text-gradient">Every Indian</span>
          </h1>
          <p className="text-xl text-tx-secondary leading-relaxed max-w-2xl mx-auto">
            Market Prime Capital was founded with a simple mission — make insurance buying as easy, transparent, and intelligent as possible. We combine AI technology with deep insurance expertise to help you find the perfect coverage.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 border-y border-bd-subtle bg-bg-surface">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="font-display font-bold text-4xl text-tx-primary mb-2">{value}</p>
              <p className="text-tx-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display font-bold text-3xl text-tx-primary mb-8 text-center">Our Story</h2>
          <div className="space-y-6 text-tx-secondary leading-relaxed text-lg">
            <p>
              Market Prime Capital was born out of frustration. Our founder, Vicky Swain, spent weeks trying to compare insurance policies for his family — drowning in jargon, confusing terms, and pushy agents. He realized millions of Indians face the same struggle every day.
            </p>
            <p>
              In 2024, he assembled a team of insurance experts, AI engineers, and customer experience designers to build something different — a platform that puts the customer first, always. Using advanced machine learning, we analyze 40+ parameters to match each user with policies perfectly suited to their life and needs.
            </p>
            <p>
              Today, Market Prime Capital serves 4.8 million customers across India, partnering with 50+ leading insurers to offer 500+ policies across health, life, term, motor, and travel insurance. But our mission remains the same: make insurance simple, transparent, and accessible for every Indian.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 px-4 bg-bg-surface border-y border-bd-subtle">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display font-bold text-3xl text-tx-primary mb-4 text-center">Our Values</h2>
          <p className="text-tx-secondary text-center mb-12 max-w-2xl mx-auto">Everything we do is guided by these core principles.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map(({ icon: Icon, title, description }) => (
              <div key={title} className="bg-bg-elevated border border-bd-subtle rounded-2xl p-8">
                <div className="w-12 h-12 rounded-xl bg-brand-gradient flex items-center justify-center mb-4 shadow-glow-sm">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display font-semibold text-xl text-tx-primary mb-3">{title}</h3>
                <p className="text-tx-secondary leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display font-bold text-3xl text-tx-primary mb-4 text-center">Meet Our Team</h2>
          <p className="text-tx-secondary text-center mb-12 max-w-2xl mx-auto">The passionate people behind Market Prime Capital.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map(({ name, role, bio, initials }) => (
              <div key={name} className="bg-bg-surface border border-bd-subtle rounded-2xl p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-glow-sm">
                  {initials}
                </div>
                <h3 className="font-semibold text-tx-primary mb-1">{name}</h3>
                <p className="text-brand-400 text-sm mb-3">{role}</p>
                <p className="text-tx-muted text-sm leading-relaxed">{bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-bg-surface border-t border-bd-subtle">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display font-bold text-3xl text-tx-primary mb-4">Ready to find your perfect policy?</h2>
          <p className="text-tx-secondary mb-8">Join 4.8M+ Indians who trust Market Prime Capital for their insurance needs.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/policies" className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-brand-gradient text-white font-semibold shadow-glow hover:opacity-90 transition-opacity">
              Browse Plans
            </Link>
            <Link href="/contact" className="inline-flex items-center justify-center px-8 py-3 rounded-xl border border-bd-base text-tx-primary font-semibold hover:bg-bg-elevated transition-colors">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
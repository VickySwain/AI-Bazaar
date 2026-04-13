import { Shield } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-base flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-bg-surface border-r border-bd-subtle overflow-hidden">
        <div className="absolute inset-0 bg-mesh pointer-events-none" />
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-brand-400/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 right-0 w-60 h-60 rounded-full bg-neon-blue/8 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow-sm">
            <Shield className="w-4.5 h-4.5 text-white" />
          </div>
          <Link href="/" className="font-display font-semibold text-xl text-tx-primary">
            Cover<span className="text-gradient">AI</span>
          </Link>
        </div>

        {/* Quote */}
        <div className="relative">
          <blockquote className="text-3xl font-display font-semibold text-tx-primary leading-snug mb-6">
            "The best time to get insurance was yesterday. The second best time is right now."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold text-sm">
              VS
            </div>
            <div>
              <p className="text-sm font-semibold text-tx-primary">Vicky Swain</p>
              <p className="text-xs text-tx-muted">CoverAI customer since 2023</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="relative grid grid-cols-3 gap-4">
          {[
            { value: '4.8M+',  label: 'Users' },
            { value: '50+',    label: 'Insurers' },
            { value: '99.4%',  label: 'Claim ratio' },
          ].map(({ value, label }) => (
            <div key={label} className="bg-bg-elevated border border-bd-subtle rounded-xl p-3 text-center">
              <p className="font-display font-bold text-xl text-tx-primary">{value}</p>
              <p className="text-xs text-tx-muted">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow-sm">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <Link href="/" className="font-display font-semibold text-lg text-tx-primary">
              Cover<span className="text-gradient">AI</span>
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

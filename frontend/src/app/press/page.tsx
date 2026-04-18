import { ArrowRight, Download, Mail } from 'lucide-react'

export const metadata = {
  title: 'Press — Market Prime Capital',
  description: 'Press releases, media coverage, and brand assets for Market Prime Capital.',
}

const coverage = [
  {
    outlet: 'Economic Times',
    title: 'Market Prime Capital raises seed funding to democratize insurance in India',
    date: 'April 10, 2026',
    link: '#',
  },
  {
    outlet: 'YourStory',
    title: 'How AI is changing the way Indians buy insurance — Market Prime Capital story',
    date: 'March 25, 2026',
    link: '#',
  },
  {
    outlet: 'Inc42',
    title: 'Market Prime Capital crosses 4.8M users in first year of operations',
    date: 'March 10, 2026',
    link: '#',
  },
  {
    outlet: 'Mint',
    title: 'Fintech startup Market Prime Capital partners with 50+ insurers for AI-powered recommendations',
    date: 'February 20, 2026',
    link: '#',
  },
  {
    outlet: 'Business Standard',
    title: 'Market Prime Capital: Making insurance smarter with machine learning',
    date: 'February 5, 2026',
    link: '#',
  },
]

const pressReleases = [
  {
    title: 'Market Prime Capital Launches AI-Powered Insurance Quiz for Personalized Recommendations',
    date: 'April 1, 2026',
  },
  {
    title: 'Market Prime Capital Partners with Star Health for Exclusive Digital Plans',
    date: 'March 15, 2026',
  },
  {
    title: 'Market Prime Capital Announces Zero-Paperwork Policy Issuance in Under 2 Minutes',
    date: 'February 28, 2026',
  },
]

const stats = [
  { value: '4.8M+', label: 'Users' },
  { value: '50+', label: 'Insurer Partners' },
  { value: '₹1,200Cr+', label: 'Claims Settled' },
  { value: '2024', label: 'Founded' },
]

export default function PressPage() {
  return (
    <div className="min-h-screen bg-bg-base">
      {/* Hero */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-mesh pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <h1 className="font-display font-bold text-5xl text-tx-primary mb-6">
            Press & <span className="text-gradient">Media</span>
          </h1>
          <p className="text-xl text-tx-secondary max-w-2xl mx-auto">
            News, press releases, and media resources about Market Prime Capital.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 bg-bg-surface border-y border-bd-subtle">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="font-display font-bold text-3xl text-tx-primary mb-1">{value}</p>
              <p className="text-tx-muted text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Media Coverage */}
          <div className="lg:col-span-2">
            <h2 className="font-display font-bold text-2xl text-tx-primary mb-8">Media Coverage</h2>
            <div className="space-y-4">
              {coverage.map((item) => (
                <div key={item.title} className="bg-bg-surface border border-bd-subtle rounded-2xl p-6 hover:border-brand-500/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <span className="inline-block px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-medium mb-3">{item.outlet}</span>
                      <h3 className="font-semibold text-tx-primary mb-2 leading-snug">{item.title}</h3>
                      <p className="text-tx-muted text-sm">{item.date}</p>
                    </div>
                    <a href={item.link} className="text-brand-400 hover:text-brand-300 transition-colors flex-shrink-0 mt-1">
                      <ArrowRight className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Press Releases */}
            <h2 className="font-display font-bold text-2xl text-tx-primary mb-8 mt-12">Press Releases</h2>
            <div className="space-y-4">
              {pressReleases.map((item) => (
                <div key={item.title} className="bg-bg-surface border border-bd-subtle rounded-2xl p-6 hover:border-brand-500/30 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-tx-primary mb-2">{item.title}</h3>
                      <p className="text-tx-muted text-sm">{item.date}</p>
                    </div>
                    <button className="flex items-center gap-2 text-brand-400 hover:text-brand-300 transition-colors text-sm whitespace-nowrap">
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Brand Assets */}
            <div className="bg-bg-surface border border-bd-subtle rounded-2xl p-6">
              <h3 className="font-display font-semibold text-xl text-tx-primary mb-4">Brand Assets</h3>
              <p className="text-tx-muted text-sm mb-6">Download our official logos, brand guidelines, and media kit.</p>
              <div className="space-y-3">
                {['Logo Pack (PNG/SVG)', 'Brand Guidelines', 'Media Kit', 'Executive Photos'].map((asset) => (
                  <button key={asset} className="w-full flex items-center justify-between px-4 py-3 bg-bg-elevated border border-bd-subtle rounded-xl text-sm text-tx-secondary hover:text-tx-primary hover:border-brand-500/30 transition-colors">
                    {asset}
                    <Download className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Media Contact */}
            <div className="bg-bg-surface border border-bd-subtle rounded-2xl p-6">
              <h3 className="font-display font-semibold text-xl text-tx-primary mb-4">Media Contact</h3>
              <p className="text-tx-muted text-sm mb-4">For press inquiries, interviews, and media requests:</p>
              <div className="space-y-3">
                <p className="font-semibold text-tx-primary">Anjali Verma</p>
                <p className="text-tx-muted text-sm">Head of Communications</p>
                <a href="mailto:press@marketprimecapital.in" className="flex items-center gap-2 text-brand-400 hover:text-brand-300 transition-colors text-sm">
                  <Mail className="w-4 h-4" />
                  press@marketprimecapital.in
                </a>
              </div>
            </div>

            {/* About */}
            <div className="bg-bg-surface border border-bd-subtle rounded-2xl p-6">
              <h3 className="font-display font-semibold text-xl text-tx-primary mb-4">About MPC</h3>
              <p className="text-tx-muted text-sm leading-relaxed">
                Market Prime Capital is India's most intelligent insurance platform. Founded in 2024, we use AI and machine learning to help 4.8M+ Indians find and buy the perfect insurance policy in minutes.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
import Link from 'next/link'
import { Shield, Twitter, Github, Linkedin, Mail } from 'lucide-react'

const links = {
  product:  [
    { label: 'Health Insurance',  href: '/policies?category=HEALTH' },
    { label: 'Term Life',         href: '/policies?category=TERM' },
    { label: 'Motor Insurance',   href: '/policies?category=MOTOR' },
    { label: 'Travel Insurance',  href: '/policies?category=TRAVEL' },
    { label: 'Compare Plans',     href: '/compare' },
  ],
  company:  [
    { label: 'About Us',  href: '/about' },
    { label: 'Blog',      href: '/blog' },
    { label: 'Careers',   href: '/careers' },
    { label: 'Press',     href: '/press' },
    { label: 'Contact',   href: '/contact' },
  ],
  legal:    [
    { label: 'Privacy Policy',    href: '/privacy' },
    { label: 'Terms of Service',  href: '/terms' },
    { label: 'Cookie Policy',     href: '/cookies' },
    { label: 'Disclaimer',        href: '/disclaimer' },
    { label: 'IRDA Registration', href: '/irda' },
  ],
}

export function Footer() {
  return (
    <footer className="bg-bg-surface border-t border-bd-subtle mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow-sm">
                <Shield className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-display font-semibold text-xl text-tx-primary">
                Cover<span className="text-gradient">AI</span>
              </span>
            </Link>
            <p className="text-sm text-tx-secondary leading-relaxed max-w-sm mb-6">
              India's most intelligent insurance platform. Compare, analyse, and buy
              the right policy with the power of AI — in minutes.
            </p>
            <div className="flex items-center gap-3">
              {[
                { icon: Twitter,  href: 'https://twitter.com/coverai' },
                { icon: Github,   href: 'https://github.com/coverai' },
                { icon: Linkedin, href: 'https://linkedin.com/company/coverai' },
                { icon: Mail,     href: 'mailto:hello@coverai.in' },
              ].map(({ icon: Icon, href }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl border border-bd-base flex items-center justify-center text-tx-muted hover:text-tx-primary hover:border-bd-strong hover:bg-bg-elevated transition-all"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <h3 className="text-xs font-semibold text-tx-muted uppercase tracking-widest mb-4">
                {section}
              </h3>
              <ul className="space-y-2.5">
                {items.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-tx-secondary hover:text-tx-primary transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-6 border-t border-bd-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-tx-muted">
            © {new Date().getFullYear()} CoverAI Technologies Pvt. Ltd. All rights reserved.
          </p>
          <p className="text-xs text-tx-muted">
            IRDAI Reg. No. XXX | CIN: U67200MH2024PTC000000
          </p>
        </div>
      </div>
    </footer>
  )
}

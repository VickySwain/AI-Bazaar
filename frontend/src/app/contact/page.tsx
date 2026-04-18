'use client'
import { useState } from 'react'
import { Mail, Phone, MapPin, Clock, MessageSquare, HeadphonesIcon } from 'lucide-react'

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Hero */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-mesh pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <h1 className="font-display font-bold text-5xl text-tx-primary mb-6">
            Get in <span className="text-gradient">Touch</span>
          </h1>
          <p className="text-xl text-tx-secondary max-w-2xl mx-auto">
            Have a question about insurance? Need help with your policy? Our team is here to help you every step of the way.
          </p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Contact Info */}
          <div className="space-y-6">
            {[
              {
                icon: Phone,
                title: 'Call Us',
                lines: ['+91 1800-XXX-XXXX (Toll Free)', 'Mon-Sat: 9:00 AM - 6:00 PM'],
              },
              {
                icon: Mail,
                title: 'Email Us',
                lines: ['support@marketprimecapital.in', 'We reply within 24 hours'],
              },
              {
                icon: MapPin,
                title: 'Visit Us',
                lines: ['Market Prime Capital Pvt. Ltd.', 'Mumbai, Maharashtra, India'],
              },
              {
                icon: Clock,
                title: 'Business Hours',
                lines: ['Monday - Saturday', '9:00 AM - 6:00 PM IST'],
              },
            ].map(({ icon: Icon, title, lines }) => (
              <div key={title} className="flex items-start gap-4 p-6 bg-bg-surface border border-bd-subtle rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow-sm flex-shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-tx-primary mb-1">{title}</p>
                  {lines.map((line) => (
                    <p key={line} className="text-tx-secondary text-sm">{line}</p>
                  ))}
                </div>
              </div>
            ))}

            {/* Quick Links */}
            <div className="p-6 bg-bg-surface border border-bd-subtle rounded-2xl">
              <p className="font-semibold text-tx-primary mb-4">Quick Help</p>
              <div className="space-y-3">
                {[
                  { icon: MessageSquare, label: 'File a Claim', href: '/dashboard' },
                  { icon: HeadphonesIcon, label: 'Track Your Policy', href: '/dashboard/my-policies' },
                ].map(({ icon: Icon, label, href }) => (
                  <a key={label} href={href} className="flex items-center gap-3 text-brand-400 hover:text-brand-300 transition-colors text-sm">
                    <Icon className="w-4 h-4" />
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2 bg-bg-surface border border-bd-subtle rounded-2xl p-8">
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-neon-green/20 flex items-center justify-center mb-6">
                  <Mail className="w-8 h-8 text-neon-green" />
                </div>
                <h3 className="font-display font-bold text-2xl text-tx-primary mb-3">Message Sent!</h3>
                <p className="text-tx-secondary max-w-sm">Thank you for reaching out. Our team will get back to you within 24 hours.</p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', subject: '', message: '' }) }}
                  className="mt-6 text-brand-400 hover:text-brand-300 text-sm transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <h2 className="font-display font-semibold text-2xl text-tx-primary mb-6">Send us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-tx-secondary mb-2">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Vicky Swain"
                        className="w-full px-4 py-3 bg-bg-elevated border border-bd-base rounded-xl text-tx-primary placeholder:text-tx-muted focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-tx-secondary mb-2">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 bg-bg-elevated border border-bd-base rounded-xl text-tx-primary placeholder:text-tx-muted focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-tx-secondary mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full px-4 py-3 bg-bg-elevated border border-bd-base rounded-xl text-tx-primary placeholder:text-tx-muted focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-tx-secondary mb-2">Subject *</label>
                      <select
                        required
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        className="w-full px-4 py-3 bg-bg-elevated border border-bd-base rounded-xl text-tx-primary focus:outline-none focus:border-brand-500 transition-colors"
                      >
                        <option value="">Select a subject</option>
                        <option value="policy">Policy Inquiry</option>
                        <option value="claim">Claim Assistance</option>
                        <option value="payment">Payment Issue</option>
                        <option value="technical">Technical Support</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-tx-secondary mb-2">Message *</label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="How can we help you?"
                      className="w-full px-4 py-3 bg-bg-elevated border border-bd-base rounded-xl text-tx-primary placeholder:text-tx-muted focus:outline-none focus:border-brand-500 transition-colors resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 px-6 bg-brand-gradient text-white font-semibold rounded-xl shadow-glow hover:opacity-90 transition-opacity"
                  >
                    Send Message
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
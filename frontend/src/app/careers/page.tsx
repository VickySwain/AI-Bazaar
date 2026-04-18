import { Briefcase, MapPin, Clock, ArrowRight, Heart, TrendingUp, Users, Coffee } from 'lucide-react'

export const metadata = {
  title: 'Careers — Market Prime Capital',
  description: 'Join the team at Market Prime Capital and help revolutionize insurance in India.',
}

const perks = [
  { icon: Heart, title: 'Health Insurance', description: 'Comprehensive health coverage for you and your family' },
  { icon: TrendingUp, title: 'Growth Opportunities', description: 'Fast-track your career in one of India\'s fastest growing fintech startups' },
  { icon: Users, title: 'Great Team', description: 'Work with passionate, talented people who love what they do' },
  { icon: Coffee, title: 'Flexible Work', description: 'Hybrid work model with flexible hours to maintain work-life balance' },
]

const jobs = [
  {
    title: 'Senior Frontend Engineer',
    department: 'Engineering',
    location: 'Mumbai / Remote',
    type: 'Full-time',
    description: 'Build beautiful, performant user interfaces using Next.js, TypeScript, and TailwindCSS.',
  },
  {
    title: 'ML Engineer',
    department: 'AI/ML',
    location: 'Mumbai / Remote',
    type: 'Full-time',
    description: 'Improve our insurance recommendation engine using Python, XGBoost, and modern ML techniques.',
  },
  {
    title: 'Backend Engineer (NestJS)',
    department: 'Engineering',
    location: 'Mumbai / Remote',
    type: 'Full-time',
    description: 'Design and build scalable APIs and microservices using NestJS, PostgreSQL, and Redis.',
  },
  {
    title: 'Insurance Product Manager',
    department: 'Product',
    location: 'Mumbai',
    type: 'Full-time',
    description: 'Own the insurance product roadmap and work closely with insurers and customers.',
  },
  {
    title: 'Customer Success Executive',
    department: 'Customer Experience',
    location: 'Mumbai',
    type: 'Full-time',
    description: 'Help customers navigate their insurance journey and resolve queries with empathy.',
  },
  {
    title: 'Digital Marketing Manager',
    department: 'Marketing',
    location: 'Mumbai / Remote',
    type: 'Full-time',
    description: 'Drive customer acquisition through SEO, performance marketing, and content strategy.',
  },
]

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-bg-base">
      {/* Hero */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-mesh pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-brand-400/10 blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <h1 className="font-display font-bold text-5xl text-tx-primary mb-6">
            Build the Future of <span className="text-gradient">Insurance</span>
          </h1>
          <p className="text-xl text-tx-secondary max-w-2xl mx-auto mb-8">
            Join our mission to make insurance simple, transparent, and accessible for every Indian. We are looking for passionate people who want to make a real difference.
          </p>
          <a href="#openings" className="inline-flex items-center gap-2 px-8 py-3 bg-brand-gradient text-white font-semibold rounded-xl shadow-glow hover:opacity-90 transition-opacity">
            View Open Positions <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Perks */}
      <section className="py-16 px-4 bg-bg-surface border-y border-bd-subtle">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display font-bold text-3xl text-tx-primary mb-4 text-center">Why Work With Us?</h2>
          <p className="text-tx-secondary text-center mb-12 max-w-2xl mx-auto">We believe happy employees build better products. Here is what we offer.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {perks.map(({ icon: Icon, title, description }) => (
              <div key={title} className="bg-bg-elevated border border-bd-subtle rounded-2xl p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-brand-gradient flex items-center justify-center mx-auto mb-4 shadow-glow-sm">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-tx-primary mb-2">{title}</h3>
                <p className="text-tx-muted text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="openings" className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display font-bold text-3xl text-tx-primary mb-4 text-center">Open Positions</h2>
          <p className="text-tx-secondary text-center mb-12">We are hiring across multiple roles. Find your perfect fit.</p>
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.title} className="bg-bg-surface border border-bd-subtle rounded-2xl p-6 hover:border-brand-500/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="font-display font-semibold text-xl text-tx-primary">{job.title}</h3>
                      <span className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-medium">{job.department}</span>
                    </div>
                    <p className="text-tx-muted text-sm mb-3">{job.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-tx-muted text-sm">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {job.type}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4" />
                        {job.department}
                      </div>
                    </div>
                  </div>
                  <a
                    href={`mailto:careers@marketprimecapital.in?subject=Application for ${job.title}`}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-gradient text-white text-sm font-semibold rounded-xl shadow-glow-sm hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    Apply Now <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* No suitable role */}
          <div className="mt-10 p-8 bg-bg-surface border border-bd-subtle rounded-2xl text-center">
            <h3 className="font-display font-semibold text-xl text-tx-primary mb-3">Don't see a suitable role?</h3>
            <p className="text-tx-secondary mb-6">We are always looking for talented people. Send us your resume and we will keep you in mind for future openings.</p>
            <a
              href="mailto:careers@marketprimecapital.in?subject=General Application"
              className="inline-flex items-center gap-2 px-6 py-3 border border-bd-base text-tx-primary font-medium rounded-xl hover:bg-bg-elevated transition-colors"
            >
              Send Your Resume <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
import Link from 'next/link'
import { Clock, User, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Blog — Market Prime Capital',
  description: 'Insurance tips, guides, and news from Market Prime Capital.',
}

const posts = [
  {
    slug: 'term-insurance-guide',
    category: 'Term Insurance',
    title: 'Complete Guide to Term Insurance in India 2026',
    excerpt: 'Everything you need to know about term insurance — how it works, how much cover you need, and how to choose the best plan for your family.',
    author: 'Rahul Mehta',
    date: 'April 15, 2026',
    readTime: '8 min read',
    featured: true,
  },
  {
    slug: 'health-insurance-tips',
    category: 'Health Insurance',
    title: 'Top 10 Things to Check Before Buying Health Insurance',
    excerpt: 'Avoid common mistakes when buying health insurance. Here are the 10 most important factors to consider before choosing a health plan.',
    author: 'Priya Sharma',
    date: 'April 10, 2026',
    readTime: '6 min read',
    featured: false,
  },
  {
    slug: 'ai-insurance-recommendations',
    category: 'Technology',
    title: 'How AI is Revolutionizing Insurance Recommendations',
    excerpt: 'Discover how our machine learning engine analyzes 40+ parameters to find the perfect insurance policy tailored to your unique needs.',
    author: 'Vicky Swain',
    date: 'April 5, 2026',
    readTime: '5 min read',
    featured: false,
  },
  {
    slug: 'motor-insurance-renewal',
    category: 'Motor Insurance',
    title: 'Why You Should Never Let Your Motor Insurance Lapse',
    excerpt: 'A lapsed motor insurance policy can cost you lakhs. Here is why timely renewal is critical and how to avoid the common pitfalls.',
    author: 'Anjali Verma',
    date: 'March 28, 2026',
    readTime: '4 min read',
    featured: false,
  },
  {
    slug: 'tax-benefits-insurance',
    category: 'Tax Planning',
    title: 'Tax Benefits on Insurance Premiums — Section 80C & 80D',
    excerpt: 'Learn how insurance premiums can help you save tax under Section 80C and 80D of the Income Tax Act and maximize your returns.',
    author: 'Rahul Mehta',
    date: 'March 20, 2026',
    readTime: '7 min read',
    featured: false,
  },
  {
    slug: 'travel-insurance-importance',
    category: 'Travel Insurance',
    title: 'Why Travel Insurance is a Must for International Trips',
    excerpt: 'Medical emergencies abroad can cost a fortune. Find out why travel insurance is non-negotiable and what to look for in a good plan.',
    author: 'Priya Sharma',
    date: 'March 15, 2026',
    readTime: '5 min read',
    featured: false,
  },
]

const categories = ['All', 'Term Insurance', 'Health Insurance', 'Motor Insurance', 'Travel Insurance', 'Tax Planning', 'Technology']

export default function BlogPage() {
  const featured = posts.find((p) => p.featured)
  const rest = posts.filter((p) => !p.featured)

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Hero */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-mesh pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <h1 className="font-display font-bold text-5xl text-tx-primary mb-6">
            Insurance <span className="text-gradient">Insights</span>
          </h1>
          <p className="text-xl text-tx-secondary max-w-2xl mx-auto">
            Expert tips, guides, and news to help you make smarter insurance decisions.
          </p>
        </div>
      </section>

      <section className="py-8 px-4 border-y border-bd-subtle bg-bg-surface">
        <div className="max-w-6xl mx-auto flex gap-3 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                cat === 'All'
                  ? 'bg-brand-gradient text-white shadow-glow-sm'
                  : 'bg-bg-elevated border border-bd-subtle text-tx-secondary hover:text-tx-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Featured Post */}
          {featured && (
            <div className="mb-12 bg-bg-surface border border-bd-subtle rounded-2xl overflow-hidden">
              <div className="p-8 md:p-12">
                <span className="inline-block px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-medium mb-4">{featured.category}</span>
                <h2 className="font-display font-bold text-3xl text-tx-primary mb-4 max-w-2xl">{featured.title}</h2>
                <p className="text-tx-secondary text-lg mb-6 max-w-2xl">{featured.excerpt}</p>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-tx-muted text-sm">
                    <User className="w-4 h-4" />
                    {featured.author}
                  </div>
                  <div className="flex items-center gap-2 text-tx-muted text-sm">
                    <Clock className="w-4 h-4" />
                    {featured.readTime}
                  </div>
                  <span className="text-tx-muted text-sm">{featured.date}</span>
                </div>
                <button className="mt-6 inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 font-medium transition-colors">
                  Read Article <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Rest of Posts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((post) => (
              <div key={post.slug} className="bg-bg-surface border border-bd-subtle rounded-2xl p-6 hover:border-brand-500/30 transition-colors">
                <span className="inline-block px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-medium mb-4">{post.category}</span>
                <h3 className="font-display font-semibold text-lg text-tx-primary mb-3 leading-snug">{post.title}</h3>
                <p className="text-tx-muted text-sm mb-4 leading-relaxed">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-tx-muted text-xs">
                    <span>{post.author}</span>
                    <span>·</span>
                    <span>{post.readTime}</span>
                  </div>
                  <button className="text-brand-400 hover:text-brand-300 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-12">
            <button className="px-8 py-3 rounded-xl border border-bd-base text-tx-primary font-medium hover:bg-bg-elevated transition-colors">
              Load More Articles
            </button>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 px-4 bg-bg-surface border-t border-bd-subtle">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display font-bold text-3xl text-tx-primary mb-4">Stay Informed</h2>
          <p className="text-tx-secondary mb-8">Get the latest insurance tips and guides delivered to your inbox every week.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 bg-bg-elevated border border-bd-base rounded-xl text-tx-primary placeholder:text-tx-muted focus:outline-none focus:border-brand-500 transition-colors"
            />
            <button className="px-6 py-3 bg-brand-gradient text-white font-semibold rounded-xl shadow-glow hover:opacity-90 transition-opacity whitespace-nowrap">
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
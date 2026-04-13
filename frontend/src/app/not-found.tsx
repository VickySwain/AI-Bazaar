import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ArrowRight } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-mesh">
      <div className="text-center max-w-lg">
        <div className="font-display font-bold text-8xl sm:text-9xl text-gradient mb-4 leading-none select-none">
          404
        </div>
        <h1 className="font-display font-bold text-3xl text-tx-primary mb-3">
          Page not found
        </h1>
        <p className="text-tx-secondary text-lg mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button size="lg" iconRight={<ArrowRight className="w-4 h-4" />}>
              Back to Home
            </Button>
          </Link>
          <Link href="/policies">
            <Button size="lg" variant="secondary">
              Browse Plans
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

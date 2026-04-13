'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useLogin } from '@/hooks/useAuth'

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false)
  const { mutate: login, isPending } = useLogin()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (data: FormData) => login(data)

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-tx-primary mb-2">Welcome back</h1>
        <p className="text-tx-secondary">Sign in to manage your policies and claims.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          autoComplete="email"
          {...register('email')}
        />
        <Input
          label="Password"
          type={showPw ? 'text' : 'password'}
          placeholder="Your password"
          leftIcon={<Lock className="w-4 h-4" />}
          error={errors.password?.message}
          autoComplete="current-password"
          rightElement={
            <button type="button" onClick={() => setShowPw(!showPw)} className="text-tx-muted hover:text-tx-secondary transition-colors">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          {...register('password')}
        />

        <div className="flex items-center justify-end">
          <Link href="/forgot-password" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth size="lg" loading={isPending} iconRight={<ArrowRight className="w-4 h-4" />}>
          Sign In
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-bd-subtle" /></div>
        <div className="relative flex justify-center text-xs text-tx-muted bg-bg-base px-3">or continue with</div>
      </div>

      <a
        href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/auth/google`}
        className="flex items-center justify-center gap-3 w-full h-12 rounded-xl border border-bd-base bg-bg-elevated hover:bg-bg-muted transition-all text-sm font-medium text-tx-primary"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </a>

      <p className="text-center text-sm text-tx-muted mt-6">
        Don't have an account?{' '}
        <Link href="/signup" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
          Create one for free
        </Link>
      </p>
    </motion.div>
  )
}

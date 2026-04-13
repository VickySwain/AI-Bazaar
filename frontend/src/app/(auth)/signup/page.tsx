'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useRegister } from '@/hooks/useAuth'

const schema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email:    z.string().email('Enter a valid email'),
  phone:    z.string().optional(),
  password: z.string()
    .min(8, 'Minimum 8 characters')
    .regex(/[A-Z]/, 'Include at least one uppercase letter')
    .regex(/[0-9]/, 'Include at least one number')
    .regex(/[@$!%*?&]/, 'Include at least one special character'),
})
type FormData = z.infer<typeof schema>

const PERKS = ['Free forever to compare plans', 'No spam — ever', 'Cancel anytime']

export default function SignupPage() {
  const [showPw, setShowPw] = useState(false)
  const { mutate: register_, isPending } = useRegister()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (data: FormData) => register_(data)

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-tx-primary mb-2">Create your account</h1>
        <p className="text-tx-secondary">Join 4.8M+ Indians finding smarter insurance.</p>
        <div className="flex flex-wrap gap-3 mt-3">
          {PERKS.map((p) => (
            <div key={p} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-neon-green" />
              <span className="text-xs text-tx-muted">{p}</span>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full name"
          placeholder="Vicky Swain"
          leftIcon={<User className="w-4 h-4" />}
          error={errors.fullName?.message}
          autoComplete="name"
          {...register('fullName')}
        />
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
          label="Phone number (optional)"
          type="tel"
          placeholder="+91 98765 43210"
          leftIcon={<Phone className="w-4 h-4" />}
          error={errors.phone?.message}
          autoComplete="tel"
          {...register('phone')}
        />
        <Input
          label="Password"
          type={showPw ? 'text' : 'password'}
          placeholder="Min. 8 chars with uppercase & symbol"
          leftIcon={<Lock className="w-4 h-4" />}
          error={errors.password?.message}
          autoComplete="new-password"
          rightElement={
            <button type="button" onClick={() => setShowPw(!showPw)} className="text-tx-muted hover:text-tx-secondary transition-colors">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          {...register('password')}
        />

        <Button type="submit" fullWidth size="lg" loading={isPending} glow iconRight={<ArrowRight className="w-4 h-4" />}>
          Create Account
        </Button>
      </form>

      <p className="text-center text-xs text-tx-muted mt-4">
        By signing up you agree to our{' '}
        <Link href="/terms" className="text-brand-400 hover:underline">Terms</Link> &{' '}
        <Link href="/privacy" className="text-brand-400 hover:underline">Privacy Policy</Link>.
      </p>

      <p className="text-center text-sm text-tx-muted mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </motion.div>
  )
}

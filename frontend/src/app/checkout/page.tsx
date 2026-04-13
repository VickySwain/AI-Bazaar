'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Shield, CheckCircle2, Lock, CreditCard, User,
  Phone, Mail, FileText, ArrowRight, AlertTriangle,
} from 'lucide-react'
import { useCreateOrder, useVerifyPayment } from '@/hooks/useUser'
import { useMyQuotes } from '@/hooks/usePolicies'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { RazorpayOrder, Quote } from '@/types'
import Link from 'next/link'

declare global {
  interface Window {
    Razorpay: any
  }
}

const insuredSchema = z.object({
  fullName:    z.string().min(2, 'Enter full name'),
  dob:         z.string().min(1, 'Enter date of birth'),
  phone:       z.string().min(10, 'Enter valid phone'),
  email:       z.string().email('Enter valid email'),
  nomineeName: z.string().min(2, 'Enter nominee name'),
  nomineeRel:  z.string().min(1, 'Select relationship'),
})
type InsuredForm = z.infer<typeof insuredSchema>

type Step = 'details' | 'payment' | 'success'

const RELATIONSHIP_OPTIONS = [
  { value: 'SPOUSE',  label: 'Spouse' },
  { value: 'CHILD',   label: 'Child' },
  { value: 'PARENT',  label: 'Parent' },
  { value: 'SIBLING', label: 'Sibling' },
  { value: 'OTHER',   label: 'Other' },
]

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload  = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const quoteId = searchParams.get('quoteId')
  const { user } = useAuthStore()

  const [step, setStep] = useState<Step>('details')
  const [orderData, setOrderData] = useState<RazorpayOrder | null>(null)
  const [successData, setSuccessData] = useState<any>(null)

  const { data: quotes, isLoading: quotesLoading } = useMyQuotes()
  const { mutateAsync: createOrder, isPending: orderPending } = useCreateOrder()
  const { mutateAsync: verifyPayment, isPending: verifyPending } = useVerifyPayment()

  const quote: Quote | undefined = quotes?.find((q) => q.id === quoteId)

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<InsuredForm>({
    resolver: zodResolver(insuredSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      email:    user?.email   || '',
      phone:    user?.phone   || '',
    },
  })

  useEffect(() => {
    if (user) {
      setValue('fullName', user.fullName || '')
      setValue('email',    user.email    || '')
      setValue('phone',    user.phone    || '')
    }
  }, [user, setValue])

  if (!quoteId) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-neon-amber mx-auto mb-4" />
          <h2 className="font-display font-bold text-2xl text-tx-primary mb-2">No quote selected</h2>
          <p className="text-tx-secondary mb-6">Please generate a quote from a policy page first.</p>
          <Link href="/policies"><Button>Browse Plans</Button></Link>
        </div>
      </div>
    )
  }

  const onDetailsSubmit = async (formData: InsuredForm) => {
    if (!quoteId) return
    const order = await createOrder({
      quoteId,
      insuredDetails: {
        fullName: formData.fullName,
        dob:      formData.dob,
        phone:    formData.phone,
        email:    formData.email,
      },
      nomineeDetails: {
        name:         formData.nomineeName,
        relationship: formData.nomineeRel,
      },
    })
    if (order) {
      setOrderData(order)
      setStep('payment')
    }
  }

  const handlePay = async () => {
    if (!orderData) return

    const loaded = await loadRazorpay()
    if (!loaded) {
      alert('Failed to load payment gateway. Please try again.')
      return
    }

    const rzp = new window.Razorpay({
      key:         orderData.keyId,
      amount:      orderData.amount,
      currency:    orderData.currency,
      order_id:    orderData.orderId,
      name:        'CoverAI',
      description: `Premium — ${orderData.policy.name}`,
      image:       '/logo.png',
      prefill:     orderData.prefill,
      theme:       { color: '#7c3aed' },
      modal: {
        ondismiss: () => {},
      },
      handler: async (response: any) => {
        const result = await verifyPayment({
          razorpayOrderId:   response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        })
        if (result) {
          setSuccessData(result)
          setStep('success')
        }
      },
    })
    rzp.open()
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen pt-20 pb-20 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-lg w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 rounded-full bg-neon-green/10 border-2 border-neon-green/30 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="w-12 h-12 text-neon-green" />
          </motion.div>

          <h1 className="font-display font-bold text-4xl text-tx-primary mb-3">
            You're covered! 🎉
          </h1>
          <p className="text-tx-secondary text-lg mb-8">
            Your policy is now active. A confirmation email has been sent to{' '}
            <span className="text-tx-primary font-medium">{user?.email}</span>.
          </p>

          <Card className="text-left mb-8">
            <div className="space-y-3">
              {quote && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-tx-muted">Policy</span>
                    <span className="text-sm font-medium text-tx-primary">{quote.policy?.name}</span>
                  </div>
                  <div className="h-px bg-bd-subtle" />
                  <div className="flex justify-between">
                    <span className="text-sm text-tx-muted">Annual Premium</span>
                    <span className="text-sm font-semibold text-neon-green">{formatCurrency(quote.totalPremium)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-tx-muted">Payment ID</span>
                <span className="text-xs font-mono text-tx-secondary">{successData?.paymentId?.slice(0, 16)}…</span>
              </div>
            </div>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/dashboard/policies">
              <Button size="lg" iconRight={<FileText className="w-4 h-4" />}>View My Policies</Button>
            </Link>
            <Link href="/policies">
              <Button size="lg" variant="secondary">Explore More Plans</Button>
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 pb-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="font-display font-bold text-3xl text-tx-primary mb-1">Complete Your Purchase</h1>
          <p className="text-tx-secondary">Secure checkout — your data is encrypted end-to-end.</p>
        </motion.div>

        {/* Steps indicator */}
        <div className="flex items-center gap-3 mb-8">
          {(['details', 'payment'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                step === s ? 'bg-brand-gradient text-white border-brand-400/30 shadow-glow-sm'
                : step === 'payment' && s === 'details' ? 'bg-neon-green/10 text-neon-green border-neon-green/30'
                : 'bg-bg-elevated text-tx-muted border-bd-base'
              }`}>
                {step === 'payment' && s === 'details' ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-sm font-medium capitalize ${step === s ? 'text-tx-primary' : 'text-tx-muted'}`}>
                {s === 'details' ? 'Your Details' : 'Payment'}
              </span>
              {i < 1 && <div className="w-12 h-px bg-bd-base mx-1" />}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main form */}
          <div className="lg:col-span-2">
            {step === 'details' && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <Card>
                  <h2 className="font-display font-semibold text-xl text-tx-primary mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-brand-400" />
                    Insured Person Details
                  </h2>
                  <form onSubmit={handleSubmit(onDetailsSubmit)} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input label="Full Name" placeholder="As on Aadhar" leftIcon={<User className="w-4 h-4" />} error={errors.fullName?.message} {...register('fullName')} />
                      <Input label="Date of Birth" type="date" error={errors.dob?.message} {...register('dob')} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input label="Phone Number" type="tel" placeholder="+91 98765 43210" leftIcon={<Phone className="w-4 h-4" />} error={errors.phone?.message} {...register('phone')} />
                      <Input label="Email Address" type="email" placeholder="you@example.com" leftIcon={<Mail className="w-4 h-4" />} error={errors.email?.message} {...register('email')} />
                    </div>

                    <div className="h-px bg-bd-subtle" />

                    <h3 className="font-semibold text-tx-primary flex items-center gap-2">
                      <Shield className="w-4 h-4 text-brand-400" />
                      Nominee Details
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input label="Nominee Full Name" placeholder="Full legal name" error={errors.nomineeName?.message} {...register('nomineeName')} />
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-tx-secondary">Relationship</label>
                        <select
                          className="w-full h-11 bg-bg-elevated border border-bd-base rounded-xl text-tx-primary text-sm px-4 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400/60 transition-all"
                          {...register('nomineeRel')}
                        >
                          <option value="">Select relationship</option>
                          {RELATIONSHIP_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value} className="bg-bg-elevated">{o.label}</option>
                          ))}
                        </select>
                        {errors.nomineeRel && <p className="text-xs text-rose-400">{errors.nomineeRel.message}</p>}
                      </div>
                    </div>

                    <Button type="submit" fullWidth size="lg" loading={orderPending} iconRight={<ArrowRight className="w-4 h-4" />}>
                      Proceed to Payment
                    </Button>
                  </form>
                </Card>
              </motion.div>
            )}

            {step === 'payment' && orderData && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <Card>
                  <h2 className="font-display font-semibold text-xl text-tx-primary mb-2 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-brand-400" />
                    Secure Payment
                  </h2>
                  <p className="text-sm text-tx-secondary mb-8">
                    You'll be redirected to Razorpay's secure checkout. Supports UPI, cards, net banking, and wallets.
                  </p>

                  {/* Order summary */}
                  <div className="bg-bg-elevated border border-bd-base rounded-2xl p-5 mb-6 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-tx-muted">Policy</span>
                      <span className="font-medium text-tx-primary">{orderData.policy.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-tx-muted">Insurer</span>
                      <span className="font-medium text-tx-primary">{orderData.policy.insurer}</span>
                    </div>
                    <div className="h-px bg-bd-subtle" />
                    <div className="flex justify-between">
                      <span className="text-sm text-tx-muted">Amount Due</span>
                      <span className="text-xl font-display font-bold text-tx-primary">
                        {formatCurrency(orderData.amount / 100)}
                      </span>
                    </div>
                  </div>

                  {/* Security badges */}
                  <div className="flex flex-wrap gap-3 mb-8">
                    {['256-bit SSL', 'PCI DSS Compliant', 'IRDAI Regulated', '100% Secure'].map((b) => (
                      <div key={b} className="flex items-center gap-1.5 text-xs text-tx-muted">
                        <Lock className="w-3 h-3 text-neon-green" />
                        {b}
                      </div>
                    ))}
                  </div>

                  <Button
                    fullWidth
                    size="xl"
                    glow
                    loading={verifyPending}
                    onClick={handlePay}
                    icon={<CreditCard className="w-5 h-5" />}
                    iconRight={<ArrowRight className="w-5 h-5" />}
                  >
                    Pay {formatCurrency(orderData.amount / 100)} Securely
                  </Button>

                  <button onClick={() => setStep('details')} className="w-full text-center text-sm text-tx-muted hover:text-tx-secondary mt-4 transition-colors">
                    ← Back to details
                  </button>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Order summary sidebar */}
          <div className="space-y-4">
            {quotesLoading ? (
              <div className="h-64 shimmer rounded-2xl" />
            ) : quote ? (
              <Card>
                <h3 className="font-display font-semibold text-tx-primary mb-4">Order Summary</h3>
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-brand-400/10 border border-brand-400/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-brand-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-tx-primary">{quote.policy?.name}</p>
                    <p className="text-xs text-tx-muted">{quote.policy?.insurer?.name}</p>
                  </div>
                </div>

                <div className="space-y-2.5 mb-5">
                  {[
                    { label: 'Base Premium',  value: formatCurrency(quote.annualPremium) },
                    { label: 'GST (18%)',      value: formatCurrency(quote.gstAmount), muted: true },
                  ].map(({ label, value, muted }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className={muted ? 'text-tx-muted' : 'text-tx-secondary'}>{label}</span>
                      <span className={muted ? 'text-tx-muted' : 'text-tx-primary font-medium'}>{value}</span>
                    </div>
                  ))}
                  <div className="h-px bg-bd-base" />
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-tx-primary">Total</span>
                    <span className="text-lg font-display font-bold text-tx-primary">{formatCurrency(quote.totalPremium)}</span>
                  </div>
                </div>

                <Badge variant="success" dot className="w-full justify-center">
                  Quote valid until {formatDate(quote.expiresAt)}
                </Badge>
              </Card>
            ) : null}

            <Card className="border-neon-green/20 bg-neon-green/5">
              <h3 className="text-sm font-semibold text-neon-green mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> What you get
              </h3>
              {['Instant policy issuance', 'Digital policy document', 'WhatsApp + Email alerts', '24/7 claims support', 'Free renewal reminders'].map((item) => (
                <div key={item} className="flex items-center gap-2 mb-2 last:mb-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-neon-green flex-shrink-0" />
                  <span className="text-xs text-tx-secondary">{item}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

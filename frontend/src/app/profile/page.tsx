'use client'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import {
  User, Mail, Phone, MapPin, Heart, DollarSign,
  ShieldCheck, Camera, Save, AlertTriangle,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUpdateProfile } from '@/hooks/useUser'
import { useMe } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Card'
import { getInitials } from '@/lib/utils'

const schema = z.object({
  fullName:       z.string().min(2, 'Required'),
  phone:          z.string().optional(),
  age:            z.coerce.number().min(1).max(100).optional(),
  gender:         z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  city:           z.string().optional(),
  state:          z.string().optional(),
  pincode:        z.string().optional(),
  incomeBracket:  z.string().optional(),
  cityTier:       z.string().optional(),
  familyMembers:  z.coerce.number().min(1).max(20).optional(),
  monthlyBudget:  z.coerce.number().min(0).optional(),
  isSmoker:       z.boolean().optional(),
  hasDiabetes:    z.boolean().optional(),
  hasHypertension:z.boolean().optional(),
  hasHeartDisease:z.boolean().optional(),
})
type FormData = z.infer<typeof schema>

const INCOME_OPTIONS = [
  { value: 'BELOW_3L',    label: 'Below ₹3 Lakh' },
  { value: '3L_TO_6L',    label: '₹3L – ₹6L' },
  { value: '6L_TO_10L',   label: '₹6L – ₹10L' },
  { value: '10L_TO_20L',  label: '₹10L – ₹20L' },
  { value: 'ABOVE_20L',   label: 'Above ₹20L' },
]

const CITY_TIER_OPTIONS = [
  { value: 'TIER_1', label: 'Tier 1 (Metro)' },
  { value: 'TIER_2', label: 'Tier 2' },
  { value: 'TIER_3', label: 'Tier 3 / Rural' },
]

export default function ProfilePage() {
  const { user } = useAuthStore()
  const { refetch } = useMe()
  const { mutate: updateProfile, isPending } = useUpdateProfile()

  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (user) {
      reset({
        fullName:        user.fullName || '',
        phone:           user.phone   || '',
        age:             user.profile?.age,
        gender:          user.profile?.gender,
        city:            user.profile?.city || '',
        state:           user.profile?.state || '',
        pincode:         user.profile?.pincode || '',
        incomeBracket:   user.profile?.incomeBracket || '',
        cityTier:        user.profile?.cityTier || '',
        familyMembers:   user.profile?.familyMembers || 1,
        monthlyBudget:   user.profile?.monthlyBudget,
        isSmoker:        user.profile?.isSmoker || false,
        hasDiabetes:     user.profile?.hasDiabetes || false,
        hasHypertension: user.profile?.hasHypertension || false,
        hasHeartDisease: user.profile?.hasHeartDisease || false,
      })
    }
  }, [user, reset])

  const onSubmit = (data: FormData) => {
    updateProfile(data, { onSuccess: () => refetch() })
  }

  const profileCompletion = () => {
    const fields = [user?.fullName, user?.phone, user?.profile?.age, user?.profile?.city, user?.profile?.incomeBracket]
    const filled = fields.filter(Boolean).length
    return Math.round((filled / fields.length) * 100)
  }

  return (
    <div className="min-h-screen pt-20 pb-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display font-bold text-3xl text-tx-primary mb-1">Your Profile</h1>
          <p className="text-tx-secondary">Keep your details accurate for better recommendations and faster claims.</p>
        </motion.div>

        {/* Avatar + completion */}
        <Card className="mb-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-brand-gradient flex items-center justify-center text-xl font-bold text-white shadow-glow-sm">
                {user ? getInitials(user.fullName) : '?'}
              </div>
              <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-bg-elevated border border-bd-base flex items-center justify-center text-tx-muted hover:text-tx-primary transition-colors">
                <Camera className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-tx-primary">{user?.fullName}</p>
              <p className="text-sm text-tx-muted">{user?.email}</p>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant={user?.isEmailVerified ? 'success' : 'warning'} dot>
                  {user?.isEmailVerified ? 'Email Verified' : 'Unverified'}
                </Badge>
                <Badge variant={user?.profile?.kycVerified ? 'success' : 'default'} dot>
                  {user?.profile?.kycVerified ? 'KYC Done' : 'KYC Pending'}
                </Badge>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-2xl font-display font-bold text-tx-primary">{profileCompletion()}%</p>
              <p className="text-xs text-tx-muted mb-2">Profile complete</p>
              <div className="w-24 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${profileCompletion()}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full bg-brand-gradient rounded-full"
                />
              </div>
            </div>
          </div>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal */}
          <Card>
            <h2 className="font-display font-semibold text-lg text-tx-primary mb-5 flex items-center gap-2">
              <User className="w-4 h-4 text-brand-400" />
              Personal Information
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Full Name" leftIcon={<User className="w-4 h-4" />} error={errors.fullName?.message} {...register('fullName')} />
              <Input label="Phone Number" type="tel" leftIcon={<Phone className="w-4 h-4" />} {...register('phone')} />
              <Input label="Age" type="number" placeholder="30" error={errors.age?.message} {...register('age')} />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-tx-secondary">Gender</label>
                <select className="w-full h-11 bg-bg-elevated border border-bd-base rounded-xl text-tx-primary text-sm px-4 focus:outline-none focus:ring-2 focus:ring-brand-400/40 transition-all" {...register('gender')}>
                  <option value="">Prefer not to say</option>
                  <option value="MALE" className="bg-bg-elevated">Male</option>
                  <option value="FEMALE" className="bg-bg-elevated">Female</option>
                  <option value="OTHER" className="bg-bg-elevated">Other</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Location */}
          <Card>
            <h2 className="font-display font-semibold text-lg text-tx-primary mb-5 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-400" />
              Location
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <Input label="City" placeholder="Mumbai" {...register('city')} />
              <Input label="State" placeholder="Maharashtra" {...register('state')} />
              <Input label="PIN Code" placeholder="400001" {...register('pincode')} />
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-tx-secondary block mb-1.5">City Tier</label>
              <div className="flex gap-2 flex-wrap">
                {CITY_TIER_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value={opt.value} className="accent-brand-400" {...register('cityTier')} />
                    <span className="text-sm text-tx-secondary">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </Card>

          {/* Financial */}
          <Card>
            <h2 className="font-display font-semibold text-lg text-tx-primary mb-5 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-brand-400" />
              Financial Profile
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-tx-secondary block mb-1.5">Annual Income</label>
                <select className="w-full h-11 bg-bg-elevated border border-bd-base rounded-xl text-tx-primary text-sm px-4 focus:outline-none focus:ring-2 focus:ring-brand-400/40 transition-all" {...register('incomeBracket')}>
                  <option value="">Select bracket</option>
                  {INCOME_OPTIONS.map((o) => <option key={o.value} value={o.value} className="bg-bg-elevated">{o.label}</option>)}
                </select>
              </div>
              <Input label="Monthly Insurance Budget (₹)" type="number" placeholder="2000" {...register('monthlyBudget')} />
              <Input label="Family Members to Cover" type="number" placeholder="1" {...register('familyMembers')} />
            </div>
          </Card>

          {/* Health */}
          <Card>
            <h2 className="font-display font-semibold text-lg text-tx-primary mb-2 flex items-center gap-2">
              <Heart className="w-4 h-4 text-brand-400" />
              Health Information
            </h2>
            <p className="text-xs text-tx-muted mb-5">
              Used only for recommendation accuracy. Never shared without consent.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { key: 'isSmoker',        label: 'I am a smoker' },
                { key: 'hasDiabetes',     label: 'Diagnosed with Diabetes' },
                { key: 'hasHypertension', label: 'Diagnosed with Hypertension' },
                { key: 'hasHeartDisease', label: 'Diagnosed with Heart Disease' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 p-3 rounded-xl border border-bd-subtle hover:border-bd-strong cursor-pointer transition-all group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-brand-400"
                    {...register(key as keyof FormData)}
                  />
                  <span className="text-sm text-tx-secondary group-hover:text-tx-primary transition-colors">{label}</span>
                </label>
              ))}
            </div>
          </Card>

          {/* KYC reminder */}
          {!user?.profile?.kycVerified && (
            <div className="flex items-start gap-3 p-4 bg-neon-amber/5 border border-neon-amber/20 rounded-2xl">
              <AlertTriangle className="w-5 h-5 text-neon-amber flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-tx-primary mb-1">KYC Verification Pending</p>
                <p className="text-xs text-tx-secondary mb-3">
                  Complete KYC to speed up claims and unlock higher coverage limits.
                </p>
                <Button variant="secondary" size="sm" icon={<ShieldCheck className="w-4 h-4" />}>
                  Verify KYC Now
                </Button>
              </div>
            </div>
          )}

          {/* Save */}
          <div className="flex items-center justify-between pt-2">
            {isDirty && (
              <p className="text-xs text-neon-amber flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                You have unsaved changes
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              className="ml-auto"
              loading={isPending}
              disabled={!isDirty}
              icon={<Save className="w-4 h-4" />}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

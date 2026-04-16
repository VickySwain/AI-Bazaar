'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, CheckCircle2, User, DollarSign, Heart, Shield, Users, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

interface QuizData {
  age: string
  income: string
  familySize: string
  insuranceType: string
  budget: string
  medicalCondition: string
  occupation: string
  coverageAmount: string
}

const STEPS = [
  {
    id: 'insuranceType',
    title: 'What are you looking for?',
    subtitle: 'Select the type of insurance you need',
    icon: Shield,
    type: 'select',
    options: [
      { value: 'HEALTH', label: 'Health Insurance', emoji: '🏥', desc: 'Medical expenses coverage' },
      { value: 'TERM', label: 'Term Life', emoji: '🛡️', desc: 'Life cover for family' },
      { value: 'LIFE', label: 'Life / Savings', emoji: '💰', desc: 'Protection + savings' },
      { value: 'MOTOR', label: 'Motor Insurance', emoji: '🚗', desc: 'Vehicle protection' },
      { value: 'TRAVEL', label: 'Travel Insurance', emoji: '✈️', desc: 'Trip protection' },
    ],
  },
  {
    id: 'age',
    title: 'How old are you?',
    subtitle: 'Age helps us find age-appropriate plans',
    icon: User,
    type: 'select',
    options: [
      { value: '18-25', label: '18 - 25 years', emoji: '🧑', desc: 'Young & energetic' },
      { value: '26-35', label: '26 - 35 years', emoji: '👨', desc: 'Building your career' },
      { value: '36-45', label: '36 - 45 years', emoji: '👨‍💼', desc: 'Peak earning years' },
      { value: '46-55', label: '46 - 55 years', emoji: '🧓', desc: 'Planning ahead' },
      { value: '55+', label: '55+ years', emoji: '👴', desc: 'Senior care' },
    ],
  },
  {
    id: 'income',
    title: 'What is your annual income?',
    subtitle: 'We use this to suggest affordable premiums',
    icon: DollarSign,
    type: 'select',
    options: [
      { value: 'below-3L', label: 'Below ₹3 Lakh', emoji: '💵', desc: 'Budget-friendly plans' },
      { value: '3L-7L', label: '₹3L - ₹7 Lakh', emoji: '💰', desc: 'Mid-range plans' },
      { value: '7L-15L', label: '₹7L - ₹15 Lakh', emoji: '💎', desc: 'Premium plans' },
      { value: '15L+', label: 'Above ₹15 Lakh', emoji: '🏆', desc: 'Elite coverage' },
    ],
  },
  {
    id: 'familySize',
    title: 'What is your family situation?',
    subtitle: 'Family size affects coverage requirements',
    icon: Users,
    type: 'select',
    options: [
      { value: 'single', label: 'Single', emoji: '🧍', desc: 'Just me' },
      { value: 'married', label: 'Married (No Kids)', emoji: '👫', desc: 'Me & spouse' },
      { value: 'family-small', label: 'Family (1-2 Kids)', emoji: '👨‍👩‍👦', desc: 'Small family' },
      { value: 'family-large', label: 'Family (3+ Kids)', emoji: '👨‍👩‍👧‍👦', desc: 'Large family' },
    ],
  },
  {
    id: 'budget',
    title: 'What is your monthly budget?',
    subtitle: 'How much can you spend on premium per month?',
    icon: DollarSign,
    type: 'select',
    options: [
      { value: 'below-500', label: 'Below ₹500/month', emoji: '💸', desc: 'Very affordable' },
      { value: '500-1500', label: '₹500 - ₹1,500/month', emoji: '💳', desc: 'Reasonable budget' },
      { value: '1500-3000', label: '₹1,500 - ₹3,000/month', emoji: '💰', desc: 'Good coverage' },
      { value: '3000+', label: 'Above ₹3,000/month', emoji: '🏆', desc: 'Premium coverage' },
    ],
  },
  {
    id: 'medicalCondition',
    title: 'Any pre-existing conditions?',
    subtitle: 'This helps find plans with right waiting periods',
    icon: Heart,
    type: 'select',
    options: [
      { value: 'none', label: 'None', emoji: '✅', desc: 'Perfectly healthy' },
      { value: 'diabetes', label: 'Diabetes', emoji: '🩺', desc: 'Managed condition' },
      { value: 'hypertension', label: 'Hypertension', emoji: '❤️', desc: 'Blood pressure' },
      { value: 'other', label: 'Other Conditions', emoji: '🏥', desc: 'Other health issues' },
    ],
  },
  {
    id: 'occupation',
    title: 'What do you do for work?',
    subtitle: 'Occupation affects premium calculation',
    icon: Briefcase,
    type: 'select',
    options: [
      { value: 'salaried', label: 'Salaried Employee', emoji: '👔', desc: 'Corporate / Govt job' },
      { value: 'business', label: 'Business Owner', emoji: '🏢', desc: 'Own business' },
      { value: 'self-employed', label: 'Self Employed', emoji: '💼', desc: 'Freelancer / Consultant' },
      { value: 'other', label: 'Other', emoji: '🌟', desc: 'Student / Homemaker etc' },
    ],
  },
]

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function InsuranceQuizModal({ isOpen, onClose }: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Partial<QuizData>>({})
  const router = useRouter()

  const step = STEPS[currentStep]
  const totalSteps = STEPS.length
  const progress = ((currentStep) / totalSteps) * 100

  const handleSelect = (value: string) => {
    const newAnswers = { ...answers, [step.id]: value }
    setAnswers(newAnswers)

    if (currentStep < totalSteps - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 300)
    } else {
      // Last step — build query and redirect
      handleFinish(newAnswers)
    }
  }

  const handleFinish = (finalAnswers: Partial<QuizData>) => {
    const params = new URLSearchParams()

    if (finalAnswers.insuranceType) params.set('category', finalAnswers.insuranceType)

    // Budget to price range mapping
    const budgetMap: Record<string, string> = {
      'below-500': 'below-5k',
      '500-1500': '5k-15k',
      '1500-3000': '15k-30k',
      '3000+': 'above-30k',
    }
    if (finalAnswers.budget) params.set('priceRange', budgetMap[finalAnswers.budget] || '')

    // Sort by popularity by default
    params.set('sortBy', 'popularityScore')
    params.set('sortOrder', 'DESC')

    onClose()
    router.push(`/policies?${params.toString()}`)
  }

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-bg-surface border border-bd-base rounded-3xl shadow-dialog w-full max-w-lg overflow-hidden">
              {/* Header */}
              <div className="p-6 pb-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-brand-gradient flex items-center justify-center">
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-tx-secondary">
                      Step {currentStep + 1} of {totalSteps}
                    </span>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-tx-muted hover:text-tx-primary hover:bg-bg-elevated transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-bg-elevated rounded-full mb-6">
                  <motion.div
                    className="h-full bg-brand-gradient rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h2 className="font-display font-bold text-2xl text-tx-primary mb-1">
                      {step.title}
                    </h2>
                    <p className="text-sm text-tx-secondary mb-6">{step.subtitle}</p>

                    <div className="grid grid-cols-2 gap-3">
                      {step.options.map((option) => {
                        const isSelected = answers[step.id as keyof QuizData] === option.value
                        return (
                          <motion.button
                            key={option.value}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSelect(option.value)}
                            className={`relative p-4 rounded-2xl border text-left transition-all duration-200 ${
                              isSelected
                                ? 'bg-brand-400/10 border-brand-400/50 shadow-glow-sm'
                                : 'bg-bg-elevated border-bd-base hover:border-bd-strong hover:bg-bg-muted'
                            }`}
                          >
                            {isSelected && (
                              <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-brand-400" />
                            )}
                            <span className="text-2xl mb-2 block">{option.emoji}</span>
                            <span className="text-sm font-semibold text-tx-primary block mb-0.5">
                              {option.label}
                            </span>
                            <span className="text-xs text-tx-muted">{option.desc}</span>
                          </motion.button>
                        )
                      })}
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={handleBack}
                    disabled={currentStep === 0}
                    className="flex items-center gap-1.5 text-sm text-tx-muted hover:text-tx-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>

                  <span className="text-xs text-tx-muted">
                    Click an option to continue
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
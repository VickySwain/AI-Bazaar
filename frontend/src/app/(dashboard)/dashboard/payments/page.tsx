'use client'
import { motion } from 'framer-motion'
import { CreditCard, Download, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function PaymentsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-2xl text-tx-primary mb-1">
            Payments
          </h1>
          <p className="text-tx-secondary text-sm">
            View your payment history and transactions.
          </p>
        </div>

        {/* Empty State */}
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-400/10 border border-brand-400/20 flex items-center justify-center mb-4">
            <CreditCard className="w-6 h-6 text-brand-400" />
          </div>
          <h3 className="font-semibold text-tx-primary mb-2">No payments yet</h3>
          <p className="text-tx-secondary text-sm max-w-xs">
            Your payment history will appear here once you purchase a policy.
          </p>
        </Card>
      </motion.div>
    </div>
  )
}
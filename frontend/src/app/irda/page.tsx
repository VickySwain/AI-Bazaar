import { Shield, CheckCircle, FileText, Award } from 'lucide-react'

export const metadata = {
  title: 'IRDAI Registration — Market Prime Capital',
  description: 'IRDAI Registration details for Market Prime Capital insurance platform.',
}

export default function IrdaPage() {
  return (
    <div className="min-h-screen bg-bg-base py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            IRDAI Registered Broker
          </div>
          <h1 className="font-display font-bold text-4xl text-tx-primary mb-4">IRDAI Registration</h1>
          <p className="text-tx-secondary text-lg">Market Prime Capital is a registered insurance broker under the Insurance Regulatory and Development Authority of India (IRDAI).</p>
        </div>

        {/* Registration Card */}
        <div className="bg-bg-surface border border-bd-subtle rounded-2xl p-8 mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow-sm">
              <Award className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-display font-semibold text-xl text-tx-primary">Registration Details</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'Company Name', value: 'Market Prime Capital Pvt. Ltd.' },
              { label: 'IRDAI Registration Number', value: 'XXX (Pending)' },
              { label: 'Registration Type', value: 'Direct Broker (Life & General)' },
              { label: 'Valid Until', value: 'Pending Approval' },
              { label: 'CIN', value: 'U67200MH2024PTC000000' },
              { label: 'PAN', value: 'XXXXXXX' },
            ].map(({ label, value }) => (
              <div key={label} className="p-4 bg-bg-elevated border border-bd-subtle rounded-xl">
                <p className="text-tx-muted text-sm mb-1">{label}</p>
                <p className="text-tx-primary font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What IRDAI Means */}
        <div className="bg-bg-surface border border-bd-subtle rounded-2xl p-8 mb-10">
          <h2 className="font-display font-semibold text-xl text-tx-primary mb-6">What is IRDAI?</h2>
          <p className="text-tx-secondary leading-relaxed mb-4">
            The Insurance Regulatory and Development Authority of India (IRDAI) is the apex body that regulates and promotes the insurance industry in India. It was established under the Insurance Regulatory and Development Authority Act, 1999.
          </p>
          <p className="text-tx-secondary leading-relaxed">
            IRDAI protects the interests of policyholders, ensures the orderly growth of the insurance industry, and maintains financial soundness of insurance companies. All insurance brokers and companies must be registered with IRDAI to legally operate in India.
          </p>
        </div>

        {/* Compliance */}
        <div className="bg-bg-surface border border-bd-subtle rounded-2xl p-8 mb-10">
          <h2 className="font-display font-semibold text-xl text-tx-primary mb-6">Our Compliance Commitments</h2>
          <div className="space-y-4">
            {[
              'We act in the best interest of our customers at all times',
              'We disclose all commissions and fees transparently',
              'We maintain strict data privacy and security standards',
              'We do not engage in mis-selling or misleading practices',
              'We handle all customer grievances within IRDAI mandated timelines',
              'We maintain adequate professional indemnity insurance',
              'We undergo regular audits as required by IRDAI',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-neon-green flex-shrink-0 mt-0.5" />
                <p className="text-tx-secondary">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Grievance */}
        <div className="bg-bg-surface border border-bd-subtle rounded-2xl p-8 mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow-sm">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-display font-semibold text-xl text-tx-primary">Grievance Redressal</h2>
          </div>
          <p className="text-tx-secondary mb-6">If you have a complaint or grievance, you can reach us through the following channels:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-bg-elevated border border-bd-subtle rounded-xl">
              <p className="font-semibold text-tx-primary mb-2">Grievance Officer</p>
              <p className="text-tx-secondary text-sm">Name: Rahul Mehta</p>
              <p className="text-tx-secondary text-sm">Email: <a href="mailto:grievance@marketprimecapital.in" className="text-brand-400 hover:underline">grievance@marketprimecapital.in</a></p>
              <p className="text-tx-secondary text-sm">Phone: +91 1800-XXX-XXXX</p>
            </div>
            <div className="p-4 bg-bg-elevated border border-bd-subtle rounded-xl">
              <p className="font-semibold text-tx-primary mb-2">IRDAI Grievance Cell</p>
              <p className="text-tx-secondary text-sm">Toll Free: 155255</p>
              <p className="text-tx-secondary text-sm">Email: <a href="mailto:complaints@irdai.gov.in" className="text-brand-400 hover:underline">complaints@irdai.gov.in</a></p>
              <p className="text-tx-secondary text-sm">Website: <a href="https://www.irdai.gov.in" className="text-brand-400 hover:underline" target="_blank" rel="noopener noreferrer">www.irdai.gov.in</a></p>
            </div>
          </div>
          <p className="text-tx-muted text-sm mt-4">We endeavour to resolve all grievances within 14 working days as per IRDAI guidelines.</p>
        </div>

        {/* Note */}
        <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <p className="text-yellow-400 font-semibold mb-2">Important Notice</p>
          <p className="text-tx-secondary text-sm">Insurance is the subject matter of solicitation. Market Prime Capital is an IRDAI registered broker. Registration with IRDAI does not guarantee the performance of the insurance company or the terms of the policy. Please read all policy documents carefully before purchasing.</p>
        </div>

      </div>
    </div>
  )
}
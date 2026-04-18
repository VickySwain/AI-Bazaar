export const metadata = {
  title: 'Privacy Policy — Market Prime Capital',
  description: 'Privacy Policy for Market Prime Capital insurance platform.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg-base py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="font-display font-bold text-4xl text-tx-primary mb-4">Privacy Policy</h1>
          <p className="text-tx-muted">Last updated: April 19, 2026</p>
        </div>

        <div className="space-y-10 text-tx-secondary leading-relaxed">

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">1. Introduction</h2>
            <p>Market Prime Capital ("we", "our", or "us") is committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">2. Information We Collect</h2>
            <p className="mb-4">We collect information that you provide directly to us, including:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Personal identification information (name, email address, phone number)</li>
              <li>Date of birth and age</li>
              <li>Financial information (income range, for insurance recommendations)</li>
              <li>Health information (for health insurance recommendations only)</li>
              <li>Payment information (processed securely via Razorpay)</li>
              <li>Device and usage information (IP address, browser type, pages visited)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide, operate, and improve our services</li>
              <li>Generate personalized insurance recommendations</li>
              <li>Process transactions and send related information</li>
              <li>Send administrative information and policy updates</li>
              <li>Respond to customer service requests</li>
              <li>Comply with legal obligations</li>
              <li>Detect and prevent fraudulent transactions</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">4. Information Sharing</h2>
            <p className="mb-4">We do not sell, trade, or rent your personal information to third parties. We may share your information with:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong className="text-tx-primary">Insurance Partners:</strong> To process your policy applications and claims</li>
              <li><strong className="text-tx-primary">Payment Processors:</strong> Razorpay, for secure payment processing</li>
              <li><strong className="text-tx-primary">Service Providers:</strong> Cloud hosting, analytics, and customer support tools</li>
              <li><strong className="text-tx-primary">Legal Authorities:</strong> When required by law or to protect our rights</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">5. Data Security</h2>
            <p>We implement industry-standard security measures including 256-bit SSL encryption, secure data storage, and regular security audits to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">6. Cookies</h2>
            <p>We use cookies and similar tracking technologies to enhance your experience on our platform. You can control cookie settings through your browser preferences. For more details, please read our <a href="/cookies" className="text-brand-400 hover:underline">Cookie Policy</a>.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">7. Your Rights</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your personal data</li>
              <li>Opt out of marketing communications</li>
              <li>Data portability</li>
            </ul>
            <p className="mt-4">To exercise these rights, contact us at <a href="mailto:privacy@marketprimecapital.in" className="text-brand-400 hover:underline">privacy@marketprimecapital.in</a></p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">8. Data Retention</h2>
            <p>We retain your personal information for as long as necessary to provide our services and comply with legal obligations. Policy-related data is retained for a minimum of 7 years as required by IRDAI regulations.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">9. Children's Privacy</h2>
            <p>Our services are not directed to children under 18 years of age. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such information, please contact us immediately.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of our services after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">11. Contact Us</h2>
            <p>If you have questions about this Privacy Policy, please contact us:</p>
            <div className="mt-4 p-6 bg-bg-surface border border-bd-subtle rounded-xl">
              <p className="font-semibold text-tx-primary">Market Prime Capital Pvt. Ltd.</p>
              <p className="mt-2">Email: <a href="mailto:privacy@marketprimecapital.in" className="text-brand-400 hover:underline">privacy@marketprimecapital.in</a></p>
              <p>Phone: +91 1800-XXX-XXXX</p>
              <p>Address: Mumbai, Maharashtra, India</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
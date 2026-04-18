export const metadata = {
  title: 'Terms of Service — Market Prime Capital',
  description: 'Terms of Service for Market Prime Capital insurance platform.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg-base py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="font-display font-bold text-4xl text-tx-primary mb-4">Terms of Service</h1>
          <p className="text-tx-muted">Last updated: April 19, 2026</p>
        </div>

        <div className="space-y-10 text-tx-secondary leading-relaxed">

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">1. Acceptance of Terms</h2>
            <p>By accessing or using Market Prime Capital's website and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services. These terms apply to all visitors, users, and others who access or use our platform.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">2. Description of Services</h2>
            <p className="mb-4">Market Prime Capital provides an online insurance aggregation and comparison platform that allows users to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Compare insurance policies from multiple insurers</li>
              <li>Receive AI-powered personalized insurance recommendations</li>
              <li>Purchase insurance policies online</li>
              <li>Manage existing insurance policies</li>
              <li>File and track insurance claims</li>
            </ul>
            <p className="mt-4">We act as an insurance broker/aggregator and are not an insurance company. All policies are underwritten by IRDAI-registered insurance companies.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">3. User Accounts</h2>
            <p className="mb-4">To use certain features of our platform, you must create an account. You agree to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and update your information to keep it accurate</li>
              <li>Keep your password confidential and secure</li>
              <li>Notify us immediately of any unauthorized access to your account</li>
              <li>Be responsible for all activities that occur under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">4. Insurance Purchases</h2>
            <p className="mb-4">When purchasing insurance through our platform:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>You must provide accurate information to the insurer</li>
              <li>Misrepresentation may result in policy cancellation or claim rejection</li>
              <li>Premium amounts are determined by the insurance company</li>
              <li>Policy terms and conditions are governed by the respective insurer</li>
              <li>We facilitate the purchase but are not a party to the insurance contract</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">5. Payment Terms</h2>
            <p>All payments are processed securely through Razorpay. By making a payment, you authorize us to charge the specified amount. Premiums paid are non-refundable except as provided by the insurer's cancellation policy and applicable law. All prices are in Indian Rupees (INR) and inclusive of applicable taxes.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">6. Prohibited Activities</h2>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Use our services for any unlawful purpose</li>
              <li>Provide false or misleading information</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt our services</li>
              <li>Use automated tools to scrape or collect data from our platform</li>
              <li>Impersonate any person or entity</li>
              <li>Engage in any fraudulent activity</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">7. Intellectual Property</h2>
            <p>All content on our platform, including text, graphics, logos, and software, is the property of Market Prime Capital or its licensors and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">8. Disclaimer of Warranties</h2>
            <p>Our services are provided "as is" and "as available" without warranties of any kind. We do not warrant that our services will be uninterrupted, error-free, or completely secure. Insurance recommendations are based on the information you provide and should not be considered professional financial advice.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Market Prime Capital shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services. Our total liability shall not exceed the amount paid by you in the three months preceding the claim.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">10. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">11. Changes to Terms</h2>
            <p>We reserve the right to modify these terms at any time. We will provide notice of significant changes by updating the date at the top of this page. Your continued use of our services after changes constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">12. Contact Us</h2>
            <p>For questions about these Terms of Service, contact us:</p>
            <div className="mt-4 p-6 bg-bg-surface border border-bd-subtle rounded-xl">
              <p className="font-semibold text-tx-primary">Market Prime Capital Pvt. Ltd.</p>
              <p className="mt-2">Email: <a href="mailto:legal@marketprimecapital.in" className="text-brand-400 hover:underline">legal@marketprimecapital.in</a></p>
              <p>Phone: +91 1800-XXX-XXXX</p>
              <p>Address: Mumbai, Maharashtra, India</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
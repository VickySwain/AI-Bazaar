export const metadata = {
  title: 'Cookie Policy — Market Prime Capital',
  description: 'Cookie Policy for Market Prime Capital insurance platform.',
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-bg-base py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="font-display font-bold text-4xl text-tx-primary mb-4">Cookie Policy</h1>
          <p className="text-tx-muted">Last updated: April 19, 2026</p>
        </div>

        <div className="space-y-10 text-tx-secondary leading-relaxed">

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">1. What Are Cookies?</h2>
            <p>Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently, provide a better user experience, and give website owners useful information about how their site is being used.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">2. How We Use Cookies</h2>
            <p className="mb-4">Market Prime Capital uses cookies to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Keep you signed in to your account</li>
              <li>Remember your preferences and settings</li>
              <li>Understand how you use our platform</li>
              <li>Improve our services based on usage patterns</li>
              <li>Ensure the security of your session</li>
              <li>Provide personalized insurance recommendations</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">3. Types of Cookies We Use</h2>
            <div className="space-y-6">
              <div className="p-6 bg-bg-surface border border-bd-subtle rounded-xl">
                <h3 className="font-semibold text-tx-primary mb-2">Essential Cookies</h3>
                <p>These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and account authentication. You cannot opt out of these cookies.</p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-bd-subtle">
                        <th className="text-left py-2 text-tx-primary font-medium">Cookie Name</th>
                        <th className="text-left py-2 text-tx-primary font-medium">Purpose</th>
                        <th className="text-left py-2 text-tx-primary font-medium">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bd-subtle">
                      <tr>
                        <td className="py-2 font-mono text-xs">mpc-auth</td>
                        <td className="py-2">Authentication token</td>
                        <td className="py-2">7 days</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-xs">session_id</td>
                        <td className="py-2">Session management</td>
                        <td className="py-2">Session</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-6 bg-bg-surface border border-bd-subtle rounded-xl">
                <h3 className="font-semibold text-tx-primary mb-2">Performance Cookies</h3>
                <p>These cookies collect information about how visitors use our website. All information collected is aggregated and anonymous. We use this data to improve how our website works.</p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-bd-subtle">
                        <th className="text-left py-2 text-tx-primary font-medium">Cookie Name</th>
                        <th className="text-left py-2 text-tx-primary font-medium">Purpose</th>
                        <th className="text-left py-2 text-tx-primary font-medium">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bd-subtle">
                      <tr>
                        <td className="py-2 font-mono text-xs">_ga</td>
                        <td className="py-2">Google Analytics</td>
                        <td className="py-2">2 years</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-xs">_gid</td>
                        <td className="py-2">Google Analytics</td>
                        <td className="py-2">24 hours</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-6 bg-bg-surface border border-bd-subtle rounded-xl">
                <h3 className="font-semibold text-tx-primary mb-2">Functional Cookies</h3>
                <p>These cookies allow the website to remember choices you make and provide enhanced, personalized features such as your preferred language, region, and insurance preferences.</p>
              </div>

              <div className="p-6 bg-bg-surface border border-bd-subtle rounded-xl">
                <h3 className="font-semibold text-tx-primary mb-2">Marketing Cookies</h3>
                <p>These cookies track your browsing habits to enable us to show advertising which is more likely to be of interest to you. They are also used to limit the number of times you see an advertisement.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">4. Managing Cookies</h2>
            <p className="mb-4">You can control and manage cookies in various ways:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong className="text-tx-primary">Browser Settings:</strong> Most browsers allow you to refuse or accept cookies through their settings</li>
              <li><strong className="text-tx-primary">Opt-out Tools:</strong> You can opt out of Google Analytics at <a href="https://tools.google.com/dlpage/gaoptout" className="text-brand-400 hover:underline" target="_blank" rel="noopener noreferrer">tools.google.com/dlpage/gaoptout</a></li>
              <li><strong className="text-tx-primary">Device Settings:</strong> Mobile devices have settings to limit ad tracking</li>
            </ul>
            <p className="mt-4">Please note that disabling certain cookies may affect the functionality of our website and your user experience.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">5. Third-Party Cookies</h2>
            <p>Some cookies on our website are set by third-party services. These include payment processors (Razorpay), analytics providers (Google Analytics), and authentication services (Google OAuth). These third parties have their own privacy policies governing the use of such cookies.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">6. Updates to This Policy</h2>
            <p>We may update this Cookie Policy from time to time to reflect changes in technology or regulations. We encourage you to review this policy periodically.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-2xl text-tx-primary mb-4">7. Contact Us</h2>
            <p>For questions about our use of cookies, contact us:</p>
            <div className="mt-4 p-6 bg-bg-surface border border-bd-subtle rounded-xl">
              <p className="font-semibold text-tx-primary">Market Prime Capital Pvt. Ltd.</p>
              <p className="mt-2">Email: <a href="mailto:privacy@marketprimecapital.in" className="text-brand-400 hover:underline">privacy@marketprimecapital.in</a></p>
              <p>Phone: +91 1800-XXX-XXXX</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
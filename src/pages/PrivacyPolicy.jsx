import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-6">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-pink-400 bg-clip-text text-transparent mb-4">
            Privacy Policy
          </h1>
          <p className="text-zinc-400 text-lg">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
            <p>
              Dreava Art NFT Launchpad ("we," "our," or "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
              when you use our NFT marketplace and related services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-white mb-2">2.1 Personal Information</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Wallet addresses and public keys</li>
                  <li>Email addresses (if provided)</li>
                  <li>Username or display names</li>
                  <li>Profile information and avatars</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-medium text-white mb-2">2.2 Transaction Data</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>NFT minting transactions</li>
                  <li>Purchase and sale history</li>
                  <li>Bidding and auction data</li>
                  <li>Gas fees and transaction hashes</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-medium text-white mb-2">2.3 Technical Information</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>IP addresses and device information</li>
                  <li>Browser type and version</li>
                  <li>Operating system</li>
                  <li>Usage analytics and performance data</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide and maintain our NFT marketplace services</li>
              <li>Process transactions and verify ownership</li>
              <li>Facilitate communication between users</li>
              <li>Improve our platform and user experience</li>
              <li>Comply with legal obligations and prevent fraud</li>
              <li>Send important updates and notifications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Information Sharing</h2>
            <p className="mb-4">
              We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>With your explicit consent</li>
              <li>To comply with legal requirements or court orders</li>
              <li>To protect our rights, property, or safety</li>
              <li>With service providers who assist in our operations</li>
              <li>In connection with a business transfer or merger</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Blockchain Transparency</h2>
            <p>
              Please note that blockchain transactions are inherently public and transparent. 
              Information such as wallet addresses, transaction amounts, and NFT ownership 
              is publicly visible on the blockchain and cannot be deleted or modified.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Cookies and Tracking</h2>
            <p className="mb-4">
              We use cookies and similar technologies to enhance your experience:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Essential cookies for platform functionality</li>
              <li>Analytics cookies to understand usage patterns</li>
              <li>Preference cookies to remember your settings</li>
              <li>Security cookies to protect against fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your information, 
              including encryption, secure servers, and regular security audits. 
              However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Your Rights</h2>
            <p className="mb-4">You have the following rights regarding your personal information:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access and review your personal data</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your personal data (where applicable)</li>
              <li>Object to processing of your data</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Children's Privacy</h2>
            <p>
              Our services are not intended for children under 13 years of age. 
              We do not knowingly collect personal information from children under 13. 
              If you are a parent or guardian and believe your child has provided us with personal information, 
              please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. International Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your own. 
              We ensure appropriate safeguards are in place to protect your information 
              in accordance with this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new Privacy Policy on this page and updating the "Last updated" date. 
              Your continued use of our services after any changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">12. Contact Us</h2>
            <p className="mb-4">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-zinc-800 p-4 rounded-lg">
              <p><strong>Email:</strong> privacy@dreava.art</p>
              <p><strong>Discord:</strong> <a href="https://discord.gg/R24uFV3k8b" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Join our Discord</a></p>
              <p><strong>Twitter:</strong> <a href="https://x.com/dreava_art" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">@dreava_art</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy; 
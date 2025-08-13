import { Link } from 'react-router-dom';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-6">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-pink-400 bg-clip-text text-transparent mb-4">
            Terms of Service
          </h1>
          <p className="text-zinc-400 text-lg">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Dreava Art NFT Launchpad ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement. 
              If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
            <p className="mb-4">
              Dreava Art NFT Launchpad is a decentralized platform that enables users to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Create and deploy NFT collections</li>
              <li>Mint NFTs from various collections</li>
              <li>Participate in whitelist and public sales</li>
              <li>Manage NFT metadata and distribution</li>
              <li>Interact with smart contracts on the Somnia network</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. User Accounts and Responsibilities</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-white mb-2">3.1 Account Creation</h3>
                <p>
                  To use our services, you must connect a compatible cryptocurrency wallet. 
                  You are responsible for maintaining the security of your wallet and private keys.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-medium text-white mb-2">3.2 User Conduct</h3>
                <p className="mb-2">You agree not to:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Use the platform for any illegal or unauthorized purpose</li>
                  <li>Violate any applicable laws or regulations</li>
                  <li>Infringe upon intellectual property rights</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Interfere with or disrupt the platform's operation</li>
                  <li>Create or distribute harmful content or malware</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. NFT Creation and Minting</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-white mb-2">4.1 Collection Creation</h3>
                <p>
                  When creating NFT collections, you represent and warrant that you have all necessary rights 
                  to the content you upload and that it does not infringe on any third-party rights.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-medium text-white mb-2">4.2 Content Guidelines</h3>
                <p className="mb-2">All content must comply with our community standards:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>No explicit, violent, or harmful content</li>
                  <li>No copyright or trademark infringement</li>
                  <li>No impersonation of others</li>
                  <li>No spam or misleading information</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-medium text-white mb-2">4.3 Minting Process</h3>
                <p>
                  Minting NFTs requires payment of gas fees and any applicable platform fees. 
                  All transactions are irreversible once confirmed on the blockchain.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Smart Contracts and Blockchain</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-white mb-2">5.1 Smart Contract Risks</h3>
                <p>
                  Our platform interacts with smart contracts on the Somnia blockchain. 
                  While we strive for security, smart contracts may contain bugs or vulnerabilities. 
                  You acknowledge these risks and use the platform at your own discretion.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-medium text-white mb-2">5.2 Blockchain Transactions</h3>
                <p>
                  All transactions are recorded on the blockchain and are publicly visible. 
                  We cannot reverse or modify blockchain transactions once they are confirmed.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-medium text-white mb-2">5.3 Network Issues</h3>
                <p>
                  We are not responsible for network congestion, delays, or failures on the Somnia network 
                  or any other blockchain network that may affect transaction processing.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Fees and Payments</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-white mb-2">6.1 Platform Fees</h3>
                <p>
                  We may charge fees for certain services, including but not limited to collection creation, 
                  whitelist management, and premium features. All fees are clearly displayed before transaction confirmation.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-medium text-white mb-2">6.2 Gas Fees</h3>
                <p>
                  Users are responsible for paying gas fees required for blockchain transactions. 
                  Gas fees are determined by network conditions and are not controlled by our platform.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-medium text-white mb-2">6.3 Payment Methods</h3>
                <p>
                  All payments must be made in STT (Somnia Token) or other supported cryptocurrencies. 
                  We do not accept traditional fiat currencies.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Intellectual Property</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-white mb-2">7.1 Platform Rights</h3>
                <p>
                  The platform, including its design, code, and content, is owned by Dreava Art and is protected 
                  by intellectual property laws. You may not copy, modify, or distribute our platform without permission.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-medium text-white mb-2">7.2 User Content</h3>
                <p>
                  You retain ownership of your NFT content. By using our platform, you grant us a limited license 
                  to display and promote your content as part of our services.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Privacy and Data Protection</h2>
            <p>
              Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the platform, 
              to understand our practices regarding the collection and use of your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Disclaimers and Limitations</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-white mb-2">9.1 Service Availability</h3>
                <p>
                  We strive to maintain high availability but do not guarantee uninterrupted access to our services. 
                  We may temporarily suspend services for maintenance or updates.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-medium text-white mb-2">9.2 No Investment Advice</h3>
                <p>
                  Our platform is not a financial advisor. NFT values are volatile and can fluctuate significantly. 
                  You should conduct your own research and consider consulting with financial professionals.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-medium text-white mb-2">9.3 Limitation of Liability</h3>
                <p>
                  To the maximum extent permitted by law, Dreava Art shall not be liable for any indirect, 
                  incidental, special, consequential, or punitive damages arising from your use of the platform.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Dreava Art, its officers, directors, employees, and agents 
              from any claims, damages, losses, or expenses arising from your use of the platform or violation of these terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Termination</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-white mb-2">11.1 Termination by User</h3>
                <p>
                  You may stop using our services at any time. However, blockchain transactions cannot be reversed.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-medium text-white mb-2">11.2 Termination by Platform</h3>
                <p>
                  We may terminate or suspend your access to the platform immediately, without prior notice, 
                  for conduct that we believe violates these terms or is harmful to other users or the platform.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">12. Governing Law and Disputes</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-white mb-2">12.1 Governing Law</h3>
                <p>
                  These terms shall be governed by and construed in accordance with the laws of the jurisdiction 
                  where Dreava Art is incorporated, without regard to conflict of law principles.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-medium text-white mb-2">12.2 Dispute Resolution</h3>
                <p>
                  Any disputes arising from these terms or your use of the platform shall be resolved through 
                  binding arbitration in accordance with the rules of the relevant arbitration association.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">13. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of significant changes 
              through the platform or other reasonable means. Your continued use of the platform after changes 
              constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">14. Contact Information</h2>
            <p className="mb-4">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-zinc-800 p-4 rounded-lg">
              <p><strong>Email:</strong> legal@dreava.art</p>
              <p><strong>Discord:</strong> <a href="https://discord.gg/R24uFV3k8b" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Join our Discord</a></p>
              <p><strong>Twitter:</strong> <a href="https://x.com/dreava_art" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">@dreava_art</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService; 
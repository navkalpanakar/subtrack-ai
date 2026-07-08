import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — SubTrack AI",
  description: "How SubTrack AI collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              <li><strong>Account data:</strong> Email address, name, phone number (optional), date of birth (optional), occupation (optional)</li>
              <li><strong>Subscription data:</strong> Names, amounts, billing cycles, and renewal dates of subscriptions you add</li>
              <li><strong>Location data:</strong> Country and city (from IP-based geolocation) for currency detection — not GPS coordinates unless you grant permission</li>
              <li><strong>Usage data:</strong> Points, streaks, gamification progress, app interactions</li>
              <li><strong>Payment data:</strong> Processed by Stripe — we never store your card details. We only store your Stripe customer ID and subscription status.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              <li>To track your subscriptions and provide spending insights</li>
              <li>To detect your local currency for accurate pricing</li>
              <li>To generate AI-powered savings recommendations using your subscription data</li>
              <li>To send verification codes via email (for login, email changes, and account deletion)</li>
              <li>To process premium subscription payments via Stripe</li>
              <li>To improve our AI insights and offer recommendations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Third-Party Services</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              <li><strong>Google OAuth:</strong> For Google sign-in (we access your email and name only)</li>
              <li><strong>Microsoft OAuth:</strong> For Microsoft sign-in (email and name only)</li>
              <li><strong>Apple Sign In:</strong> For Apple sign-in (email and name only)</li>
              <li><strong>Resend:</strong> For sending verification codes and notifications via email</li>
              <li><strong>Stripe:</strong> For processing premium subscription payments</li>
              <li><strong>AI Services (z-ai-web-dev-sdk):</strong> For natural language processing, receipt scanning, voice transcription, price verification, and insights generation</li>
              <li><strong>Web Search:</strong> For fetching live subscription prices and finding deals</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Data Storage & Security</h2>
            <p className="text-sm text-muted-foreground">
              Your data is stored in an encrypted database. All communication between your device and our servers
              uses HTTPS encryption. Authentication tokens are stored in your browser's localStorage (not cookies)
              to work across devices and iframes. We use industry-standard security practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Data Retention</h2>
            <p className="text-sm text-muted-foreground">
              We retain your data for as long as your account is active. You can delete your account at any time
              from Profile → Delete Account (requires email verification). Upon deletion, all your data —
              subscriptions, points, rewards, history — is permanently erased within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Your Rights</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              <li><strong>Access:</strong> View all your data in the Profile section</li>
              <li><strong>Edit:</strong> Update your name, email, phone, and preferences anytime</li>
              <li><strong>Delete:</strong> Permanently delete your account from Profile → Delete Account</li>
              <li><strong>Export:</strong> Contact us to export your data</li>
              <li><strong>Opt-out:</strong> Disable location detection in your browser settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Children's Privacy</h2>
            <p className="text-sm text-muted-foreground">
              SubTrack AI is not intended for children under 13. We do not knowingly collect data from children.
              If you believe a child has provided us with personal information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">8. Contact</h2>
            <p className="text-sm text-muted-foreground">
              For privacy questions or requests, contact: <strong>support@scanmymenu.in</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">9. Changes to This Policy</h2>
            <p className="text-sm text-muted-foreground">
              We may update this privacy policy from time to time. We will notify you of any changes by posting
              the new policy on this page and updating the "Last updated" date.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <a href="/" className="text-sm text-primary hover:underline">← Back to SubTrack AI</a>
        </div>
      </div>
    </div>
  );
}

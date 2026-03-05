export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-white/30 bg-white/10 p-6 shadow-xl backdrop-blur-md sm:p-10">
        <h1 className="text-3xl font-bold sm:text-4xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-white/80">Effective date: 1 January 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-white/90 sm:text-base">
          <section>
            <h2 className="text-xl font-semibold text-white">1. Who we are</h2>
            <p className="mt-2">
              Wurder (we, our, us) operates the website at wurder.co.uk and related game services.
              This Privacy Policy explains how we collect, use, and protect your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">2. Information we collect</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>Account details such as name, username, email address, and profile image.</li>
              <li>Gameplay information such as game history, scores, and session activity.</li>
              <li>Payment-related details required to process purchases (handled by secure payment providers).</li>
              <li>Technical information including device/browser type, IP address, and site usage analytics.</li>
              <li>Messages you send to us through contact forms or support channels.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">3. How we use your information</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>To provide and improve the Wurder experience and core game functionality.</li>
              <li>To manage user accounts, authentication, and platform security.</li>
              <li>To process payments and provide access to purchased products or features.</li>
              <li>To communicate with you about updates, support requests, and service notices.</li>
              <li>To monitor performance and prevent fraud, abuse, or unauthorized access.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">4. Sharing of information</h2>
            <p className="mt-2">
              We do not sell your personal information. We may share limited information with trusted service
              providers (for example, hosting, authentication, analytics, and payment processing) where needed
              to operate the service. These providers process data under contractual confidentiality and
              security obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">5. Data retention</h2>
            <p className="mt-2">
              We keep personal information only for as long as necessary to provide services, comply with legal
              obligations, resolve disputes, and enforce our agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">6. Your rights</h2>
            <p className="mt-2">
              Depending on your location, you may have rights to access, correct, delete, or restrict use of
              your personal data, and to object to or withdraw consent for certain processing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">7. Cookies and analytics</h2>
            <p className="mt-2">
              We use cookies and similar technologies to keep you signed in, remember preferences, and improve
              product performance. You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">8. Contact us</h2>
            <p className="mt-2">
              If you have questions about this Privacy Policy or your personal data, contact us at
              <a href="mailto:privacy@wurder.co.uk" className="ml-1 font-semibold text-yellow-300 hover:text-yellow-200">
                privacy@wurder.co.uk
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function DeleteAccountPage() {
  return (
    <section className="legal-shell">
      <article className="legal-card mx-auto max-w-4xl sm:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Account Deletion</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Delete your Wurder account</h1>
        <p className="mt-3 text-sm text-soft">Public URL: https://wurder.app/delete-account</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-soft sm:text-base">
          <section>
            <h2 className="text-xl font-semibold text-white">How to request deletion</h2>
            <p className="mt-2">
              Email us at
              <a
                href="mailto:privacy@wurder.app?subject=Account%20Deletion%20Request"
                className="ml-1 font-semibold text-amber-200 hover:text-amber-100"
              >
                privacy@wurder.app
              </a>
              with the subject line <span className="font-semibold text-white">Account Deletion Request</span> from
              the email address linked to your account. We may ask you to confirm ownership before we process
              the request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">What data is deleted</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>Your account profile data (name, username, email address, profile image).</li>
              <li>Your authentication records used to sign in to Wurder.</li>
              <li>Your saved in-app content and account-specific preferences.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">What data may be retained</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                Transaction and invoice records are retained for up to <span className="font-semibold text-white">7 years</span>
                to comply with legal, tax, and accounting requirements.
              </li>
              <li>
                Security and fraud-prevention logs may be retained for up to <span className="font-semibold text-white">12 months</span>
                for abuse prevention and platform safety.
              </li>
              <li>
                Fully aggregated and anonymized analytics that cannot identify you may be retained indefinitely.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Processing timeline</h2>
            <p className="mt-2">
              We aim to complete verified deletion requests within <span className="font-semibold text-white">30 days</span>.
              If additional time is required for legal or technical reasons, we will notify you.
            </p>
          </section>
        </div>
      </article>
    </section>
  );
}

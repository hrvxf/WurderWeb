export default function DeleteAccountPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-white/30 bg-white/10 p-6 shadow-xl backdrop-blur-md sm:p-10">
        <h1 className="text-3xl font-bold sm:text-4xl">Delete Your Wurder Account</h1>
        <p className="mt-3 text-sm text-white/80">Public URL: https://wurder.app/delete-account</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-white/90 sm:text-base">
          <section>
            <h2 className="text-xl font-semibold text-white">How to request deletion</h2>
            <p className="mt-2">
              Email us at
              <a
                href="mailto:privacy@wurder.app?subject=Account%20Deletion%20Request"
                className="ml-1 font-semibold text-yellow-300 hover:text-yellow-200"
              >
                privacy@wurder.app
              </a>
              with the subject line <span className="font-semibold">Account Deletion Request</span> from
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
                Transaction and invoice records are retained for up to <span className="font-semibold">7 years</span>
                to comply with legal, tax, and accounting requirements.
              </li>
              <li>
                Security and fraud-prevention logs may be retained for up to <span className="font-semibold">12 months</span>
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
              We aim to complete verified deletion requests within <span className="font-semibold">30 days</span>.
              If additional time is required for legal or technical reasons, we will notify you.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

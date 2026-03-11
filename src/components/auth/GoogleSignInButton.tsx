type GoogleSignInButtonProps = {
  onClick: () => void;
  loading?: boolean;
};

export default function GoogleSignInButton({ onClick, loading = false }: GoogleSignInButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <img src="/icons/google.svg" alt="" className="h-5 w-5" />
      <span>{loading ? "Signing in..." : "Continue with Google"}</span>
    </button>
  );
}

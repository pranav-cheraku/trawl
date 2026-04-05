import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-paper px-6">
      {/* Subtle grain texture */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }} />

      {/* Decorative line */}
      <div className="mb-12 h-px w-16 bg-teal" />

      <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-ink-muted">
        Product Intelligence
      </p>

      <h1 className="max-w-2xl text-balance text-center font-serif text-6xl leading-[1.1] tracking-tight text-ink md:text-7xl">
        Turn feedback into
        <br />
        <span className="text-teal">what to build next</span>
      </h1>

      <p className="mt-6 max-w-md text-balance text-center text-lg leading-relaxed text-ink-muted">
        Pull real App Store reviews, surface patterns with RAG, and generate
        prioritized product specs — all in 60 seconds.
      </p>

      <div className="mt-12 flex items-center gap-6">
        <Link
          href="/dashboard"
          className="group relative inline-flex items-center gap-2 bg-ink px-7 py-3.5 text-sm font-medium text-cream transition-all hover:bg-ink-light"
        >
          Open Dashboard
          <svg
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            fill="none"
            viewBox="0 0 14 14"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path d="M1 7h12M8 2l5 5-5 5" />
          </svg>
        </Link>
      </div>

      {/* Decorative bottom line */}
      <div className="mt-16 h-px w-16 bg-border" />
      <p className="mt-4 text-xs text-ink-faint">
        RAG-powered spec generation with full citation traceability
      </p>
    </main>
  );
}

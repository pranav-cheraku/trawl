import Link from "next/link";
import SignInButton from "@/components/sign-in-button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper font-sans text-ink">
      {/* Navigation */}
      <header className="border-b border-border bg-paper">
        <nav
          className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5" aria-label="Trawl home">
            <div className="flex h-7 w-7 items-center justify-center bg-ink">
              <span className="font-serif text-sm text-cream">T</span>
            </div>
            <span className="font-serif text-xl text-ink">Trawl</span>
          </Link>

          {/* Nav right */}
          <SignInButton className="border border-ink px-4 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-cream">
            Sign In
          </SignInButton>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border py-24 md:py-32">
        {/* Subtle grain texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          aria-hidden="true"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative mx-auto max-w-6xl px-6 text-center">
          {/* Decorative teal line */}
          <div className="mx-auto mb-10 h-px w-12 bg-teal" aria-hidden="true" />

          {/* Category label */}
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-ink-faint">
            Product Intelligence
          </p>

          {/* Main heading */}
          <h1 className="mx-auto max-w-3xl text-balance font-serif text-5xl leading-[1.1] tracking-tight text-ink md:text-6xl lg:text-7xl">
            Turn feedback into{" "}
            <span className="text-teal">what to build next</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-7 max-w-xl text-balance text-lg leading-relaxed text-ink-muted">
            Pull real App Store reviews, surface patterns with RAG, and generate
            prioritized product specs — all in 60 seconds.
          </p>

          {/* CTA */}
          <div className="mt-12 flex flex-col items-center gap-3">
            <SignInButton className="group inline-flex items-center gap-2 bg-ink px-8 py-3.5 text-sm font-medium text-cream transition-colors hover:bg-ink-light">
              Get Started
              <svg
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 14 14"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path d="M1 7h12M8 2l5 5-5 5" />
              </svg>
            </SignInButton>
            <p className="text-sm text-ink-faint">Free while in beta</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="border-b border-border bg-paper py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          {/* Section label */}
          <p className="mb-12 text-xs font-medium uppercase tracking-[0.2em] text-ink-faint">
            How It Works
          </p>

          <div className="grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-3">
            {/* Step 01 */}
            <div className="bg-white p-8">
              <p className="mb-4 font-serif text-3xl text-teal">01</p>
              <h3 className="mb-3 font-serif text-xl text-ink">Connect</h3>
              <p className="text-sm leading-relaxed text-ink-muted">
                Link your App Store app or upload CSVs, PDFs, and JSON files.
                Reviews are ingested and chunked automatically.
              </p>
            </div>

            {/* Step 02 */}
            <div className="bg-white p-8">
              <p className="mb-4 font-serif text-3xl text-teal">02</p>
              <h3 className="mb-3 font-serif text-xl text-ink">Explore</h3>
              <p className="text-sm leading-relaxed text-ink-muted">
                Ask questions in natural language. Get cited answers powered by
                RAG with full transparency into retrieved sources.
              </p>
            </div>

            {/* Step 03 */}
            <div className="bg-white p-8">
              <p className="mb-4 font-serif text-3xl text-teal">03</p>
              <h3 className="mb-3 font-serif text-xl text-ink">Build</h3>
              <p className="text-sm leading-relaxed text-ink-muted">
                Auto-generate prioritized product specs with acceptance criteria,
                user stories, and effort estimates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-b border-border bg-cream py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          {/* Section label */}
          <p className="mb-12 text-xs font-medium uppercase tracking-[0.2em] text-ink-faint">
            Features
          </p>

          <div className="grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1: App Store Connector */}
            <div className="bg-white p-6">
              <div className="mb-4 flex h-8 w-8 items-center justify-center border border-border">
                <svg
                  className="h-4 w-4 text-teal"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                  />
                </svg>
              </div>
              <h3 className="mb-2 font-serif text-lg text-ink">
                Live App Store Connector
              </h3>
              <p className="text-sm leading-relaxed text-ink-muted">
                Type an app name, pull hundreds of real reviews via iTunes RSS
                feed. Real data, not synthetic.
              </p>
            </div>

            {/* Feature 2: RAG-Powered Q&A */}
            <div className="bg-white p-6">
              <div className="mb-4 flex h-8 w-8 items-center justify-center border border-border">
                <svg
                  className="h-4 w-4 text-teal"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 font-serif text-lg text-ink">
                RAG-Powered Q&amp;A
              </h3>
              <p className="text-sm leading-relaxed text-ink-muted">
                Ask questions about your feedback corpus. Every answer includes
                inline citations traceable to source reviews.
              </p>
            </div>

            {/* Feature 3: Auto-Generated Specs */}
            <div className="bg-white p-6">
              <div className="mb-4 flex h-8 w-8 items-center justify-center border border-border">
                <svg
                  className="h-4 w-4 text-teal"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 font-serif text-lg text-ink">
                Auto-Generated Specs
              </h3>
              <p className="text-sm leading-relaxed text-ink-muted">
                Transform feedback themes into structured product specs with
                problem statements, user stories, and acceptance criteria.
              </p>
            </div>

            {/* Feature 4: Kanban Board */}
            <div className="bg-white p-6">
              <div className="mb-4 flex h-8 w-8 items-center justify-center border border-border">
                <svg
                  className="h-4 w-4 text-teal"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 font-serif text-lg text-ink">Kanban Board</h3>
              <p className="text-sm leading-relaxed text-ink-muted">
                Organize generated specs in a drag-and-drop Kanban board.
                Prioritize, reorder, and track your product roadmap.
              </p>
            </div>

            {/* Feature 5: RAG X-Ray */}
            <div className="bg-white p-6">
              <div className="mb-4 flex h-8 w-8 items-center justify-center border border-border">
                <svg
                  className="h-4 w-4 text-teal"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 font-serif text-lg text-ink">
                RAG X-Ray Panel
              </h3>
              <p className="text-sm leading-relaxed text-ink-muted">
                Full transparency into the AI&apos;s reasoning. See retrieved
                chunks, similarity scores, and citation mapping for every result.
              </p>
            </div>

            {/* Feature 6: Build Next */}
            <div className="bg-white p-6">
              <div className="mb-4 flex h-8 w-8 items-center justify-center border border-border">
                <svg
                  className="h-4 w-4 text-teal"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 font-serif text-lg text-ink">
                &ldquo;Build Next&rdquo; Analysis
              </h3>
              <p className="text-sm leading-relaxed text-ink-muted">
                Multi-query exploration that clusters themes, ranks by frequency
                and severity, and recommends what to build next.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="border-b border-border bg-paper py-24">
        <div className="mx-auto max-w-6xl px-6 text-center">
          {/* Decorative teal line */}
          <div className="mx-auto mb-10 h-px w-12 bg-teal" aria-hidden="true" />

          <h2 className="mx-auto max-w-2xl text-balance font-serif text-3xl leading-tight text-ink md:text-4xl">
            Ready to turn feedback into features?
          </h2>
          <p className="mx-auto mt-5 max-w-sm text-base leading-relaxed text-ink-muted">
            Start building your product roadmap in minutes, not months.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3">
            <SignInButton className="group inline-flex items-center gap-2 bg-ink px-8 py-3.5 text-sm font-medium text-cream transition-colors hover:bg-ink-light">
              Get Started
              <svg
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 14 14"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path d="M1 7h12M8 2l5 5-5 5" />
              </svg>
            </SignInButton>
            <p className="text-sm text-ink-faint">Free while in beta</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-cream">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2" aria-label="Trawl home">
            <div className="flex h-5 w-5 items-center justify-center bg-ink">
              <span className="font-serif text-xs text-cream">T</span>
            </div>
            <span className="font-serif text-base text-ink">Trawl</span>
          </Link>

          {/* Attribution */}
          <p className="text-xs text-ink-faint">
            Built with Next.js, FastAPI, and Claude
          </p>
        </div>
      </footer>
    </div>
  );
}

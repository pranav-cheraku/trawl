import Link from "next/link";
import SignInButton from "@/components/sign-in-button";
import SmoothLink from "@/components/smooth-link";
import { auth } from "@/lib/auth";

export default async function LandingPage() {
  const session = await auth();
  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface">
      {/* ─── Navigation ─── */}
      <header className="bg-surface-container-lowest">
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4"
          aria-label="Main navigation"
        >
          <Link href="/" className="flex items-center gap-2.5" aria-label="Trawl home">
            <div className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-on-surface">
              <span className="font-mono text-sm font-bold text-surface-container-lowest">T</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-on-surface">Trawl</span>
          </Link>

          <div className="flex items-center gap-6">
            <span className="hidden text-[13px] text-on-surface-variant sm:inline">Docs</span>
            <span className="hidden text-[13px] text-on-surface-variant sm:inline">API</span>
            {session ? (
              <SmoothLink
                href="/dashboard"
                className="rounded-[4px] bg-on-surface px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-secondary"
              >
                Dashboard
              </SmoothLink>
            ) : (
              <SignInButton className="rounded-[4px] border border-outline/30 px-4 py-1.5 text-[13px] font-medium text-on-surface transition-colors hover:bg-secondary hover:text-white">
                Sign In
              </SignInButton>
            )}
          </div>
        </nav>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-surface-container-lowest">
        {/* Blueprint grid — sits behind content, fades at edges */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 59px, #E5EFF7 59px, #E5EFF7 60px),
              repeating-linear-gradient(90deg, transparent, transparent 59px, #E5EFF7 59px, #E5EFF7 60px)
            `,
            WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black 40%, transparent 100%)",
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black 40%, transparent 100%)",
          }}
        />
        <div className="relative mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-16 px-8 pb-40 pt-28 lg:grid-cols-[1.2fr_minmax(0,580px)]">
          {/* Left — copy */}
          <div>
            <h1
              className="animate-fade-in-up text-[4rem] font-extrabold leading-[1.05] tracking-tight text-black md:text-[5.5rem] lg:text-[6.5rem]"
              style={{ animationDelay: "0.1s" }}
            >
              Turn 500<br />reviews into a<br />spec in 60s.
            </h1>

            <p
              className="animate-fade-in-up mt-10 max-w-xl text-xl font-medium leading-relaxed text-on-surface-variant md:text-2xl"
              style={{ animationDelay: "0.2s" }}
            >
              Stop drowning in qualitative data. Trawl bridges the gap between
              raw feedback and technical architecture with surgical
              precision.
            </p>

            {/* CTAs */}
            <div
              className="animate-fade-in-up mt-14 flex flex-wrap items-center gap-5"
              style={{ animationDelay: "0.3s" }}
            >
              <SignInButton className="group inline-flex items-center gap-3 rounded-[4px] bg-black px-10 py-5 text-[15px] font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-secondary">
                Launch Architect
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  viewBox="0 0 14 14"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path d="M1 7h12M8 2l5 5-5 5" />
                </svg>
              </SignInButton>
              <Link
                href="#features"
                className="inline-flex items-center gap-2 rounded-[4px] border border-outline/30 bg-white px-10 py-5 text-[15px] font-semibold uppercase tracking-[0.08em] text-on-surface transition-colors hover:bg-surface-container-low"
              >
                Learn More
              </Link>
            </div>
          </div>

          {/* Right — spec card mockup */}
          <div
            className="animate-slide-in-right"
            style={{ animationDelay: "0.35s" }}
          >
            <div className="rounded-[4px] bg-surface-container-low p-1.5">
              <div className="rounded-[4px] bg-surface-container-lowest p-10">
                {/* Card header */}
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                  </svg>
                  <span className="font-mono text-[14px] font-medium uppercase tracking-wider">
                    Requirement_Draft_01
                  </span>
                </div>

                {/* Title skeleton */}
                <div className="mt-8 space-y-3">
                  <div className="h-6 w-4/5 rounded-[2px] bg-surface-container" />
                  <div className="h-6 w-3/5 rounded-[2px] bg-surface-container" />
                </div>

                {/* Meta row */}
                <div className="mt-10 flex items-center justify-between">
                  <span className="font-mono text-[14px] uppercase tracking-wider text-on-surface-variant">
                    AI Consensus
                  </span>
                  <span className="font-mono text-[14px] font-semibold text-secondary">
                    94% Match
                  </span>
                </div>

                {/* Content */}
                <div className="mt-6 rounded-[4px] bg-surface-container-low p-6">
                  <p className="text-[16px] leading-relaxed text-on-surface">
                    Deploy <span className="font-semibold text-secondary">OAuth 2.0 PKCE</span> flow
                    for mobile clients. Resolves persistent &ldquo;Session
                    Expired&rdquo; complaints from iOS v2.4.
                  </p>
                </div>

                {/* Footer tags */}
                <div className="mt-6 flex items-center justify-between">
                  <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-on-surface-variant/50">
                    Linked_Data
                  </span>
                  <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-on-surface-variant/50">
                    Jira_Sync
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Live Connector ─── */}
      <section id="features" className="bg-surface py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-8 lg:grid-cols-[minmax(0,440px)_1fr]">
          {/* Left — mockup */}
          <div className="rounded-[4px] bg-surface-container-lowest p-5">
            {/* Review items */}
            <div className="space-y-3">
              {[
                { stars: 4, w: "w-4/5" },
                { stars: 2, w: "w-3/5" },
                { stars: 5, w: "w-4/5" },
              ].map((review, i) => (
                <div key={i} className="flex items-center gap-3 rounded-[4px] bg-surface-container-low p-3">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <svg
                        key={s}
                        className={`h-3 w-3 ${s < review.stars ? "text-amber-400" : "text-surface-container"}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <div className={`h-2.5 ${review.w} rounded-[2px] bg-surface-container`} />
                </div>
              ))}
            </div>

            {/* Extraction overlay */}
            <div className="mt-4 rounded-[4px] border-l-2 border-secondary bg-surface-container-low p-4">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                </svg>
                <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
                  Extracting&hellip;
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                  <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">
                    Identified Theme
                  </span>
                </div>
                <p className="mt-1 text-[15px] font-bold text-on-surface">
                  Core Authentication Latency
                </p>
              </div>
            </div>
          </div>

          {/* Right — copy */}
          <div>
            <h2 className="text-[2.5rem] font-extrabold leading-tight tracking-tight text-on-surface">
              Live Connector
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-on-surface-variant">
              Stop manual ingestion. Trawl bridges the gap between customer pain
              and engineering tasks by mapping raw feedback to structured
              components in real-time.
            </p>

            <div className="mt-8 space-y-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[4px] bg-surface-container-lowest">
                  <svg className="h-3.5 w-3.5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-on-surface">Semantic Clustering</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-on-surface-variant">
                    Trawl automatically groups hundreds of disparate reviews into
                    logical functional buckets.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[4px] bg-surface-container-lowest">
                  <svg className="h-3.5 w-3.5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-on-surface">Impact Scoring</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-on-surface-variant">
                    Rank severity and frequency using actual customer data points,
                    not gut feeling.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── RAG Transparency ─── */}
      <section className="bg-surface-container-lowest py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-8">
          {/* Header row */}
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-[2.5rem] font-extrabold leading-tight tracking-tight text-on-surface">
                RAG Transparency
              </h2>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-on-surface-variant">
                Every requirement is backed by evidence. Click any citation to see
                the exact customer snippet that triggered the recommendation.
              </p>
            </div>

            {/* Source chips */}
            <div className="flex gap-2">
              <span className="rounded-[2px] bg-surface-container-highest px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
                Source: App Store
              </span>
              <span className="rounded-[2px] bg-surface-container-highest px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
                Source: Zendesk
              </span>
            </div>
          </div>

          {/* Citation cards */}
          <div className="mt-12 grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              {
                icon: (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                ),
                score: "0.96",
                title: "User Auth Flow",
                quote: "\"The app constantly asks me to log in every time I open it. It's exhausting.\"",
                ref: "REV_ID: 0031_K",
              },
              {
                icon: (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                  </svg>
                ),
                score: "0.94",
                title: "Offline Storage",
                quote: "\"Field technicians can't use the app in remote areas without cell service.\"",
                ref: "INT_03_SUMMARY",
              },
              {
                icon: (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                ),
                score: "0.89",
                title: "Global Search",
                quote: "\"Search results don't show items created in the last hour.\"",
                ref: "JIRA_BUG_773",
              },
            ].map((card) => (
              <div
                key={card.ref}
                className="rounded-[4px] bg-surface p-6 transition-colors hover:bg-surface-container-low"
              >
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">{card.icon}</span>
                  <span className="font-mono text-[11px] font-medium text-secondary">
                    Score: {card.score}
                  </span>
                </div>

                {/* Title */}
                <h3 className="mt-4 text-[17px] font-bold text-on-surface">
                  {card.title}
                </h3>

                {/* Quote */}
                <p className="mt-3 text-[13px] italic leading-relaxed text-on-surface-variant">
                  {card.quote}
                </p>

                {/* Ref */}
                <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant/60">
                  ↳ {card.ref}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Build Next (DARK section) ─── */}
      <section className="bg-on-surface py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-stretch gap-16 px-8 lg:grid-cols-2">
          {/* Left — copy + ranked items */}
          <div>
            <h2 className="text-[2.5rem] font-extrabold leading-tight tracking-tight text-white">
              What Should We Build&nbsp;Next?
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60">
              Trawl synthesizes your highest-impact opportunities into a
              strategic roadmap. Move from &ldquo;we should probably do this&rdquo;
              to &ldquo;this will resolve 40% of user churn.&rdquo;
            </p>

            {/* Ranked items */}
            <div className="mt-10 space-y-3">
              <div className="flex items-center gap-4 rounded-[4px] bg-white/[0.06] px-5 py-4">
                <span className="font-mono text-2xl font-bold text-secondary">B1</span>
                <div>
                  <p className="text-[14px] font-bold text-white">Performance Optimization</p>
                  <p className="mt-0.5 font-mono text-[11px] text-white/40">
                    High Impact &middot; 124 Sources &middot; Critical Path
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-[4px] bg-white/[0.06] px-5 py-4">
                <span className="font-mono text-2xl font-bold text-secondary">B2</span>
                <div>
                  <p className="text-[14px] font-bold text-white">Biometric Authentication</p>
                  <p className="mt-0.5 font-mono text-[11px] text-white/40">
                    Medium Impact &middot; 86 Sources &middot; High Effort
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right — theme chart mockup */}
          <div className="flex flex-col">
            <div className="flex flex-1 flex-col rounded-[4px] bg-white/[0.06] p-6">
              {/* Chart header */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-white/40">
                  Theme Distribution
                </span>
                <span className="text-white/20">&middot;&middot;&middot;</span>
              </div>

              {/* Bars */}
              <div className="mt-6 space-y-5">
                {[
                  { label: "Core Stability", pct: 43, width: "w-[86%]" },
                  { label: "UX/UI Polish", pct: 29, width: "w-[58%]" },
                  { label: "New Features", pct: 19, width: "w-[38%]" },
                ].map((bar) => (
                  <div key={bar.label}>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-white/80">
                        {bar.label}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-secondary">
                        {bar.pct}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-white/[0.08]">
                      <div
                        className={`h-2 ${bar.width} rounded-full bg-secondary`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-auto pt-8 text-center">
                <span className="inline-block rounded-[4px] border border-secondary/40 px-6 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-secondary">
                  Generate Full Report
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-[#1E293B]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-8 py-10 sm:flex-row sm:items-center">
          {/* Logo + copyright */}
          <div>
            <a href="#" className="flex items-center gap-2" aria-label="Trawl home">
              <span className="text-base font-bold text-white">Trawl</span>
            </a>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-white/30">
              &copy; 2026 Project Trawl. All rights reserved.
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            {["Privacy", "Terms", "Status", "API"].map((link) => (
              <span
                key={link}
                className="text-[12px] font-medium uppercase tracking-wider text-white/40 transition-colors hover:text-white/70"
              >
                {link}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

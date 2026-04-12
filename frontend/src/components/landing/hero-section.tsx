import Link from "next/link";
import SignInButton from "@/components/sign-in-button";

export default function HeroSection() {
  return (
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
      <div className="relative mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-16 px-8 pb-40 pt-40 lg:grid-cols-[1.2fr_minmax(0,580px)]">
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
              href="#how-it-works"
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
  );
}

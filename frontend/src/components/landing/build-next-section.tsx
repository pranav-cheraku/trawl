export default function BuildNextSection() {
  return (
    <section className="bg-surface py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-stretch gap-16 px-8 lg:grid-cols-2">
        {/* Left — copy + ranked items */}
        <div>
          <h2 className="text-[2.5rem] font-extrabold leading-tight tracking-tight text-on-surface">
            What Should We Build&nbsp;Next?
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-on-surface-variant">
            Trawl synthesizes your highest-impact opportunities into a
            strategic roadmap. Move from &ldquo;we should probably do this&rdquo;
            to &ldquo;this will resolve 40% of user churn.&rdquo;
          </p>

          {/* Ranked items */}
          <div className="mt-10 space-y-3">
            <div className="flex items-center gap-4 rounded-[4px] bg-surface-container-lowest px-5 py-4">
              <span className="font-mono text-2xl font-bold text-secondary">B1</span>
              <div>
                <p className="text-[14px] font-bold text-on-surface">Performance Optimization</p>
                <p className="mt-0.5 font-mono text-[11px] text-on-surface-variant/70">
                  High Impact &middot; 124 Sources &middot; Critical Path
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-[4px] bg-surface-container-lowest px-5 py-4">
              <span className="font-mono text-2xl font-bold text-secondary">B2</span>
              <div>
                <p className="text-[14px] font-bold text-on-surface">Biometric Authentication</p>
                <p className="mt-0.5 font-mono text-[11px] text-on-surface-variant/70">
                  Medium Impact &middot; 86 Sources &middot; High Effort
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right — theme chart mockup */}
        <div className="flex flex-col">
          <div className="flex flex-1 flex-col rounded-[4px] bg-surface-container-lowest p-6">
            {/* Chart header */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-on-surface-variant/70">
                Theme Distribution
              </span>
              <span className="text-on-surface-variant/40">&middot;&middot;&middot;</span>
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
                    <span className="text-[13px] font-medium text-on-surface">
                      {bar.label}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-secondary">
                      {bar.pct}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-surface-container">
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
  );
}

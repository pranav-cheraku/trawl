export default function RagTransparencySection() {
  return (
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
  );
}

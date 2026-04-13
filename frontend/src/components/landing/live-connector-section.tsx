export default function LiveConnectorSection() {
  return (
    <section id="features" className="bg-surface py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-8 lg:grid-cols-[minmax(0,440px)_1fr]">
        {/* Left — mockup (rendered below copy on mobile, left of copy on lg+) */}
        <div className="order-2 rounded-[4px] bg-surface-container-lowest p-5 lg:order-1">
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

        {/* Right — copy (rendered above mockup on mobile, right of mockup on lg+) */}
        <div className="order-1 lg:order-2">
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
  );
}

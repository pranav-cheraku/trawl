export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-surface-container-lowest py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-8">
        <h2 className="text-center text-[2.5rem] font-extrabold leading-tight tracking-tight text-on-surface">
          How It Works
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-[15px] leading-relaxed text-on-surface-variant">
          Three steps from raw feedback to a prioritized product roadmap.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Connect",
              description: "Type an app name to pull App Store reviews, or upload a CSV. Trawl ingests, chunks, and embeds your feedback automatically.",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                </svg>
              ),
            },
            {
              step: "02",
              title: "Explore",
              description: "Ask natural language questions about what users are saying. Every answer includes cited sources with similarity scores.",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              ),
            },
            {
              step: "03",
              title: "Build",
              description: "Get AI-generated feature specs ranked by impact. Drag and drop to prioritize on a Kanban board with full citation traceability.",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
                </svg>
              ),
            },
          ].map((item) => (
            <div key={item.step} className="rounded-[4px] bg-surface p-8">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[13px] font-bold text-secondary">{item.step}</span>
                <span className="text-on-surface-variant">{item.icon}</span>
              </div>
              <h3 className="mt-5 text-[20px] font-bold text-on-surface">{item.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-on-surface-variant">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

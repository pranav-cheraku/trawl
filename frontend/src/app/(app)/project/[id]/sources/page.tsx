export default function SourcesPage() {
  return (
    <div className="flex flex-col items-center border border-dashed border-ink-faint/30 bg-white px-8 py-16 text-center">
      <div className="flex h-10 w-10 items-center justify-center border border-border">
        <svg className="h-5 w-5 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      </div>
      <h2 className="mt-5 font-serif text-lg text-ink">
        Connect feedback sources
      </h2>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-ink-muted">
        Upload CSV, PDF, or text files — or connect an App Store app to
        automatically pull real user reviews.
      </p>
    </div>
  );
}

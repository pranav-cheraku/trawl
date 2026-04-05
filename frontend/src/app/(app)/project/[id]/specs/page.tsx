export default function SpecsPage() {
  return (
    <div className="flex flex-col items-center border border-dashed border-ink-faint/30 bg-white px-8 py-16 text-center">
      <div className="flex h-10 w-10 items-center justify-center border border-border">
        <svg className="h-5 w-5 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z" />
        </svg>
      </div>
      <h2 className="mt-5 font-serif text-lg text-ink">
        Your specs will appear here
      </h2>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-ink-muted">
        Drag and drop to prioritize. Every spec traces back to the
        exact feedback that informed it.
      </p>
    </div>
  );
}

export default function Footer() {
  return (
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

        {/* Author */}
        <div className="flex items-center gap-4">
          <span className="text-[12px] font-medium text-white/40">
            Built by Pranav Cheraku
          </span>
          <span className="text-white/20">&middot;</span>
          <a
            href="https://www.linkedin.com/in/pranav-cheraku/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-medium uppercase tracking-wider text-white/40 transition-colors hover:text-white/70"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}

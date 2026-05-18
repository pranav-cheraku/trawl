import Link from "next/link";

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refund-policy", label: "Refunds" },
];

export default function Footer() {
  return (
    <footer className="bg-on-surface">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-8 py-10 sm:flex-row sm:items-center">
        <div>
          <a href="#" className="flex items-center gap-2" aria-label="Trawl home">
            <span className="text-base font-bold text-white">Trawl</span>
          </a>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-white/40">
            &copy; 2026 Project Trawl. All rights reserved.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <nav className="flex items-center gap-4" aria-label="Legal">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[12px] font-medium uppercase tracking-wider text-white/40 transition-colors hover:text-white/70"
              >
                {link.label}
              </Link>
            ))}
          </nav>
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
      </div>
    </footer>
  );
}

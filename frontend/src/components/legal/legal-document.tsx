// Renders a legal/docs markdown string using react-markdown + remark-gfm.
// No @tailwindcss/typography dependency. Styles are applied via the
// components map. Used for /privacy, /terms, /refund-policy, and /docs.
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface LegalDocumentProps {
  title: string;
  lastUpdated: string;
  markdown: string;
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mt-10 text-xl font-semibold text-on-surface">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-8 text-base font-semibold text-on-surface">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 text-sm font-semibold text-on-surface">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-on-surface-variant">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-on-surface-variant">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-on-surface-variant">{children}</li>
  ),
  a: ({ href, children }) => {
    const isExternal =
      !!href && (href.startsWith("http://") || href.startsWith("https://"));
    return (
      <a
        href={href}
        className="text-secondary-dim underline underline-offset-2 transition-colors hover:text-secondary"
        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </a>
    );
  },
  strong: ({ children }) => (
    <strong className="font-semibold text-on-surface">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-4 border-l-2 border-outline-variant/40 pl-4 text-sm italic text-on-surface-variant">
      {children}
    </blockquote>
  ),
};

export default function LegalDocument({
  title,
  lastUpdated,
  markdown,
}: LegalDocumentProps) {
  return (
    <article className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-on-surface">
        {title}
      </h1>
      <p className="mt-2 font-mono text-xs uppercase tracking-wider text-on-surface-variant">
        Last updated: {lastUpdated}
      </p>
      <div className="mt-8">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {markdown}
        </ReactMarkdown>
      </div>
    </article>
  );
}

import type { ReactNode } from "react";

export interface WorkspaceStat {
  /** Right-aligned primary number, e.g. "1,247". */
  value: string;
  /** Small uppercase mono label under the value, e.g. "Reviews Indexed". */
  key: string;
}

export interface WorkspaceHeaderProps {
  /** Mono uppercase crumb above the title, e.g. "Workspace / Sources". */
  label: string;
  /** Primary semibold heading. */
  title: string;
  /** Optional right-aligned stats row. */
  stats?: WorkspaceStat[];
  /**
   * Optional right-side slot for action buttons (e.g. generate buttons on Specs).
   * Renders after the stats row; both can coexist.
   */
  right?: ReactNode;
}

export default function WorkspaceHeader({
  label,
  title,
  stats,
  right,
}: WorkspaceHeaderProps) {
  const hasStats = stats && stats.length > 0;
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 rounded-[4px] bg-surface-container-lowest px-4 py-3">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.25em] text-on-surface-variant/70">
          {label}
        </span>
        <h2 className="text-[17px] font-semibold leading-tight text-on-surface">
          {title}
        </h2>
      </div>
      {(hasStats || right) && (
        <div className="flex flex-wrap items-center gap-5">
          {hasStats && (
            <div className="flex items-center gap-4">
              {stats?.map((s, i) => (
                <div key={s.key} className="flex items-center gap-4">
                  {i > 0 && (
                    <span
                      aria-hidden
                      className="h-5 w-px bg-on-surface/[0.08]"
                    />
                  )}
                  <div className="flex flex-col gap-0.5 text-right">
                    <span className="font-mono text-[13px] font-medium leading-none text-on-surface">
                      {s.value}
                    </span>
                    <span className="font-mono text-[9px] font-medium uppercase tracking-[0.15em] text-on-surface-variant/60">
                      {s.key}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {right}
        </div>
      )}
    </header>
  );
}

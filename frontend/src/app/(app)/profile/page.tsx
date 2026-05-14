"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { DeleteAccountModal } from "@/components/profile/delete-account-modal";
import EditableText from "@/components/kanban/editable-text";
import { updateUserName } from "@/lib/api";
import { useCredits } from "@/lib/use-credits";
import { useUserMe } from "@/lib/use-user-me";

export default function ProfilePage() {
  const { user, initialLoading } = useUserMe();
  const { data: session } = useSession();
  const { balance } = useCredits();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (initialLoading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 text-sm text-on-surface-variant">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 text-sm text-error">
        Could not load profile. Try refreshing the page.
      </div>
    );
  }

  const saveName = async (next: string) => {
    setError(null);
    try {
      await updateUserName(next);
      // updateUserName dispatches trawl:user-updated; useUserMe refreshes automatically.
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Could not save name");
      throw exc; // re-throw so EditableText reverts the draft
    }
  };

  const initial = (user.name ?? "?").charAt(0).toUpperCase();
  const avatarUrl = session?.user?.image;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-on-surface">Profile</h1>

      {error && (
        <div className="mt-4 rounded-[4px] bg-error/10 px-4 py-2 text-sm text-error">
          {error}
        </div>
      )}

      <section className="mt-8 rounded-[4px] bg-surface-container-lowest p-6 ring-1 ring-outline-variant/30">
        <h2 className="text-xs uppercase tracking-wider text-on-surface-variant">
          Identity
        </h2>
        <div className="mt-4 flex items-center gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Profile avatar"
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-base font-medium text-white">
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <EditableText
              value={user.name ?? ""}
              onSave={saveName}
              variant="title"
              ariaLabel="Display name"
              placeholder="Display name"
              maxLength={255}
            />
            <p className="mt-1 truncate font-mono text-xs text-on-surface-variant">
              {user.email}
              <span className="ml-2 text-[11px] opacity-70">
                From your Google account
              </span>
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[4px] bg-surface-container-lowest p-6 ring-1 ring-outline-variant/30">
        <h2 className="text-xs uppercase tracking-wider text-on-surface-variant">
          Credits
        </h2>
        <div className="mt-4 flex items-baseline gap-3">
          <span className="font-mono text-4xl text-on-surface">
            {balance ?? "—"}
          </span>
          <span className="text-sm text-on-surface-variant">
            credits available
          </span>
        </div>
        <Link
          href="/billing"
          className="mt-4 inline-block rounded-[4px] bg-on-surface px-3 py-1.5 text-sm text-white transition-colors hover:bg-secondary"
        >
          Buy more credits
        </Link>
      </section>

      <section className="mt-6 rounded-[4px] bg-error/5 p-6 ring-1 ring-error/20">
        <h2 className="text-xs uppercase tracking-wider text-error">
          Danger zone
        </h2>
        <p className="mt-3 text-sm text-on-surface-variant">
          Permanently delete your account and all data. This includes all
          projects, feedback sources, specs, and conversations. You can
          restore everything by signing back in within 30 days.
        </p>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-[4px] bg-error px-3 py-1.5 text-sm text-white transition-opacity hover:opacity-90"
          >
            Delete account
          </button>
        </div>
      </section>

      <DeleteAccountModal
        open={confirmDelete}
        email={user.email}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

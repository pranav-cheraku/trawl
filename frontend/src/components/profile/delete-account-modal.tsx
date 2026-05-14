"use client";

import { AnimatePresence, motion } from "framer-motion";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

import { deleteAccount } from "@/lib/api";
import { durations, easings } from "@/lib/motion";

interface DeleteAccountModalProps {
  open: boolean;
  email: string;
  onClose: () => void;
}

export function DeleteAccountModal({ open, email, onClose }: DeleteAccountModalProps) {
  const [input, setInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset internal state every time the modal opens/closes.
  useEffect(() => {
    if (!open) {
      setInput("");
      setError(null);
      setIsDeleting(false);
    }
  }, [open]);

  // Esc to close (only if not mid-delete).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, isDeleting, onClose]);

  const canDelete = input.toLowerCase().trim() === email.toLowerCase();

  const doDelete = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      await signOut({ callbackUrl: "/" });
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Could not delete account");
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: durations.fast } }}
          transition={{ duration: durations.normal, ease: easings.standard }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/30 px-4 backdrop-blur-sm"
          onClick={isDeleting ? undefined : onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0, transition: { duration: durations.fast } }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[4px] bg-surface-container-lowest p-6 ring-1 ring-outline-variant/30"
          >
            <h2 className="text-lg font-semibold text-on-surface">Delete account</h2>
            <p className="mt-3 text-sm text-on-surface-variant">
              Your account and all data will be marked for deletion. You can restore everything — including your remaining credit balance — by signing in again within{" "}
              <strong className="text-on-surface">30 days</strong>. After that, your projects, specs, conversations, and credits are permanently removed.
            </p>
            <p className="mt-3 text-sm text-on-surface-variant">
              <strong className="text-on-surface">Credits are not refundable.</strong>{" "}
              Any unused credits from past purchases will not be converted back to dollars. Stripe purchases are final.
            </p>
            <label className="mt-5 block">
              <span className="text-xs text-on-surface-variant">
                Type your email (
                <span className="font-mono text-on-surface">{email}</span>
                ) to confirm
              </span>
              <input
                type="email"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isDeleting}
                autoFocus
                className="mt-1 w-full rounded-[4px] border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/10"
                placeholder={email}
              />
            </label>
            {error && (
              <p className="mt-3 text-sm text-error">{error}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="rounded-[4px] border border-outline/30 px-3 py-1.5 text-sm text-on-surface transition-colors hover:bg-surface-container disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doDelete}
                disabled={!canDelete || isDeleting}
                className="rounded-[4px] bg-error px-3 py-1.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isDeleting ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

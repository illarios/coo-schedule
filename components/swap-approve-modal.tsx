"use client";

import { useState } from "react";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/swap-request-modal";
import { cn } from "@/lib/utils";
import { SHIFT_CONFIG } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import {
  approveSwap,
  rejectSwap,
  createNotification,
  type SwapRow,
} from "@/lib/queries/swaps";
import type { ShiftType } from "@/lib/types";

interface SwapApproveModalProps {
  open: boolean;
  onClose: () => void;
  swap: SwapRow;
  onResolved: (swapId: string, approved: boolean) => void;
}

export function SwapApproveModal({
  open,
  onClose,
  swap,
  onResolved,
}: SwapApproveModalProps) {
  const supabase = createClient();
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null);

  const cfg = SHIFT_CONFIG[swap.shift_type as ShiftType];
  const dateLabel = format(
    new Date(swap.shift_date + "T00:00:00"),
    "EEEE d MMMM",
    { locale: el }
  );

  const statusLabel: Record<string, string> = {
    pending: "Αναμένει απόφαση συναδέλφου",
    accepted_by_employee: "Αποδεκτό από τον συνάδελφο — αναμένει έγκριση",
    approved: "Εγκρίθηκε",
    rejected: "Απορρίφθηκε",
  };

  async function handleApprove() {
    setSubmitting("approve");
    try {
      await approveSwap(supabase, swap);

      // Notify both employees
      const notifBody = `Η αλλαγή βάρδιας για ${dateLabel} εγκρίθηκε!`;
      await Promise.all([
        createNotification(supabase, {
          user_id: swap.requester_id,
          type: "swap_approved",
          title: "✅ Η αλλαγή εγκρίθηκε",
          body: notifBody,
          related_id: swap.id,
        }),
        createNotification(supabase, {
          user_id: swap.target_id,
          type: "swap_approved",
          title: "✅ Η αλλαγή εγκρίθηκε",
          body: `${swap.requester_nickname} και εσύ έχετε εγκεκριμένη αλλαγή για ${dateLabel}.`,
          related_id: swap.id,
        }),
      ]);

      toast.success("Αλλαγή εγκρίθηκε!");
      onResolved(swap.id, true);
      onClose();
    } catch {
      toast.error("Σφάλμα — δοκίμασε ξανά");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleReject() {
    setSubmitting("reject");
    try {
      await rejectSwap(supabase, swap.id);

      // Notify requester
      await createNotification(supabase, {
        user_id: swap.requester_id,
        type: "swap_request",
        title: "❌ Η αλλαγή απορρίφθηκε",
        body: `Η αίτηση αλλαγής βάρδιας για ${dateLabel} δεν εγκρίθηκε.`,
        related_id: swap.id,
      });

      toast("Αίτηση απορρίφθηκε", { icon: "❌" });
      onResolved(swap.id, false);
      onClose();
    } catch {
      toast.error("Σφάλμα — δοκίμασε ξανά");
    } finally {
      setSubmitting(null);
    }
  }

  const canAct = swap.status === "accepted_by_employee";

  return (
    <Modal open={open} onClose={onClose} title="Αίτηση swap">
      <div className="flex flex-col gap-4">

        {/* Status pill */}
        <span
          className={cn(
            "self-start font-archivo text-xs px-3 py-1.5 border-2 border-coo-black",
            swap.status === "approved"
              ? "bg-coo-yellow text-coo-black"
              : swap.status === "rejected"
              ? "bg-coo-red text-white"
              : swap.status === "accepted_by_employee"
              ? "bg-coo-sky text-coo-black"
              : "bg-coo-paper text-coo-black"
          )}
        >
          {statusLabel[swap.status] ?? swap.status}
        </span>

        {/* Swap visualisation: A → B */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1 flex-1">
            <Avatar
              nickname={swap.requester_nickname}
              color={swap.requester_color}
              avatarUrl={swap.requester_avatar}
              size="lg"
            />
            <p className="font-dm text-xs text-coo-black font-semibold">
              {swap.requester_nickname}
            </p>
            <p className="font-dm text-[10px] text-coo-black/50">δίνει</p>
          </div>

          <div className="flex flex-col items-center gap-1 shrink-0">
            <div
              className="border-2 border-coo-black bg-coo-yellow p-1.5"
              style={{ boxShadow: "2px 2px 0 #0A0A0A" }}
            >
              <ArrowRight size={18} className="text-coo-black" />
            </div>
            <p className="font-archivo text-[10px] text-coo-black/40">SWAP</p>
          </div>

          <div className="flex flex-col items-center gap-1 flex-1">
            <Avatar
              nickname={swap.target_nickname}
              color={swap.target_color}
              avatarUrl={swap.target_avatar}
              size="lg"
            />
            <p className="font-dm text-xs text-coo-black font-semibold">
              {swap.target_nickname}
            </p>
            <p className="font-dm text-[10px] text-coo-black/50">παίρνει</p>
          </div>
        </div>

        {/* Shift badge */}
        <div
          className={cn(
            "flex items-center gap-3 p-3 border-2 border-coo-black",
            swap.shift_type === "morning"
              ? "bg-coo-yellow"
              : swap.shift_type === "evening"
              ? "bg-coo-black"
              : "bg-coo-red"
          )}
          style={{ boxShadow: "3px 3px 0 #0A0A0A" }}
        >
          <span className="text-xl">{cfg.icon}</span>
          <div>
            <p
              className={cn(
                "font-archivo text-sm",
                swap.shift_type === "morning" ? "text-coo-black" : "text-white"
              )}
            >
              {cfg.label} · {dateLabel}
            </p>
            <p
              className={cn(
                "font-dm text-xs",
                swap.shift_type === "morning" ? "text-coo-black/60" : "text-white/60"
              )}
            >
              {cfg.hours}
            </p>
          </div>
        </div>

        {/* Message */}
        {swap.message && (
          <div className="bg-coo-paper border-l-4 border-coo-black px-4 py-3">
            <p className="font-dm text-xs text-coo-black/50 mb-1">Μήνυμα</p>
            <p className="font-dm text-sm text-coo-black italic">
              &ldquo;{swap.message}&rdquo;
            </p>
          </div>
        )}

        {/* Actions — only for accepted_by_employee */}
        {canAct ? (
          <div className="grid grid-cols-2 gap-3 mt-1">
            <Button
              variant="danger"
              fullWidth
              loading={submitting === "reject"}
              disabled={submitting !== null}
              onClick={handleReject}
            >
              ❌ Απόρριψη
            </Button>
            <Button
              variant="dark"
              fullWidth
              loading={submitting === "approve"}
              disabled={submitting !== null}
              onClick={handleApprove}
            >
              ✅ Έγκριση
            </Button>
          </div>
        ) : (
          <p className="font-dm text-xs text-center text-coo-black/40">
            {swap.status === "pending"
              ? "Αναμένεται η απόφαση του συναδέλφου."
              : swap.status === "approved"
              ? "Η αλλαγή έχει ήδη εγκριθεί."
              : "Η αίτηση έχει απορριφθεί."}
          </p>
        )}
      </div>
    </Modal>
  );
}

"use client";

import { useState } from "react";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/swap-request-modal";
import { cn } from "@/lib/utils";
import { SHIFT_CONFIG } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import {
  respondToSwap,
  createNotification,
  type SwapRow,
} from "@/lib/queries/swaps";
import type { ShiftType } from "@/lib/types";

interface SwapRespondModalProps {
  open: boolean;
  onClose: () => void;
  swap: SwapRow;
  onResolved: (swapId: string, accepted: boolean) => void;
}

export function SwapRespondModal({
  open,
  onClose,
  swap,
  onResolved,
}: SwapRespondModalProps) {
  const supabase = createClient();
  const [submitting, setSubmitting] = useState<"accept" | "reject" | null>(null);

  const cfg = SHIFT_CONFIG[swap.shift_type as ShiftType];
  const dateLabel = format(
    new Date(swap.shift_date + "T00:00:00"),
    "EEEE d MMMM",
    { locale: el }
  );

  async function handle(accept: boolean) {
    setSubmitting(accept ? "accept" : "reject");
    try {
      await respondToSwap(supabase, swap.id, accept);

      if (accept) {
        // Notify admin
        await createNotification(supabase, {
          user_id: swap.requester_id, // requester gets a notification
          type: "swap_request",
          title: `${swap.target_nickname} αποδέχτηκε!`,
          body: `Η αλλαγή για ${dateLabel} εγκρίθηκε από τον/ην ${swap.target_nickname}. Αναμένεται έγκριση admin.`,
          related_id: swap.id,
        });

        // Also notify admin via a swap_request notification (admin reads all)
        // In a real app you'd have an admin notification mechanism here
      }

      toast.success(accept ? "Αποδέχτηκες την αίτηση!" : "Αρνήθηκες την αίτηση");
      onResolved(swap.id, accept);
      onClose();
    } catch {
      toast.error("Σφάλμα — δοκίμασε ξανά");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Αίτηση αλλαγής βάρδιας">
      <div className="flex flex-col gap-4">

        {/* Requester info */}
        <div className="flex items-center gap-3">
          <Avatar
            nickname={swap.requester_nickname}
            color={swap.requester_color}
            avatarUrl={swap.requester_avatar}
            size="lg"
          />
          <div>
            <p className="font-archivo text-base text-coo-black">
              {swap.requester_nickname}
            </p>
            <p className="font-dm text-xs text-coo-black/50">
              ζητάει να πάρεις τη βάρδιά του/της
            </p>
          </div>
        </div>

        {/* Shift badge */}
        <div
          className={cn(
            "flex items-center gap-3 p-4 border-2 border-coo-black",
            swap.shift_type === "morning"
              ? "bg-coo-yellow"
              : swap.shift_type === "evening"
              ? "bg-coo-black"
              : "bg-coo-red"
          )}
          style={{ boxShadow: "3px 3px 0 #0A0A0A" }}
        >
          <span className="text-2xl">{cfg.icon}</span>
          <div>
            <p
              className={cn(
                "font-archivo text-base",
                swap.shift_type === "morning" ? "text-coo-black" : "text-white"
              )}
            >
              {cfg.label} · {dateLabel}
            </p>
            <p
              className={cn(
                "font-dm text-xs mt-0.5",
                swap.shift_type === "morning"
                  ? "text-coo-black/60"
                  : "text-white/60"
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

        <p className="font-dm text-xs text-coo-black/50 text-center leading-relaxed">
          Αν αποδεχτείς, το αίτημα θα πάει στον admin για τελική έγκριση.
        </p>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="danger"
            fullWidth
            loading={submitting === "reject"}
            disabled={submitting !== null}
            onClick={() => handle(false)}
          >
            ❌ Δεν μπορώ
          </Button>
          <Button
            variant="primary"
            fullWidth
            loading={submitting === "accept"}
            disabled={submitting !== null}
            onClick={() => handle(true)}
          >
            ✅ Δέχομαι
          </Button>
        </div>
      </div>
    </Modal>
  );
}

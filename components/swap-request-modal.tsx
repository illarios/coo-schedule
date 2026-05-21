"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SHIFT_CONFIG, AVAILABILITY_CONFIG } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import {
  getAvailableColleagues,
  createSwapRequest,
  createNotification,
  type AvailableColleague,
} from "@/lib/queries/swaps";
import type { WeekShiftRow } from "@/lib/queries/shifts";
import type { ShiftType } from "@/lib/types";

interface SwapRequestModalProps {
  open: boolean;
  onClose: () => void;
  shift: WeekShiftRow; // the requester's own shift
  currentUserId: string;
  currentUserNickname: string;
}

type Step = "confirm" | "pick" | "message" | "done";

export function SwapRequestModal({
  open,
  onClose,
  shift,
  currentUserId,
  currentUserNickname,
}: SwapRequestModalProps) {
  const supabase = createClient();
  const [step, setStep] = useState<Step>("confirm");
  const [colleagues, setColleagues] = useState<AvailableColleague[]>([]);
  const [loadingColleagues, setLoadingColleagues] = useState(false);
  const [selected, setSelected] = useState<AvailableColleague | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const cfg = SHIFT_CONFIG[shift.shift_type as ShiftType];
  const dateLabel = format(
    new Date(shift.date + "T00:00:00"),
    "EEEE d MMMM",
    { locale: el }
  );

  // Reset when reopened
  useEffect(() => {
    if (open) {
      setStep("confirm");
      setSelected(null);
      setMessage("");
    }
  }, [open]);

  async function loadColleagues() {
    setLoadingColleagues(true);
    setStep("pick");
    try {
      const list = await getAvailableColleagues(
        supabase,
        shift.date,
        currentUserId
      );
      setColleagues(list);
    } catch {
      toast.error("Αδυναμία φόρτωσης συναδέλφων");
      setStep("confirm");
    } finally {
      setLoadingColleagues(false);
    }
  }

  async function handleSubmit() {
    if (!selected) return;
    setSubmitting(true);
    try {
      const swapId = await createSwapRequest(supabase, {
        shift_id: shift.shift_id,
        requested_by: currentUserId,
        requested_to: selected.id,
        message: message.trim() || null,
      });

      // Notify the target employee
      await createNotification(supabase, {
        user_id: selected.id,
        type: "swap_request",
        title: `Αίτηση αλλαγής από ${currentUserNickname}`,
        body: `Σου ζητά την ${cfg.label} βάρδια της ${dateLabel}.`,
        related_id: swapId,
      });

      setStep("done");
      toast.success("Η αίτηση στάλθηκε!");
    } catch {
      toast.error("Σφάλμα — δοκίμασε ξανά");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        step === "done"
          ? "Αίτηση εστάλη!"
          : step === "message"
          ? "Προσθήκη μηνύματος"
          : step === "pick"
          ? "Επίλεξε συνάδελφο"
          : "Αλλαγή βάρδιας"
      }
    >
      {/* ── Step: confirm ───────────────────────────────────────── */}
      {step === "confirm" && (
        <div className="flex flex-col gap-4">
          <ShiftBadge shift={shift} />
          <p className="font-dm text-sm text-coo-black/70 leading-relaxed">
            Θέλεις να ζητήσεις αλλαγή για τη βάρδιά σου της{" "}
            <strong>{dateLabel}</strong>;
          </p>
          <Button variant="dark" fullWidth onClick={loadColleagues}>
            🔄 Ζήτα αλλαγή
          </Button>
          <Button variant="ghost" fullWidth onClick={onClose}>
            Άκυρο
          </Button>
        </div>
      )}

      {/* ── Step: pick colleague ────────────────────────────────── */}
      {step === "pick" && (
        <div className="flex flex-col gap-3">
          <p className="font-dm text-xs text-coo-black/50">
            Διαθέσιμοι για {dateLabel}
          </p>

          {loadingColleagues ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-coo-black/40" size={28} />
            </div>
          ) : colleagues.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-2xl mb-2">😕</p>
              <p className="font-dm text-sm text-coo-black/50">
                Κανείς συνάδελφος δεν είναι διαθέσιμος αυτή τη μέρα.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-4"
                onClick={() => setStep("confirm")}
              >
                Πίσω
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {colleagues.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={cn(
                      "flex items-center gap-3 p-3 border-2 text-left",
                      "active:scale-[0.98] transition-all duration-75",
                      selected?.id === c.id
                        ? "border-coo-black bg-coo-yellow"
                        : "border-coo-black/20 bg-white hover:border-coo-black"
                    )}
                    style={
                      selected?.id === c.id
                        ? { boxShadow: "3px 3px 0 #0A0A0A" }
                        : undefined
                    }
                  >
                    <Avatar
                      nickname={c.nickname}
                      color={c.color}
                      avatarUrl={c.avatar_url}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-dm text-sm font-semibold text-coo-black">
                        {c.nickname}
                      </p>
                      <p className="font-dm text-xs text-coo-black/50">
                        {c.availability
                          .map((a) => `${AVAILABILITY_CONFIG[a as keyof typeof AVAILABILITY_CONFIG]?.icon ?? ""} ${AVAILABILITY_CONFIG[a as keyof typeof AVAILABILITY_CONFIG]?.label ?? a}`)
                          .join(" · ")}
                      </p>
                    </div>
                    {selected?.id === c.id && (
                      <span className="text-lg">✓</span>
                    )}
                  </button>
                ))}
              </div>
              <Button
                variant="dark"
                fullWidth
                disabled={!selected}
                onClick={() => setStep("message")}
              >
                Συνέχεια →
              </Button>
            </>
          )}
        </div>
      )}

      {/* ── Step: message ───────────────────────────────────────── */}
      {step === "message" && selected && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3 bg-coo-paper border-2 border-coo-black/10">
            <Avatar
              nickname={selected.nickname}
              color={selected.color}
              avatarUrl={selected.avatar_url}
            />
            <div>
              <p className="font-archivo text-sm">{selected.nickname}</p>
              <p className="font-dm text-xs text-coo-black/50">{dateLabel}</p>
            </div>
          </div>

          <div>
            <label className="font-archivo text-xs tracking-wider text-coo-black/50 block mb-2">
              ΜΗΝΥΜΑ (προαιρετικό)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="πχ. δεν μπορώ να έρθω εκείνη τη μέρα…"
              rows={3}
              className="w-full border-2 border-coo-black bg-coo-paper px-3 py-2.5
                         font-dm text-sm resize-none focus:outline-none
                         focus:bg-coo-yellow/10 transition-colors"
            />
          </div>

          <Button
            variant="dark"
            fullWidth
            loading={submitting}
            onClick={handleSubmit}
          >
            Αποστολή αίτησης
          </Button>
          <Button
            variant="ghost"
            fullWidth
            disabled={submitting}
            onClick={() => setStep("pick")}
          >
            Πίσω
          </Button>
        </div>
      )}

      {/* ── Step: done ──────────────────────────────────────────── */}
      {step === "done" && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div
            className="w-16 h-16 bg-coo-yellow border-2 border-coo-black
                        flex items-center justify-center text-3xl"
            style={{ boxShadow: "4px 4px 0 #0A0A0A" }}
          >
            📨
          </div>
          <div className="text-center">
            <p className="font-archivo text-lg text-coo-black">Εστάλη!</p>
            <p className="font-dm text-sm text-coo-black/60 mt-1">
              Ο/η <strong>{selected?.nickname}</strong> θα ειδοποιηθεί.
              Αν αποδεχτεί, το αίτημα πηγαίνει στον admin.
            </p>
          </div>
          <Button variant="primary" fullWidth onClick={onClose}>
            Κλείσιμο
          </Button>
        </div>
      )}
    </Modal>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────

function ShiftBadge({ shift }: { shift: WeekShiftRow }) {
  const cfg = SHIFT_CONFIG[shift.shift_type as ShiftType];
  const bgMap: Record<ShiftType, string> = {
    morning: "bg-coo-yellow text-coo-black",
    evening: "bg-coo-black text-coo-yellow",
    split: "bg-coo-red text-white",
  };

  return (
    <div
      className={cn("flex items-center gap-3 p-3 border-2 border-coo-black", bgMap[shift.shift_type as ShiftType])}
      style={{ boxShadow: "3px 3px 0 #0A0A0A" }}
    >
      <span className="text-2xl">{cfg.icon}</span>
      <div>
        <p className="font-archivo text-sm">{cfg.label}</p>
        <p className="font-dm text-xs opacity-60">{cfg.hours}</p>
      </div>
    </div>
  );
}

export function Avatar({
  nickname,
  color,
  avatarUrl,
  size = "md",
}: {
  nickname: string;
  color: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "w-7 h-7 text-[10px]" : size === "lg" ? "w-12 h-12 text-base" : "w-9 h-9 text-xs";
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={nickname}
        className={cn(dim, "rounded-full object-cover border-2 border-coo-black shrink-0")}
      />
    );
  }
  return (
    <span
      className={cn(
        dim,
        "rounded-full flex items-center justify-center font-archivo text-white border-2 border-coo-black shrink-0"
      )}
      style={{ backgroundColor: color }}
    >
      {nickname.charAt(0).toUpperCase()}
    </span>
  );
}

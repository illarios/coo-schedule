"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { SwapApproveModal } from "@/components/swap-approve-modal";
import { Avatar } from "@/components/swap-request-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SHIFT_CONFIG } from "@/lib/constants";
import { getAllSwaps, type SwapRow } from "@/lib/queries/swaps";
import type { SwapStatus, ShiftType } from "@/lib/types";

type FilterTab = "all" | "pending" | "accepted_by_employee";

const FILTER_TABS: { key: FilterTab; label: string; statuses: SwapStatus[] }[] = [
  { key: "all",                  label: "Όλες",     statuses: ["pending", "accepted_by_employee", "approved", "rejected"] },
  { key: "pending",              label: "Αναμονή",  statuses: ["pending"] },
  { key: "accepted_by_employee", label: "Προς έγκριση", statuses: ["accepted_by_employee"] },
];

interface AdminSwapsListProps {
  initialSwaps: SwapRow[];
}

export function AdminSwapsList({ initialSwaps }: AdminSwapsListProps) {
  const supabase = createClient();
  const [swaps, setSwaps] = useState<SwapRow[]>(initialSwaps);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selected, setSelected] = useState<SwapRow | null>(null);

  // Realtime: re-fetch on any swap change
  useEffect(() => {
    const channel = supabase
      .channel("admin-swaps-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shift_swaps" },
        async () => {
          const fresh = await getAllSwaps(supabase).catch(() => swaps);
          setSwaps(fresh);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleResolved(swapId: string, approved: boolean) {
    setSwaps((prev) =>
      prev.map((s) =>
        s.id === swapId
          ? { ...s, status: approved ? "approved" : "rejected", resolved_at: new Date().toISOString() }
          : s
      )
    );
    setSelected(null);
  }

  const activeStatuses = FILTER_TABS.find((t) => t.key === filter)!.statuses;
  const filtered = swaps.filter((s) => activeStatuses.includes(s.status));

  const pendingCount = swaps.filter((s) => s.status === "accepted_by_employee").length;

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex border-b-2 border-coo-black bg-white sticky top-[88px] z-20">
        {FILTER_TABS.map((tab) => {
          const count =
            tab.key === "all"
              ? swaps.length
              : tab.key === "accepted_by_employee"
              ? pendingCount
              : swaps.filter((s) => s.status === "pending").length;

          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "flex-1 py-3 font-archivo text-sm flex items-center justify-center gap-1.5 transition-colors",
                filter === tab.key
                  ? "bg-coo-yellow text-coo-black border-b-2 border-coo-black -mb-[2px]"
                  : "bg-white text-coo-black/50 hover:text-coo-black"
              )}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    "text-[10px] font-archivo px-1.5 py-0.5 border border-coo-black min-w-[18px] text-center",
                    filter === tab.key ? "bg-coo-black text-coo-yellow" : "bg-coo-black/10 text-coo-black"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Swap list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-4xl">🔄</p>
          <p className="font-dm text-sm text-coo-black/50">Δεν υπάρχουν αιτήσεις</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-4">
          {filtered.map((swap) => (
            <SwapListRow
              key={swap.id}
              swap={swap}
              onTap={() => setSelected(swap)}
            />
          ))}
        </div>
      )}

      {/* Approve modal */}
      {selected && (
        <SwapApproveModal
          open={selected !== null}
          onClose={() => setSelected(null)}
          swap={selected}
          onResolved={handleResolved}
        />
      )}
    </div>
  );
}

// ── Swap list row ─────────────────────────────────────────────────────────────

function SwapListRow({
  swap,
  onTap,
}: {
  swap: SwapRow;
  onTap: () => void;
}) {
  const cfg = SHIFT_CONFIG[swap.shift_type as ShiftType];
  const dateLabel = format(
    new Date(swap.shift_date + "T00:00:00"),
    "EEE d MMM",
    { locale: el }
  );

  const statusStyle: Record<SwapStatus, string> = {
    pending:               "bg-coo-paper  text-coo-black/60",
    accepted_by_employee:  "bg-coo-sky    text-coo-black",
    approved:              "bg-coo-yellow text-coo-black",
    rejected:              "bg-coo-red    text-white",
  };

  const statusLabel: Record<SwapStatus, string> = {
    pending:              "Αναμονή",
    accepted_by_employee: "Προς έγκριση",
    approved:             "Εγκρίθηκε",
    rejected:             "Απορρίφθηκε",
  };

  return (
    <button
      onClick={onTap}
      className="w-full text-left border-2 border-coo-black bg-white p-4
                 active:bg-coo-yellow/10 transition-colors"
      style={{ boxShadow: "4px 4px 0 #0A0A0A" }}
    >
      {/* Top row: date + shift + status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{cfg.icon}</span>
          <span className="font-archivo text-sm text-coo-black">{cfg.label}</span>
          <span className="font-dm text-xs text-coo-black/50">{dateLabel}</span>
        </div>
        <span
          className={cn(
            "font-archivo text-[10px] px-2 py-1 border border-coo-black",
            statusStyle[swap.status]
          )}
        >
          {statusLabel[swap.status]}
        </span>
      </div>

      {/* Employees row */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Avatar nickname={swap.requester_nickname} color={swap.requester_color} avatarUrl={swap.requester_avatar} size="sm" />
          <span className="font-dm text-sm text-coo-black">{swap.requester_nickname}</span>
        </div>
        <ArrowRight size={14} className="text-coo-black/40 shrink-0" />
        <div className="flex items-center gap-1.5">
          <Avatar nickname={swap.target_nickname} color={swap.target_color} avatarUrl={swap.target_avatar} size="sm" />
          <span className="font-dm text-sm text-coo-black">{swap.target_nickname}</span>
        </div>
      </div>

      {/* Message preview */}
      {swap.message && (
        <p className="mt-2 font-dm text-xs text-coo-black/50 italic truncate">
          &ldquo;{swap.message}&rdquo;
        </p>
      )}

      {/* CTA for actionable swaps */}
      {swap.status === "accepted_by_employee" && (
        <div className="mt-3 flex justify-end">
          <span
            className="font-archivo text-xs px-3 py-1.5 bg-coo-black text-coo-yellow border border-coo-black"
            style={{ boxShadow: "2px 2px 0 #FFD800" }}
          >
            Απαιτεί έγκριση →
          </span>
        </div>
      )}
    </button>
  );
}

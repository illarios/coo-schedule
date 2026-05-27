"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SwapRespondModal } from "@/components/swap-respond-modal";
import { Avatar } from "@/components/swap-request-modal";
import { cn } from "@/lib/utils";
import { SHIFT_CONFIG } from "@/lib/constants";
import { getMySwaps, type SwapRow } from "@/lib/queries/swaps";
import type { SwapStatus, ShiftType } from "@/lib/types";

type FilterTab = "incoming" | "outgoing" | "done";

interface EmployeeSwapsClientProps {
  currentUserId: string;
  initialSwaps: SwapRow[];
}

export function EmployeeSwapsClient({
  currentUserId,
  initialSwaps,
}: EmployeeSwapsClientProps) {
  const supabase = createClient();
  const [swaps, setSwaps] = useState<SwapRow[]>(initialSwaps);
  const [filter, setFilter] = useState<FilterTab>("incoming");
  const [selected, setSelected] = useState<SwapRow | null>(null);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("employee-swaps-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shift_swaps" },
        async () => {
          const fresh = await getMySwaps(supabase, currentUserId).catch(() => swaps);
          setSwaps(fresh);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleResolved(swapId: string, accepted: boolean) {
    setSwaps((prev) =>
      prev.map((s) =>
        s.id === swapId
          ? { ...s, status: accepted ? "accepted_by_employee" : "rejected", resolved_at: new Date().toISOString() }
          : s
      )
    );
    setSelected(null);
  }

  const incoming = swaps.filter(
    (s) => s.target_id === currentUserId && s.status === "pending"
  );
  const outgoing = swaps.filter(
    (s) => s.requester_id === currentUserId && ["pending", "accepted_by_employee"].includes(s.status)
  );
  const done = swaps.filter((s) =>
    ["approved", "rejected"].includes(s.status) ||
    (s.target_id === currentUserId && s.status === "accepted_by_employee")
  );

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "incoming", label: "Εισερχόμενα", count: incoming.length },
    { key: "outgoing", label: "Εξερχόμενα",  count: outgoing.length },
    { key: "done",     label: "Ιστορικό",     count: 0 },
  ];

  const visible =
    filter === "incoming" ? incoming :
    filter === "outgoing" ? outgoing :
    done;

  return (
    <div className="max-w-phone mx-auto">
      {/* Header */}
      <div
        className="px-4 pt-5 pb-4 bg-coo-black"
        style={{ borderBottom: "3px solid #FFD800" }}
      >
        <h1 className="font-archivo text-xl text-coo-yellow tracking-tight">
          🔄 Αλλαγές Βάρδιας
        </h1>
        <p className="font-dm text-xs text-coo-yellow/50 mt-0.5">
          Αιτήσεις ανταλλαγής βάρδιας
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b-2 border-coo-black bg-white sticky top-[60px] z-20">
        {tabs.map((tab) => (
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
            {tab.count > 0 && (
              <span
                className={cn(
                  "text-[10px] font-archivo px-1.5 py-0.5 border border-coo-black min-w-[18px] text-center",
                  filter === tab.key
                    ? "bg-coo-black text-coo-yellow"
                    : "bg-coo-black/10 text-coo-black"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Swap list */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-4xl">🔄</p>
          <p className="font-dm text-sm text-coo-black/50">
            {filter === "incoming"
              ? "Δεν υπάρχουν εισερχόμενες αιτήσεις"
              : filter === "outgoing"
              ? "Δεν έχεις στείλει αιτήσεις"
              : "Δεν υπάρχει ιστορικό"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-4">
          {visible.map((swap) => (
            <SwapCard
              key={swap.id}
              swap={swap}
              currentUserId={currentUserId}
              isIncoming={filter === "incoming"}
              onTap={filter === "incoming" && swap.status === "pending" ? () => setSelected(swap) : undefined}
            />
          ))}
        </div>
      )}

      {/* Respond modal */}
      {selected && (
        <SwapRespondModal
          open={selected !== null}
          onClose={() => setSelected(null)}
          swap={selected}
          onResolved={handleResolved}
        />
      )}
    </div>
  );
}

// ── Swap card ─────────────────────────────────────────────────────────────

function SwapCard({
  swap,
  currentUserId,
  isIncoming,
  onTap,
}: {
  swap: SwapRow;
  currentUserId: string;
  isIncoming: boolean;
  onTap?: () => void;
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

  const Tag = onTap ? "button" : "div";

  return (
    <Tag
      {...(onTap ? { onClick: onTap } : {})}
      className={cn(
        "w-full text-left border-2 border-coo-black bg-white p-4 transition-colors",
        onTap ? "active:bg-coo-yellow/10 cursor-pointer" : "cursor-default"
      )}
      style={{ boxShadow: "4px 4px 0 #0A0A0A" }}
    >
      {/* Top row */}
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

      {/* People row */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Avatar
            nickname={swap.requester_nickname}
            color={swap.requester_color}
            avatarUrl={swap.requester_avatar}
            size="sm"
          />
          <span className="font-dm text-sm text-coo-black">{swap.requester_nickname}</span>
        </div>
        <ArrowRight size={14} className="text-coo-black/40 shrink-0" />
        <div className="flex items-center gap-1.5">
          <Avatar
            nickname={swap.target_nickname}
            color={swap.target_color}
            avatarUrl={swap.target_avatar}
            size="sm"
          />
          <span className="font-dm text-sm text-coo-black">{swap.target_nickname}</span>
        </div>
      </div>

      {swap.message && (
        <p className="mt-2 font-dm text-xs text-coo-black/50 italic truncate">
          &ldquo;{swap.message}&rdquo;
        </p>
      )}

      {onTap && swap.status === "pending" && (
        <div className="mt-3 flex justify-end">
          <span
            className="font-archivo text-xs px-3 py-1.5 bg-coo-black text-coo-yellow border border-coo-black"
            style={{ boxShadow: "2px 2px 0 #FFD800" }}
          >
            Απάντηση →
          </span>
        </div>
      )}
    </Tag>
  );
}

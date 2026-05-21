"use client";

import { cn } from "@/lib/utils";
import { SHIFT_CONFIG } from "@/lib/constants";
import type { ShiftType } from "@/lib/types";
import type { WeekShiftRow } from "@/lib/queries/shifts";

// ── Employee chip ────────────────────────────────────────────────────────────

interface EmpChipProps {
  row: WeekShiftRow;
  isCurrentUser?: boolean;
  onClick?: () => void;
  dark?: boolean; // for evening card (dark bg)
}

function EmpChip({ row, isCurrentUser, onClick, dark }: EmpChipProps) {
  const initial = (row.nickname ?? row.full_name ?? "?").charAt(0).toUpperCase();

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5",
        "border-2 font-dm text-sm font-semibold leading-none",
        "active:scale-95 transition-transform",
        isCurrentUser
          ? "border-coo-red"
          : dark
          ? "border-white/30"
          : "border-coo-black",
        dark ? "text-white" : "text-coo-black"
      )}
      style={!isCurrentUser ? undefined : { boxShadow: "2px 2px 0 #E63946" }}
    >
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center
                   font-archivo text-[10px] text-white shrink-0 border-2 border-white/50"
        style={{ backgroundColor: row.color ?? "#E63946" }}
      >
        {initial}
      </span>
      {row.nickname ?? row.full_name}
    </button>
  );
}

// ── Empty slot chip ──────────────────────────────────────────────────────────

function EmptySlot({
  dark,
  onClick,
}: {
  dark?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5",
        "border-2 border-dashed font-dm text-sm leading-none",
        "active:scale-95 transition-transform",
        dark ? "border-white/30 text-white/50" : "border-coo-black/30 text-coo-black/40"
      )}
    >
      <span className="text-base">＋</span>
      Κενή θέση
    </button>
  );
}

// ── Shift card ───────────────────────────────────────────────────────────────

interface ShiftCardProps {
  shiftType: ShiftType;
  rows: WeekShiftRow[];
  currentUserId?: string;
  isAdmin?: boolean;
  expectedSlots?: number;
  onSlotClick?: (row: WeekShiftRow | null, shiftType: ShiftType, slotIndex: number) => void;
}

const CARD_STYLES: Record<
  ShiftType,
  { wrapper: string; header: string; dark: boolean }
> = {
  morning: {
    wrapper: "bg-coo-yellow border-coo-black",
    header: "text-coo-black",
    dark: false,
  },
  evening: {
    wrapper: "bg-coo-black border-coo-black",
    header: "text-coo-yellow",
    dark: true,
  },
  split: {
    wrapper: "bg-coo-red border-coo-black",
    header: "text-white",
    dark: true,
  },
};

export function ShiftCard({
  shiftType,
  rows,
  currentUserId,
  isAdmin,
  expectedSlots = 1,
  onSlotClick,
}: ShiftCardProps) {
  const cfg = SHIFT_CONFIG[shiftType];
  const style = CARD_STYLES[shiftType];

  // Pad to expectedSlots with null placeholders
  const slots: (WeekShiftRow | null)[] = [
    ...rows,
    ...Array(Math.max(0, expectedSlots - rows.length)).fill(null),
  ];

  const SLOT_LABELS = shiftType === "split"
    ? ["Σερβιτόρος", "Επιπλέον"]
    : ["Bar", "Σερβιτόρος", "Επιπλέον"];

  return (
    <div
      className={cn("border-2 p-4", style.wrapper)}
      style={{ boxShadow: "4px 4px 0 #0A0A0A" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{cfg.icon}</span>
          <div>
            <p className={cn("font-archivo text-base leading-none", style.header)}>
              {cfg.label}
            </p>
            <p className={cn("font-dm text-xs mt-0.5", style.dark ? "text-white/60" : "text-coo-black/55")}>
              {cfg.hours}
            </p>
          </div>
        </div>
        <span className={cn("font-archivo text-xs px-2 py-1 border-2", style.dark ? "border-white/20 text-white/70" : "border-coo-black/20 text-coo-black/60")}>
          {cfg.hoursCount}ω
        </span>
      </div>

      {/* Employee slots */}
      <div className="flex flex-col gap-2">
        {slots.map((row, i) => {
          const isCurrentUser = row?.employee_id === currentUserId;
          const label = SLOT_LABELS[i] ?? `Θέση ${i + 1}`;
          return (
            <div key={row ? row.shift_id : `empty-${i}`} className="flex items-center gap-2">
              {/* Slot role label */}
              <span className={cn(
                "font-archivo text-[10px] w-20 shrink-0 uppercase tracking-wide",
                style.dark ? "text-white/40" : "text-coo-black/35"
              )}>
                {label}
              </span>
              {row ? (
                <div className="flex flex-col gap-0.5">
                  <EmpChip
                    row={row}
                    dark={style.dark}
                    isCurrentUser={isCurrentUser}
                    onClick={() => onSlotClick?.(row, shiftType, i)}
                  />
                  {isCurrentUser && !isAdmin && (
                    <span className="font-dm text-[10px] text-coo-red leading-none pl-1">
                      πάτα για αλλαγή
                    </span>
                  )}
                </div>
              ) : (
                <EmptySlot
                  dark={style.dark}
                  onClick={isAdmin ? () => onSlotClick?.(null, shiftType, i) : undefined}
                />
              )}
            </div>
          );
        })}

        {/* Extra slot button for admin (3rd employee) */}
        {isAdmin && rows.length >= expectedSlots && (
          <div className="flex items-center gap-2">
            <span className={cn("font-archivo text-[10px] w-20 shrink-0 uppercase tracking-wide", style.dark ? "text-white/40" : "text-coo-black/35")}>
              Επιπλέον
            </span>
            <button
              onClick={() => onSlotClick?.(null, shiftType, rows.length)}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1.5 border-2 border-dashed",
                "font-dm text-xs transition-colors",
                style.dark ? "border-white/20 text-white/40 hover:border-white/50" : "border-coo-black/20 text-coo-black/35 hover:border-coo-black/60"
              )}
            >
              <span>＋</span> Προσθήκη
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

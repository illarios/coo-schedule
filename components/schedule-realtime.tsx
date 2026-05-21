"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { format } from "date-fns";
import { Plus, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import { WeekStrip } from "@/components/week-strip";
import { ShiftCard } from "@/components/shift-card";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { SwapRequestModal } from "@/components/swap-request-modal";
import { cn } from "@/lib/utils";
import { SHIFT_CONFIG } from "@/lib/constants";
import {
  groupByDayAndType,
  assignShift,
  getActiveEmployees,
  type WeekShiftRow,
  type DayShiftMap,
} from "@/lib/queries/shifts";
import type { Profile, ShiftType, UserRole } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SlotTarget {
  row: WeekShiftRow | null;
  shiftType: ShiftType;
}

interface ScheduleRealtimeProps {
  initialRows: WeekShiftRow[];
  currentUserId: string;
  currentUserNickname: string;
  role: UserRole;
  pendingSwaps: number;
  todayStr: string;
}

// ── Main component ────────────────────────────────────────────────────────────

export function ScheduleRealtime({
  initialRows,
  currentUserId,
  currentUserNickname,
  role,
  pendingSwaps,
  todayStr,
}: ScheduleRealtimeProps) {
  const isAdmin = role === "admin";
  const supabase = createClient();

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [rows, setRows] = useState<WeekShiftRow[]>(initialRows);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [slotTarget, setSlotTarget] = useState<SlotTarget | null>(null);
  const [swapTarget, setSwapTarget] = useState<WeekShiftRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const dayMap: DayShiftMap = groupByDayAndType(rows);
  const dayShifts = dayMap[selectedDate] ?? { morning: [], evening: [], split: [] };
  const activeDates = new Set(rows.map((r) => r.date));
  const emptyCount = (["morning", "evening", "split"] as ShiftType[]).reduce(
    (acc, t) => acc + (dayShifts[t].length === 0 ? 1 : 0),
    0
  );

  useEffect(() => {
    if (!isAdmin) return;
    getActiveEmployees(supabase).then(setEmployees).catch(() => {});
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const refetchWeek = useCallback(async () => {
    const { startOfWeekStr } = getWeekBounds(weekOffset);
    const { data } = await supabase.rpc("get_week_schedule", {
      start_date: startOfWeekStr,
    });
    if (data) setRows(data as WeekShiftRow[]);
  }, [weekOffset, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("shifts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "shifts" }, () => {
        refetchWeek();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [weekOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refetchWeek();
    const { startOfWeekStr } = getWeekBounds(weekOffset);
    setSelectedDate(startOfWeekStr);
  }, [weekOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSlotClick(row: WeekShiftRow | null, shiftType: ShiftType) {
    if (isAdmin) {
      setSlotTarget({ row, shiftType });
    } else if (row?.employee_id === currentUserId) {
      setSwapTarget(row);
    }
  }

  async function handleAssign(employeeId: string | null) {
    if (!slotTarget?.row) return;
    const shiftId = slotTarget.row.shift_id;

    setRows((prev) =>
      prev.map((r) => {
        if (r.shift_id !== shiftId) return r;
        const emp = employees.find((e) => e.id === employeeId);
        return {
          ...r,
          employee_id: employeeId,
          full_name: emp?.full_name ?? null,
          nickname: emp?.nickname ?? null,
          color: emp?.color ?? null,
          avatar_url: emp?.avatar_url ?? null,
        };
      })
    );
    setSlotTarget(null);

    startTransition(async () => {
      try {
        await assignShift(supabase, shiftId, employeeId);
        toast.success("Η βάρδια ανατέθηκε!");
      } catch {
        toast.error("Σφάλμα — δοκίμασε ξανά");
        refetchWeek();
      }
    });
  }

  async function handleRemove() {
    if (!slotTarget?.row) return;
    await handleAssign(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      <WeekStrip
        selectedDate={selectedDate}
        weekOffset={weekOffset}
        onSelectDate={setSelectedDate}
        onWeekChange={setWeekOffset}
        activeDates={activeDates}
      />

      {isAdmin && (
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-b-2 border-coo-black/10">
          <StatPill label="Καλυμμένες" value={3 - emptyCount} color="bg-coo-yellow" />
          <StatPill label="Κενές" value={emptyCount} color="bg-coo-red" textLight />
          <StatPill label="Αιτήσεις" value={pendingSwaps} color="bg-coo-sky" />
        </div>
      )}

      {isAdmin && emptyCount > 0 && (
        <div
          className="mx-4 mt-4 flex items-center gap-2 p-3 border-2 border-coo-red bg-coo-red/10"
          style={{ boxShadow: "2px 2px 0 #E63946" }}
        >
          <AlertTriangle size={16} className="text-coo-red shrink-0" />
          <p className="font-dm text-sm text-coo-red font-medium">
            {emptyCount} κενή{emptyCount > 1 ? "ς" : ""} βάρδι
            {emptyCount > 1 ? "ες" : "α"} για{" "}
            {format(new Date(selectedDate + "T00:00:00"), "d/M")}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4 p-4">
        {(["morning", "evening", "split"] as ShiftType[]).map((type) => (
          <ShiftCard
            key={type}
            shiftType={type}
            rows={dayShifts[type]}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            expectedSlots={1}
            onSlotClick={(row, t) => handleSlotClick(row, t)}
          />
        ))}
      </div>

      {isAdmin && (
        <button
          onClick={() => setSlotTarget({ row: null, shiftType: "morning" })}
          className="fixed bottom-24 right-4 w-14 h-14 bg-coo-yellow border-2 border-coo-black
                     flex items-center justify-center z-30
                     active:shadow-none active:translate-x-[2px] active:translate-y-[2px]
                     transition-all duration-75"
          style={{ boxShadow: "4px 4px 0 #0A0A0A" }}
          aria-label="Νέα ανάθεση"
        >
          <Plus size={24} strokeWidth={2.5} className="text-coo-black" />
        </button>
      )}

      {/* Admin: assign modal */}
      <Modal
        open={slotTarget !== null}
        onClose={() => setSlotTarget(null)}
        title={
          slotTarget?.row
            ? `${SHIFT_CONFIG[slotTarget.shiftType]?.label} — Αλλαγή`
            : "Ανάθεση βάρδιας"
        }
      >
        {slotTarget && (
          <AssignModalContent
            target={slotTarget}
            employees={employees}
            onAssign={handleAssign}
            onRemove={slotTarget.row ? handleRemove : undefined}
            isPending={isPending}
          />
        )}
      </Modal>

      {/* Employee: swap request modal (multi-step) */}
      {swapTarget && (
        <SwapRequestModal
          open={swapTarget !== null}
          onClose={() => setSwapTarget(null)}
          shift={swapTarget}
          currentUserId={currentUserId}
          currentUserNickname={currentUserNickname}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatPill({
  label, value, color, textLight,
}: {
  label: string; value: number; color: string; textLight?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("font-archivo text-xs px-2 py-0.5 border border-coo-black", color, textLight ? "text-white" : "text-coo-black")}>
        {value}
      </span>
      <span className="font-dm text-xs text-coo-black/60">{label}</span>
    </div>
  );
}

function AssignModalContent({
  target, employees, onAssign, onRemove, isPending,
}: {
  target: SlotTarget;
  employees: Profile[];
  onAssign: (id: string) => void;
  onRemove?: () => void;
  isPending: boolean;
}) {
  const cfg = SHIFT_CONFIG[target.shiftType];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 p-3 bg-coo-paper border-2 border-coo-black/10">
        <span className="text-2xl">{cfg.icon}</span>
        <div>
          <p className="font-archivo text-sm">{cfg.label}</p>
          <p className="font-dm text-xs text-coo-black/60">{cfg.hours}</p>
        </div>
      </div>
      <p className="font-archivo text-xs tracking-wider text-coo-black/50 uppercase">Επίλεξε υπάλληλο</p>
      <div className="flex flex-col gap-2">
        {employees.map((emp) => (
          <button
            key={emp.id}
            onClick={() => onAssign(emp.id)}
            disabled={isPending}
            className={cn(
              "flex items-center gap-3 p-3 border-2 border-coo-black text-left",
              "active:bg-coo-yellow/30 hover:bg-coo-paper transition-colors disabled:opacity-50",
              target.row?.employee_id === emp.id && "bg-coo-yellow"
            )}
            style={{ boxShadow: target.row?.employee_id === emp.id ? "none" : "2px 2px 0 #0A0A0A" }}
          >
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center font-archivo text-xs text-white border-2 border-coo-black shrink-0"
              style={{ backgroundColor: emp.color }}
            >
              {emp.nickname.charAt(0)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-dm text-sm font-semibold text-coo-black">{emp.nickname}</p>
              <p className="font-dm text-xs text-coo-black/50 truncate">{emp.full_name}</p>
            </div>
            {target.row?.employee_id === emp.id && (
              <span className="font-archivo text-xs text-coo-black bg-white px-2 py-0.5 border border-coo-black">ΤΩΡΑ</span>
            )}
          </button>
        ))}
      </div>
      {onRemove && (
        <Button variant="danger" fullWidth onClick={onRemove} disabled={isPending} size="sm">
          Αφαίρεση υπαλλήλου
        </Button>
      )}
    </div>
  );
}

function getWeekBounds(weekOffset: number): { startOfWeekStr: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + weekOffset * 7);
  return { startOfWeekStr: format(monday, "yyyy-MM-dd") };
}

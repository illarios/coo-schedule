"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { format } from "date-fns";
import { AlertTriangle, Download } from "lucide-react";
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
  createShift,
  getActiveEmployees,
  type WeekShiftRow,
  type DayShiftMap,
} from "@/lib/queries/shifts";
import type { Profile, ShiftType, UserRole } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SlotTarget {
  row: WeekShiftRow | null;
  shiftType: ShiftType;
  slotIndex: number; // 0 = Bar, 1 = Σερβιτόρος, 2+ = extra
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
  // A shift type is "empty" when no one is assigned at all
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

  function handleSlotClick(row: WeekShiftRow | null, shiftType: ShiftType, slotIndex: number) {
    if (isAdmin) {
      setSlotTarget({ row, shiftType, slotIndex });
    } else if (row?.employee_id === currentUserId) {
      setSwapTarget(row);
    }
  }

  const SHIFT_DEFAULTS: Record<ShiftType, { start_time: string; end_time: string; split_break_start?: string; split_break_end?: string }> = {
    morning: { start_time: "08:00:00", end_time: "15:00:00" },
    evening: { start_time: "16:00:00", end_time: "23:00:00" },
    split:   { start_time: "11:00:00", end_time: "23:00:00", split_break_start: "15:00:00", split_break_end: "19:00:00" },
  };

  async function handleAssign(employeeId: string | null) {
    if (!slotTarget) return;
    setSlotTarget(null);

    startTransition(async () => {
      try {
        if (slotTarget.row) {
          // Update existing shift
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
          await assignShift(supabase, shiftId, employeeId);
        } else {
          // Create new shift for the selected date + type
          const defaults = SHIFT_DEFAULTS[slotTarget.shiftType];
          await createShift(supabase, {
            date: selectedDate,
            shift_type: slotTarget.shiftType,
            assigned_to: employeeId,
            ...defaults,
          });
          // Realtime subscription will refetch automatically
        }
        toast.success("Η βάρδια ανατέθηκε!");
      } catch {
        toast.error("Σφάλμα — δοκίμασε ξανά");
        refetchWeek();
      }
    });
  }

  async function handleRemove() {
    if (!slotTarget?.row) return;
    const shiftId = slotTarget.row.shift_id;
    setSlotTarget(null);
    startTransition(async () => {
      try {
        setRows((prev) =>
          prev.map((r) =>
            r.shift_id !== shiftId ? r : { ...r, employee_id: null, full_name: null, nickname: null, color: null, avatar_url: null }
          )
        );
        await assignShift(supabase, shiftId, null);
        toast.success("Υπάλληλος αφαιρέθηκε");
      } catch {
        toast.error("Σφάλμα — δοκίμασε ξανά");
        refetchWeek();
      }
    });
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
          <a
            href={`/schedule/print?week=${weekOffset}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 border-2 border-coo-black
                       bg-white font-dm text-xs text-coo-black hover:bg-coo-yellow transition-colors"
            style={{ boxShadow: "2px 2px 0 #0A0A0A" }}
          >
            <Download size={12} />
            Εκτύπωση
          </a>
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
            expectedSlots={type === "split" ? 1 : 2}
            onSlotClick={(row, t, idx) => handleSlotClick(row, t, idx)}
          />
        ))}
      </div>

      {/* Admin: assign modal */}
      <Modal
        open={slotTarget !== null}
        onClose={() => setSlotTarget(null)}
        title={
          slotTarget
            ? `${SHIFT_CONFIG[slotTarget.shiftType]?.label} — ${
                slotTarget.slotIndex === 0 ? "Bar" : slotTarget.slotIndex === 1 ? "Σερβιτόρος" : "Επιπλέον"
              }`
            : "Ανάθεση"
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

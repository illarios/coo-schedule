import type { SupabaseClient } from "@supabase/supabase-js";
import type { Shift, Profile, ShiftType } from "@/lib/types";

// ── RPC: full week with joined employee data ────────────────────────────────

export interface WeekShiftRow {
  shift_id: string;
  date: string;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  split_break_start: string | null;
  split_break_end: string | null;
  notes: string | null;
  employee_id: string | null;
  full_name: string | null;
  nickname: string | null;
  color: string | null;
  avatar_url: string | null;
  confirmed: boolean;
}

export async function getWeekSchedule(
  supabase: SupabaseClient,
  startDate: string
): Promise<WeekShiftRow[]> {
  const { data, error } = await supabase.rpc("get_week_schedule", {
    start_date: startDate,
  });
  if (error) throw error;
  return (data ?? []) as WeekShiftRow[];
}

// ── Assign a shift to an employee (admin only) ─────────────────────────────

export async function assignShift(
  supabase: SupabaseClient,
  shiftId: string,
  employeeId: string | null
) {
  const { error } = await supabase
    .from("shifts")
    .update({ assigned_to: employeeId })
    .eq("id", shiftId);
  if (error) throw error;
}

// ── Toggle confirmed flag (admin only) ────────────────────────────────────

export async function setShiftConfirmed(
  supabase: SupabaseClient,
  shiftId: string,
  confirmed: boolean
) {
  const { error } = await supabase
    .from("shifts")
    .update({ confirmed })
    .eq("id", shiftId);
  if (error) throw error;
}

// ── Create a new shift slot (admin only) ───────────────────────────────────

export async function createShift(
  supabase: SupabaseClient,
  payload: {
    date: string;
    shift_type: ShiftType;
    start_time: string;
    end_time: string;
    split_break_start?: string | null;
    split_break_end?: string | null;
    assigned_to?: string | null;
    notes?: string | null;
  }
) {
  const { data, error } = await supabase
    .from("shifts")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Shift;
}

// ── Delete a shift (admin only) ────────────────────────────────────────────

export async function deleteShift(supabase: SupabaseClient, shiftId: string) {
  const { error } = await supabase.from("shifts").delete().eq("id", shiftId);
  if (error) throw error;
}

// ── Fetch all active employees (for assign modal) ──────────────────────────

export async function getActiveEmployees(
  supabase: SupabaseClient
): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("active", true)
    .eq("role", "employee")
    .order("full_name");
  if (error) throw error;
  return (data ?? []) as Profile[];
}

// ── Count pending swap requests (for admin badge) ──────────────────────────

export async function getPendingSwapCount(
  supabase: SupabaseClient
): Promise<number> {
  const { count, error } = await supabase
    .from("shift_swaps")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) return 0;
  return count ?? 0;
}

// ── Group WeekShiftRows by date and type ──────────────────────────────────
// Returns a map: dateStr → { morning?, evening?, split? }[] (multiple per slot)

export type DayShiftMap = Record<
  string,
  Record<ShiftType, WeekShiftRow[]>
>;

export function groupByDayAndType(rows: WeekShiftRow[]): DayShiftMap {
  const map: DayShiftMap = {};
  for (const row of rows) {
    if (!map[row.date]) {
      map[row.date] = { morning: [], evening: [], split: [] };
    }
    map[row.date][row.shift_type].push(row);
  }
  return map;
}

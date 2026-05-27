import type { SupabaseClient } from "@supabase/supabase-js";
import type { SwapStatus, ShiftType } from "@/lib/types";

// ── Rich swap row (joined) ─────────────────────────────────────────────────

export interface SwapRow {
  id: string;
  shift_id: string;
  status: SwapStatus;
  message: string | null;
  created_at: string;
  resolved_at: string | null;
  // shift
  shift_date: string;
  shift_type: ShiftType;
  // requester
  requester_id: string;
  requester_nickname: string;
  requester_color: string;
  requester_avatar: string | null;
  // target
  target_id: string;
  target_nickname: string;
  target_color: string;
  target_avatar: string | null;
}

const SWAP_SELECT = `
  id,
  shift_id,
  status,
  message,
  created_at,
  resolved_at,
  shifts!shift_id (
    date,
    shift_type
  ),
  requester:profiles!requested_by (
    id,
    nickname,
    color,
    avatar_url
  ),
  target:profiles!requested_to (
    id,
    nickname,
    color,
    avatar_url
  )
` as const;

function mapRow(raw: unknown): SwapRow {
  const r = raw as {
    id: string;
    shift_id: string;
    status: SwapStatus;
    message: string | null;
    created_at: string;
    resolved_at: string | null;
    shifts: { date: string; shift_type: ShiftType } | null;
    requester: { id: string; nickname: string; color: string; avatar_url: string | null } | null;
    target: { id: string; nickname: string; color: string; avatar_url: string | null } | null;
  };
  return {
    id: r.id,
    shift_id: r.shift_id,
    status: r.status,
    message: r.message,
    created_at: r.created_at,
    resolved_at: r.resolved_at,
    shift_date: r.shifts?.date ?? "",
    shift_type: r.shifts?.shift_type ?? "morning",
    requester_id: r.requester?.id ?? "",
    requester_nickname: r.requester?.nickname ?? "",
    requester_color: r.requester?.color ?? "#FFD800",
    requester_avatar: r.requester?.avatar_url ?? null,
    target_id: r.target?.id ?? "",
    target_nickname: r.target?.nickname ?? "",
    target_color: r.target?.color ?? "#FFD800",
    target_avatar: r.target?.avatar_url ?? null,
  };
}

// ── Fetch swaps for current user (both sides) ──────────────────────────────

export async function getMySwaps(
  supabase: SupabaseClient,
  userId: string
): Promise<SwapRow[]> {
  const { data, error } = await supabase
    .from("shift_swaps")
    .select(SWAP_SELECT)
    .or(`requested_by.eq.${userId},requested_to.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

// ── Fetch all swaps for admin ──────────────────────────────────────────────

export async function getAllSwaps(
  supabase: SupabaseClient,
  statusFilter?: SwapStatus[]
): Promise<SwapRow[]> {
  let q = supabase
    .from("shift_swaps")
    .select(SWAP_SELECT)
    .order("created_at", { ascending: false });

  if (statusFilter?.length) {
    q = q.in("status", statusFilter);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

// ── Create swap request ───────────────────────────────────────────────────

export async function createSwapRequest(
  supabase: SupabaseClient,
  payload: {
    shift_id: string;
    requested_by: string;
    requested_to: string;
    message?: string | null;
  }
): Promise<string> {
  const { data, error } = await supabase
    .from("shift_swaps")
    .insert({
      shift_id: payload.shift_id,
      requested_by: payload.requested_by,
      requested_to: payload.requested_to,
      message: payload.message ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

// ── Employee responds (accept / reject) ───────────────────────────────────

export async function respondToSwap(
  supabase: SupabaseClient,
  swapId: string,
  accept: boolean
): Promise<void> {
  const { error } = await supabase
    .from("shift_swaps")
    .update({
      status: accept ? "accepted_by_employee" : "rejected",
      resolved_at: accept ? null : new Date().toISOString(),
    })
    .eq("id", swapId);
  if (error) throw error;
}

// ── Admin approves: update swap status + swap shift.assigned_to ────────────

export async function approveSwap(
  supabase: SupabaseClient,
  swap: SwapRow
): Promise<void> {
  // 1. Update swap status
  const { error: swapErr } = await supabase
    .from("shift_swaps")
    .update({ status: "approved", resolved_at: new Date().toISOString() })
    .eq("id", swap.id);
  if (swapErr) throw swapErr;

  // 2. Re-assign the shift from requester → target
  const { error: shiftErr } = await supabase
    .from("shifts")
    .update({ assigned_to: swap.target_id })
    .eq("id", swap.shift_id);
  if (shiftErr) throw shiftErr;
}

// ── Admin rejects ──────────────────────────────────────────────────────────

export async function rejectSwap(
  supabase: SupabaseClient,
  swapId: string
): Promise<void> {
  const { error } = await supabase
    .from("shift_swaps")
    .update({ status: "rejected", resolved_at: new Date().toISOString() })
    .eq("id", swapId);
  if (error) throw error;
}

// ── Notify a user (insert into notifications table) ───────────────────────

export async function createNotification(
  supabase: SupabaseClient,
  payload: {
    user_id: string;
    type: string;
    title: string;
    body: string;
    related_id?: string;
  }
): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    user_id: payload.user_id,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    related_id: payload.related_id ?? null,
  });
  if (error) throw error;
}

// ── Fetch colleagues for swap selection ───────────────────────────────────
// Returns all employees except the requester. Availability is shown
// informatively but does NOT filter anyone out.

export interface AvailableColleague {
  id: string;
  nickname: string;
  full_name: string;
  color: string;
  avatar_url: string | null;
  availability: string[];
}

export async function getAvailableColleagues(
  supabase: SupabaseClient,
  date: string,
  excludeUserId: string
): Promise<AvailableColleague[]> {
  // Fetch all employee profiles except self
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, nickname, full_name, color, avatar_url")
    .eq("role", "employee")
    .neq("id", excludeUserId);

  if (profilesError) throw profilesError;

  // Fetch availability for this date (best-effort, no filter)
  const { data: avail } = await supabase
    .from("availability")
    .select("user_id, availability")
    .eq("date", date);

  const availMap = new Map<string, string[]>(
    ((avail ?? []) as { user_id: string; availability: string[] }[]).map(
      (r) => [r.user_id, r.availability]
    )
  );

  return ((profiles ?? []) as {
    id: string;
    nickname: string;
    full_name: string;
    color: string;
    avatar_url: string | null;
  }[]).map((p) => ({
    id: p.id,
    nickname: p.nickname ?? "",
    full_name: p.full_name ?? "",
    color: p.color ?? "#FFD800",
    avatar_url: p.avatar_url ?? null,
    availability: availMap.get(p.id) ?? [],
  }));
}

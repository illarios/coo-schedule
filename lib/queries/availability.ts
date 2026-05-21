import type { SupabaseClient } from "@supabase/supabase-js";
import type { Availability, AvailabilityType, Profile } from "@/lib/types";

// ── Fetch own availability for a date range ─────────────────────────────────

export async function getMyAvailability(
  supabase: SupabaseClient,
  userId: string,
  fromDate: string,
  toDate: string
): Promise<Availability[]> {
  const { data, error } = await supabase
    .from("availability")
    .select("*")
    .eq("user_id", userId)
    .gte("date", fromDate)
    .lte("date", toDate)
    .order("date");
  if (error) throw error;
  return (data ?? []) as Availability[];
}

// ── Upsert a single day availability ───────────────────────────────────────

export async function upsertAvailability(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  availability: AvailabilityType[],
  note?: string | null
): Promise<Availability> {
  const { data, error } = await supabase
    .from("availability")
    .upsert(
      { user_id: userId, date, availability, note: note ?? null },
      { onConflict: "user_id,date" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as Availability;
}

// ── Admin: all employees availability for a range ──────────────────────────

export interface AllAvailabilityRow {
  user_id: string;
  date: string;
  availability: AvailabilityType[];
  note: string | null;
  nickname: string;
  full_name: string;
  color: string;
}

export async function getAllAvailability(
  supabase: SupabaseClient,
  fromDate: string,
  toDate: string
): Promise<AllAvailabilityRow[]> {
  const { data, error } = await supabase
    .from("availability")
    .select("user_id, date, availability, note, profiles(nickname, full_name, color)")
    .gte("date", fromDate)
    .lte("date", toDate)
    .order("date");
  if (error) throw error;

  return ((data ?? []) as unknown[]).map((row: unknown) => {
    const r = row as {
      user_id: string;
      date: string;
      availability: AvailabilityType[];
      note: string | null;
      profiles: { nickname: string; full_name: string; color: string } | null;
    };
    return {
      user_id: r.user_id,
      date: r.date,
      availability: r.availability,
      note: r.note,
      nickname: r.profiles?.nickname ?? "",
      full_name: r.profiles?.full_name ?? "",
      color: r.profiles?.color ?? "#FFD800",
    };
  });
}

// ── Fetch all active employees (for admin grid header) ─────────────────────

export async function getActiveEmployeeProfiles(
  supabase: SupabaseClient
): Promise<Pick<Profile, "id" | "nickname" | "full_name" | "color">[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname, full_name, color")
    .eq("active", true)
    .neq("role", "admin")
    .order("full_name");
  if (error) throw error;
  return (data ?? []) as Pick<Profile, "id" | "nickname" | "full_name" | "color">[];
}

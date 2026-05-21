import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppNotification } from "@/lib/types";

export async function getMyNotifications(
  supabase: SupabaseClient,
  limit = 30
): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient
): Promise<void> {
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("read", false);
}

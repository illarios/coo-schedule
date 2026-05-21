import { redirect } from "next/navigation";
import { format, startOfWeek } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { ScheduleRealtime } from "@/components/schedule-realtime";
import {
  getWeekSchedule,
  getPendingSwapCount,
} from "@/lib/queries/shifts";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Profile (already fetched in layout, but needed here for role)
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, role, nickname")
    .eq("id", user.id)
    .single();

  const profile = profileData as Pick<Profile, "id" | "role" | "nickname"> | null;
  if (!profile) redirect("/login");

  // Current week Monday
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const mondayStr = format(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );

  // Parallel fetches
  const [initialRows, pendingSwaps] = await Promise.all([
    getWeekSchedule(supabase, mondayStr).catch(() => []),
    profile.role === "admin"
      ? getPendingSwapCount(supabase)
      : Promise.resolve(0),
  ]);

  return (
    <ScheduleRealtime
      initialRows={initialRows}
      currentUserId={profile.id}
      currentUserNickname={profile.nickname}
      role={profile.role}
      pendingSwaps={pendingSwaps}
      todayStr={todayStr}
    />
  );
}

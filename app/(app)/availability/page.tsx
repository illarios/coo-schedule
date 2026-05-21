import { redirect } from "next/navigation";
import { format, addWeeks, startOfWeek, endOfWeek } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { AvailabilityForm } from "@/components/availability-form";
import { AvailabilityAdminView } from "@/components/availability-admin-view";
import {
  getMyAvailability,
  getAllAvailability,
  getActiveEmployeeProfiles,
} from "@/lib/queries/availability";
import type { Profile, Availability } from "@/lib/types";

export const dynamic = "force-dynamic";

function getNextWeekDates(): { from: string; to: string; dates: string[] } {
  const nextMonday = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1);
  const nextSunday = endOfWeek(nextMonday, { weekStartsOn: 1 });
  const from = format(nextMonday, "yyyy-MM-dd");
  const to = format(nextSunday, "yyyy-MM-dd");
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(nextMonday);
    d.setDate(nextMonday.getDate() + i);
    return format(d, "yyyy-MM-dd");
  });
  return { from, to, dates };
}

export default async function AvailabilityPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, role, nickname")
    .eq("id", user.id)
    .single();

  const profile = profileData as Pick<Profile, "id" | "role" | "nickname"> | null;
  if (!profile) redirect("/login");

  const { from, to, dates } = getNextWeekDates();

  if (profile.role === "admin") {
    const [allAvailability, employees] = await Promise.all([
      getAllAvailability(supabase, from, to).catch(() => []),
      getActiveEmployeeProfiles(supabase).catch(() => []),
    ]);

    return (
      <AvailabilityAdminView
        allAvailability={allAvailability}
        employees={employees}
        nextWeekDates={dates}
      />
    );
  }

  // Employee: own form only
  const myAvailability = await getMyAvailability(
    supabase,
    profile.id,
    from,
    to
  ).catch(() => []);

  return (
    <AvailabilityForm
      userId={profile.id}
      initial={myAvailability as Availability[]}
    />
  );
}

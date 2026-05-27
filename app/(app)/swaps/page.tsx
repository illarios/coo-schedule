import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EmployeeSwapsClient } from "@/components/employee-swaps-client";
import { getMySwaps } from "@/lib/queries/swaps";

export default async function SwapsPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nickname, color, avatar_url, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const swaps = await getMySwaps(supabase, user.id).catch(() => []);

  return (
    <EmployeeSwapsClient
      currentUserId={user.id}
      initialSwaps={swaps}
    />
  );
}

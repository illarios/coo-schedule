import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSwapsList } from "@/components/admin-swaps-list";
import { getAllSwaps } from "@/lib/queries/swaps";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminSwapsPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const profile = profileData as Pick<Profile, "id" | "role"> | null;
  if (!profile || profile.role !== "admin") redirect("/schedule");

  const initialSwaps = await getAllSwaps(supabase).catch(() => []);

  const pendingCount = initialSwaps.filter(
    (s) => s.status === "accepted_by_employee"
  ).length;

  return (
    <div>
      {/* Page header */}
      <div className="bg-white border-b-2 border-coo-black px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="font-archivo text-xl text-coo-black">Αιτήσεις Swap</h1>
          {pendingCount > 0 && (
            <span
              className="font-archivo text-xs px-3 py-1.5 bg-coo-red text-white border-2 border-coo-black"
              style={{ boxShadow: "2px 2px 0 #0A0A0A" }}
            >
              {pendingCount} προς έγκριση
            </span>
          )}
        </div>
        <p className="font-dm text-xs text-coo-black/50 mt-1">
          Διαχείριση αιτήσεων αλλαγής βάρδιας
        </p>
      </div>

      <AdminSwapsList initialSwaps={initialSwaps} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAssignPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/schedule");

  return (
    <div className="p-4">
      <h1 className="font-archivo text-xl text-coo-black">Ανάθεση Βαρδιών</h1>
      <p className="font-dm text-sm text-coo-black/50 mt-1">Σύντομα διαθέσιμο</p>
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmployeesClient } from "@/components/employees-client";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminEmployeesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") redirect("/schedule");

  const { data: employees } = await supabase
    .from("profiles")
    .select("*")
    .order("nickname");

  return (
    <div>
      <div className="bg-white border-b-2 border-coo-black px-4 py-4">
        <h1 className="font-archivo text-xl text-coo-black">Υπάλληλοι</h1>
        <p className="font-dm text-xs text-coo-black/50 mt-1">
          Δημιουργία και διαχείριση λογαριασμών
        </p>
      </div>
      <EmployeesClient initialEmployees={(employees ?? []) as Profile[]} />
    </div>
  );
}

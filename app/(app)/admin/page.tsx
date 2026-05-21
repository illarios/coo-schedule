import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/schedule");

  const links = [
    { href: "/admin/swaps",     label: "Αιτήσεις Swap",   icon: "🔄" },
    { href: "/admin/assign",    label: "Ανάθεση Βαρδιών", icon: "📅" },
    { href: "/admin/employees", label: "Υπάλληλοι",        icon: "👥" },
  ];

  return (
    <div>
      <div className="bg-white border-b-2 border-coo-black px-4 py-4">
        <h1 className="font-archivo text-xl text-coo-black">Admin</h1>
        <p className="font-dm text-xs text-coo-black/50 mt-1">Διαχείριση εφαρμογής</p>
      </div>
      <div className="flex flex-col gap-3 p-4">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-4 bg-white border-2 border-coo-black p-4
                       active:bg-coo-yellow/10 transition-colors"
            style={{ boxShadow: "4px 4px 0 #0A0A0A" }}
          >
            <span className="text-2xl">{l.icon}</span>
            <span className="font-archivo text-base text-coo-black">{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div>
      <div className="bg-white border-b-2 border-coo-black px-4 py-4">
        <h1 className="font-archivo text-xl text-coo-black">Ιστορικό Ωρών</h1>
        <p className="font-dm text-xs text-coo-black/50 mt-1">Σύντομα διαθέσιμο</p>
      </div>
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-4xl">⏱</p>
        <p className="font-dm text-sm text-coo-black/50">Το ιστορικό ωρών έρχεται σύντομα</p>
      </div>
    </div>
  );
}

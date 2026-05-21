"use client";

import { useState } from "react";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { el } from "date-fns/locale";
import { LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";

interface TopbarProps {
  profile: Profile;
}

function getWeekLabel(): string {
  const now = new Date();
  const mon = startOfWeek(now, { weekStartsOn: 1 });
  const sun = endOfWeek(now, { weekStartsOn: 1 });
  return `Εβδομάδα ${format(mon, "d", { locale: el })}–${format(sun, "d MMM", { locale: el })}`;
}

export function Topbar({ profile }: TopbarProps) {
  const isAdmin = profile.role === "admin";
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 bg-coo-yellow border-b-2 border-coo-black">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="font-marker text-3xl text-coo-black leading-none select-none">
          COO
        </span>

        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 bg-coo-black text-coo-yellow
                       font-archivo text-xs px-3 py-1.5 rounded-full"
          >
            {isAdmin && <span>👑</span>}
            <span>{profile.nickname}</span>
            <span className="opacity-50">·</span>
            <span className="uppercase opacity-75 text-[10px]">
              {isAdmin ? "admin" : "employee"}
            </span>
          </span>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Αποσύνδεση"
            className="flex items-center justify-center w-8 h-8 border-2 border-coo-black
                       bg-white/60 hover:bg-white active:bg-white transition-colors
                       disabled:opacity-40"
          >
            {loggingOut
              ? <Loader2 size={14} className="animate-spin text-coo-black" />
              : <LogOut size={14} className="text-coo-black" />
            }
          </button>
        </div>
      </div>

      <div className="px-4 pb-3 flex items-baseline justify-between">
        <p className="font-dm text-sm text-coo-black/80">
          Καλώς ήρθες,{" "}
          <span className="font-semibold text-coo-black">{profile.nickname}</span>
        </p>
        <p className="font-dm text-xs text-coo-black/55">{getWeekLabel()}</p>
      </div>
    </header>
  );
}

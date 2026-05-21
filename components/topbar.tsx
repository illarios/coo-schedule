import { startOfWeek, endOfWeek, format } from "date-fns";
import { el } from "date-fns/locale";
import type { Profile } from "@/lib/types";

interface TopbarProps {
  profile: Profile;
}

function getWeekLabel(): string {
  const now = new Date();
  const mon = startOfWeek(now, { weekStartsOn: 1 });
  const sun = endOfWeek(now, { weekStartsOn: 1 });
  const monStr = format(mon, "d", { locale: el });
  const sunStr = format(sun, "d MMM", { locale: el });
  return `Εβδομάδα ${monStr}–${sunStr}`;
}

export function Topbar({ profile }: TopbarProps) {
  const isAdmin = profile.role === "admin";

  return (
    <header className="sticky top-0 z-30 bg-coo-yellow border-b-2 border-coo-black">
      {/* Main row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="font-marker text-3xl text-coo-black leading-none select-none">
          COO
        </span>

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
      </div>

      {/* Greeting row */}
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

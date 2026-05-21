import { redirect } from "next/navigation";
import { format, addWeeks, startOfWeek, endOfWeek } from "date-fns";
import { el } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { getWeekSchedule, groupByDayAndType } from "@/lib/queries/shifts";
import { SHIFT_CONFIG } from "@/lib/constants";
import type { Profile, ShiftType } from "@/lib/types";
import { PrintTrigger } from "./print-trigger";

export const dynamic = "force-dynamic";

const SHIFT_TYPES: ShiftType[] = ["morning", "evening", "split"];

function getWeekDates(offset: number) {
  const base = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), offset);
  const end  = endOfWeek(base, { weekStartsOn: 1 });
  const monday = format(base, "yyyy-MM-dd");
  const dates: string[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return format(d, "yyyy-MM-dd");
  });
  return { monday, dates, label: `${format(base, "d")}–${format(end, "d MMMM yyyy", { locale: el })}` };
}

export default async function PrintSchedulePage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const profile = profileData as Pick<Profile, "role"> | null;
  if (!profile || profile.role !== "admin") redirect("/schedule");

  const offset = parseInt(searchParams.week ?? "0", 10);
  const { monday, dates, label } = getWeekDates(offset);

  const rows = await getWeekSchedule(supabase, monday).catch(() => []);
  const dayMap = groupByDayAndType(rows);

  return (
    <div className="min-h-screen bg-white p-6 print:p-0">
      <PrintTrigger />

      {/* Hide app chrome when printing */}
      <style>{`
        @media print {
          header, nav, [data-bottomnav] { display: none !important; }
          body { background: white; }
        }
      `}</style>

      <div className="max-w-2xl mx-auto">
        <div className="flex items-baseline justify-between mb-4 border-b-4 border-black pb-3">
          <div>
            <h1 className="font-archivo text-2xl font-black text-black">COO</h1>
            <p className="font-dm text-sm text-black/60">Πρόγραμμα εβδομάδας {label}</p>
          </div>
          <p className="font-dm text-xs text-black/40">
            Εκτυπώθηκε {format(new Date(), "dd/MM/yyyy HH:mm")}
          </p>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-black text-yellow-400">
              <th className="text-left p-2 font-archivo text-xs border border-black w-[22%]">Μέρα</th>
              {SHIFT_TYPES.map((t) => (
                <th key={t} className="text-left p-2 font-archivo text-xs border border-black">
                  {SHIFT_CONFIG[t].icon} {SHIFT_CONFIG[t].label}
                  <span className="block font-dm text-[10px] opacity-60 font-normal">{SHIFT_CONFIG[t].hours}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dates.map((d, i) => {
              const dayShifts = dayMap[d] ?? { morning: [], evening: [], split: [] };
              const dayLabel = format(new Date(d + "T00:00:00"), "EEEE d/M", { locale: el });
              return (
                <tr key={d} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="p-2 border border-gray-200 font-dm text-xs font-semibold capitalize">
                    {dayLabel}
                  </td>
                  {SHIFT_TYPES.map((t) => {
                    const shifts = dayShifts[t] ?? [];
                    return (
                      <td key={t} className="p-2 border border-gray-200">
                        {shifts.length === 0 ? (
                          <span className="text-gray-300 text-xs">—</span>
                        ) : (
                          shifts.map((s) => (
                            <div key={s.shift_id} className="font-dm text-sm">
                              {s.nickname ?? <span className="text-gray-400 text-xs italic">Κενό</span>}
                            </div>
                          ))
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="mt-6 font-dm text-xs text-black/30 text-center print:mt-4">
          COO · Πτολεμαΐδα · Περδίκα 4
        </p>
      </div>
    </div>
  );
}

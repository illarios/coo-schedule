"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { getAllAvailability, type AllAvailabilityRow } from "@/lib/queries/availability";
import { AVAILABILITY_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AvailabilityType } from "@/lib/types";

const CELL_STYLES: Record<AvailabilityType, { bg: string; text: string; short: string }> = {
  morning: { bg: "bg-coo-yellow",  text: "text-coo-black", short: "ΠΡ"  },
  evening: { bg: "bg-coo-black",   text: "text-coo-yellow", short: "ΒΡ" },
  split:   { bg: "bg-coo-red",     text: "text-white",      short: "ΣΠ"  },
  off:     { bg: "bg-coo-sky",     text: "text-coo-black",  short: "ΡΠ"  },
  any:     { bg: "bg-coo-paper",   text: "text-coo-black",  short: "ΟΠ"  },
};

interface Employee {
  id: string;
  nickname: string;
  full_name: string;
  color: string;
}

interface AvailabilityGridProps {
  employees: Employee[];
  initialRows: AllAvailabilityRow[];
  dates: string[]; // 7 ISO date strings for next week
}

export function AvailabilityGrid({
  employees,
  initialRows,
  dates,
}: AvailabilityGridProps) {
  const supabase = createClient();

  // Map: userId+date → availability types (array)
  const buildMap = (rows: AllAvailabilityRow[]) => {
    const m: Record<string, AvailabilityType[]> = {};
    for (const r of rows) m[`${r.user_id}__${r.date}`] = r.availability;
    return m;
  };

  const [cellMap, setCellMap] = useState<Record<string, AvailabilityType[]>>(
    buildMap(initialRows)
  );

  // Realtime: re-fetch entire grid on any availability change
  useEffect(() => {
    const channel = supabase
      .channel("availability-admin-grid")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "availability" },
        async () => {
          const fresh = await getAllAvailability(
            supabase,
            dates[0],
            dates[dates.length - 1]
          );
          setCellMap(buildMap(fresh));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dates]); // eslint-disable-line react-hooks/exhaustive-deps

  // Coverage stats per date
  function coverageFor(dateStr: string) {
    let filled = 0;
    for (const emp of employees) {
      if ((cellMap[`${emp.id}__${dateStr}`] ?? []).length > 0) filled++;
    }
    return { filled, total: employees.length };
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="min-w-[520px]">
        {/* Header row */}
        <div
          className="grid bg-coo-black sticky top-0 z-10"
          style={{ gridTemplateColumns: `80px repeat(${dates.length}, 1fr)` }}
        >
          <div className="px-2 py-2.5" />
          {dates.map((d) => {
            const { filled, total } = coverageFor(d);
            return (
              <div key={d} className="px-1 py-2 text-center">
                <p className="font-archivo text-[10px] text-coo-yellow/70 uppercase tracking-wider">
                  {format(new Date(d + "T00:00:00"), "EEE", { locale: el }).slice(0, 3).toUpperCase()}
                </p>
                <p className="font-archivo text-sm text-coo-yellow leading-none mt-0.5">
                  {format(new Date(d + "T00:00:00"), "d")}
                </p>
                <p className="font-dm text-[9px] text-coo-yellow/50 mt-1">
                  {filled}/{total}
                </p>
              </div>
            );
          })}
        </div>

        {/* Employee rows */}
        {employees.map((emp, empIdx) => (
          <div
            key={emp.id}
            className={cn(
              "grid border-b border-coo-black/10",
              empIdx % 2 === 0 ? "bg-white" : "bg-coo-paper/60"
            )}
            style={{ gridTemplateColumns: `80px repeat(${dates.length}, 1fr)` }}
          >
            {/* Name cell */}
            <div className="flex items-center gap-1.5 px-2 py-2 border-r-2 border-coo-black/10">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center
                           font-archivo text-[9px] text-white shrink-0"
                style={{ backgroundColor: emp.color }}
              >
                {emp.nickname.charAt(0)}
              </span>
              <span className="font-dm text-xs text-coo-black truncate">
                {emp.nickname}
              </span>
            </div>

            {/* Availability cells */}
            {dates.map((d) => {
              const key = `${emp.id}__${d}`;
              const types = cellMap[key] ?? [];

              return (
                <div
                  key={d}
                  className="flex flex-col items-center justify-center gap-0.5 border-r border-coo-black/5 py-1.5 min-h-[36px]"
                  title={types.length ? types.map((t) => AVAILABILITY_CONFIG[t].label).join(", ") : "Αδήλωτο"}
                >
                  {types.length > 0 ? (
                    types.map((t) => {
                      const style = CELL_STYLES[t];
                      return (
                        <span
                          key={t}
                          className={cn(
                            "font-archivo text-[9px] leading-none px-1 py-0.5 w-full text-center",
                            style.bg,
                            style.text
                          )}
                        >
                          {style.short}
                        </span>
                      );
                    })
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-coo-black/15" />
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex flex-wrap gap-2 px-2 pt-3 pb-1">
          {(Object.entries(CELL_STYLES) as [AvailabilityType, typeof CELL_STYLES[AvailabilityType]][])
            .filter(([t]) => t !== "any")
            .map(([type, style]) => (
              <div key={type} className="flex items-center gap-1">
                <span
                  className={cn(
                    "inline-block w-5 h-4 border border-coo-black/20",
                    style.bg
                  )}
                />
                <span className="font-dm text-[10px] text-coo-black/60">
                  {AVAILABILITY_CONFIG[type].label}
                </span>
              </div>
            ))}
          <div className="flex items-center gap-1">
            <span className="inline-block w-5 h-4 border border-coo-black/20 bg-white" />
            <span className="font-dm text-[10px] text-coo-black/60">Αδήλωτο</span>
          </div>
        </div>
      </div>
    </div>
  );
}

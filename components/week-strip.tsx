"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, addWeeks, startOfWeek } from "date-fns";
import { el } from "date-fns/locale";

export interface WeekDay {
  date: Date;
  dateStr: string; // "2025-05-21"
  dayShort: string; // "ΔΕΥ"
  dayNum: string; // "21"
  isToday: boolean;
}

function buildWeek(monday: Date): WeekDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return {
      date,
      dateStr: format(date, "yyyy-MM-dd"),
      dayShort: format(date, "EEE", { locale: el }).toUpperCase().slice(0, 3),
      dayNum: format(date, "d"),
      isToday: isToday(date),
    };
  });
}

interface WeekStripProps {
  selectedDate: string;
  weekOffset: number; // 0 = current, -1 = prev, +1 = next
  onSelectDate: (dateStr: string) => void;
  onWeekChange: (offset: number) => void;
  /** optional: dateStrs that have at least one shift */
  activeDates?: Set<string>;
}

export function WeekStrip({
  selectedDate,
  weekOffset,
  onSelectDate,
  onWeekChange,
  activeDates,
}: WeekStripProps) {
  const baseMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const monday = addWeeks(baseMonday, weekOffset);
  const days = buildWeek(monday);

  // Month label for the strip header
  const monthLabel = format(monday, "MMMM yyyy", { locale: el });

  return (
    <div className="bg-white border-b-2 border-coo-black select-none">
      {/* Month row + arrows */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <button
          onClick={() => onWeekChange(weekOffset - 1)}
          className="p-1.5 -ml-1 text-coo-black hover:bg-coo-yellow/40 active:bg-coo-yellow
                     border-2 border-transparent hover:border-coo-black transition-colors"
          aria-label="Προηγούμενη εβδομάδα"
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>

        <span className="font-archivo text-xs tracking-wider text-coo-black/60 uppercase">
          {monthLabel}
        </span>

        <button
          onClick={() => onWeekChange(weekOffset + 1)}
          className="p-1.5 -mr-1 text-coo-black hover:bg-coo-yellow/40 active:bg-coo-yellow
                     border-2 border-transparent hover:border-coo-black transition-colors"
          aria-label="Επόμενη εβδομάδα"
        >
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Day chips */}
      <div className="grid grid-cols-7 gap-0 px-2 pb-3">
        {days.map((day) => {
          const isSelected = day.dateStr === selectedDate;
          const hasShifts = activeDates?.has(day.dateStr);

          return (
            <button
              key={day.dateStr}
              onClick={() => onSelectDate(day.dateStr)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 mx-0.5",
                "border-2 transition-all duration-100 active:scale-95",
                isSelected
                  ? "bg-coo-black text-coo-yellow border-coo-black"
                  : day.isToday
                  ? "bg-white text-coo-black border-coo-red"
                  : "bg-white text-coo-black border-transparent hover:border-coo-black/20"
              )}
            >
              <span
                className={cn(
                  "font-archivo text-[9px] tracking-wider",
                  isSelected ? "text-coo-yellow/70" : "text-coo-black/50"
                )}
              >
                {day.dayShort}
              </span>
              <span
                className={cn(
                  "font-archivo text-sm leading-none",
                  isSelected ? "text-coo-yellow" : "text-coo-black"
                )}
              >
                {day.dayNum}
              </span>
              {/* Dot indicator for days with shifts */}
              <span
                className={cn(
                  "w-1 h-1 rounded-full",
                  hasShifts
                    ? isSelected
                      ? "bg-coo-yellow"
                      : "bg-coo-black"
                    : "bg-transparent"
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

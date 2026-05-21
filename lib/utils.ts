import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isToday, startOfWeek, addDays } from "date-fns";
import { el } from "date-fns/locale";
import type { WeekDay } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatGreekDate(date: Date | string, fmt = "d MMM yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, fmt, { locale: el });
}

export function getWeekDays(referenceDate: Date = new Date()): WeekDay[] {
  const monday = startOfWeek(referenceDate, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    return {
      date,
      dateStr: format(date, "yyyy-MM-dd"),
      label: format(date, "EEE d", { locale: el }),
      isToday: isToday(date),
    };
  });
}

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

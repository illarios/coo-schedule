import type { ShiftType, AvailabilityType } from "./types";

export const SHIFT_CONFIG: Record<
  ShiftType,
  { label: string; icon: string; hours: string; bg: string; text: string; hoursCount: number }
> = {
  morning: {
    label: "ΠΡΩΙ",
    icon: "🌅",
    hours: "08:00–15:00",
    bg: "bg-coo-yellow",
    text: "text-coo-black",
    hoursCount: 7,
  },
  evening: {
    label: "ΒΡΑΔΥ",
    icon: "🌙",
    hours: "16:00–23:00",
    bg: "bg-coo-black",
    text: "text-coo-yellow",
    hoursCount: 7,
  },
  split: {
    label: "ΣΠΑΣΤΟ",
    icon: "⚡",
    hours: "11:00–15:00 + 19:00–23:00",
    bg: "bg-coo-red",
    text: "text-white",
    hoursCount: 8,
  },
};

export const AVAILABILITY_CONFIG: Record<AvailabilityType, { label: string; icon: string }> = {
  morning: { label: "Πρωί",      icon: "🌅" },
  evening: { label: "Βράδυ",     icon: "🌙" },
  split:   { label: "Σπαστό",    icon: "⚡" },
  any:     { label: "Οποτεδήποτε", icon: "✅" },
  off:     { label: "Ρεπό",      icon: "🚫" },
};

export const DAYS_EL = ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ", "Κυρ"] as const;

export const EMPLOYEE_COLORS = [
  "#FFD800", "#7DD3FC", "#E63946", "#4ADE80",
  "#FB923C", "#C084FC", "#F472B6", "#34D399",
] as const;

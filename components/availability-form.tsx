"use client";

import { useState, useCallback, useRef } from "react";
import { format, addWeeks, startOfWeek, endOfWeek, differenceInSeconds } from "date-fns";
import { el } from "date-fns/locale";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { upsertAvailability, deleteAvailability } from "@/lib/queries/availability";
import { AVAILABILITY_CONFIG } from "@/lib/constants";
import type { Availability, AvailabilityType } from "@/lib/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const AVAIL_BUTTONS: { type: AvailabilityType; icon: string; label: string }[] = [
  { type: "morning", icon: "🌅", label: "ΠΡΩΙ" },
  { type: "evening", icon: "🌙", label: "ΒΡΑΔΥ" },
  { type: "split",   icon: "⚡", label: "ΣΠΑΣΤΟ" },
  { type: "off",     icon: "🚫", label: "ΡΕΠΟ" },
];

// Deadline: Sunday 23:59 of the current week (eve of next Monday)
function getDeadline(): Date {
  const nextMonday = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1);
  const sunday = new Date(nextMonday);
  sunday.setDate(nextMonday.getDate() - 1);
  sunday.setHours(23, 59, 59, 0);
  return sunday;
}

function useCountdown(deadline: Date) {
  const [secondsLeft, setSecondsLeft] = useState(
    Math.max(0, differenceInSeconds(deadline, new Date()))
  );

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  if (!intervalRef.current) {
    intervalRef.current = setInterval(() => {
      const s = Math.max(0, differenceInSeconds(deadline, new Date()));
      setSecondsLeft(s);
    }, 1000);
  }

  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;
  const expired = secondsLeft === 0;
  const label = expired
    ? "Η δήλωση έχει κλείσει"
    : `${h}ω ${m.toString().padStart(2, "0")}λ ${s.toString().padStart(2, "0")}δ`;

  return { label, expired };
}

// ── Build next week days ───────────────────────────────────────────────────────

interface DayInfo {
  date: Date;
  dateStr: string;
  dayLabel: string; // "Δευτέρα 26 Μαΐου"
}

function getNextWeekDays(): DayInfo[] {
  const nextMonday = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(nextMonday);
    date.setDate(nextMonday.getDate() + i);
    return {
      date,
      dateStr: format(date, "yyyy-MM-dd"),
      dayLabel: format(date, "EEEE d MMMM", { locale: el }),
    };
  });
}

function getNextWeekRange(): { from: string; to: string; label: string } {
  const nextMonday = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1);
  const nextSunday = endOfWeek(nextMonday, { weekStartsOn: 1 });
  return {
    from: format(nextMonday, "yyyy-MM-dd"),
    to: format(nextSunday, "yyyy-MM-dd"),
    label: `${format(nextMonday, "d")}–${format(nextSunday, "d MMM", { locale: el })}`,
  };
}

// ── Active button styles ───────────────────────────────────────────────────────

const ACTIVE_STYLES: Record<AvailabilityType, string> = {
  morning: "bg-coo-yellow text-coo-black border-coo-black",
  evening: "bg-coo-black text-coo-yellow border-coo-black",
  split:   "bg-coo-red   text-white      border-coo-black",
  off:     "bg-coo-sky   text-coo-black  border-coo-black",
  any:     "bg-coo-paper text-coo-black  border-coo-black",
};

// ── Day card ──────────────────────────────────────────────────────────────────

interface DayCardProps {
  day: DayInfo;
  saved: AvailabilityType[];
  isSaving: boolean;
  disabled: boolean;
  onSelect: (types: AvailabilityType[], note: string | null) => void;
}

function DayCard({ day, saved, isSaving, disabled, onSelect }: DayCardProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<AvailabilityType[]>(saved);

  // Keep in sync if parent provides new saved value
  const prevSaved = useRef(saved);
  if (prevSaved.current !== saved) {
    prevSaved.current = saved;
    setSelected(saved);
  }

  function handleToggle(type: AvailabilityType) {
    if (disabled) return;
    let next: AvailabilityType[];
    if (type === "off") {
      // "off" is exclusive — clear everything else
      next = selected.includes("off") ? [] : ["off"];
    } else {
      // toggling a work type deselects "off"
      const without = selected.filter((t) => t !== "off");
      next = without.includes(type)
        ? without.filter((t) => t !== type)
        : [...without, type];
    }
    setSelected(next);
    onSelect(next, note || null);
  }

  const isWeekend = [5, 6].includes(day.date.getDay());
  const hasSaved = selected.length > 0;

  return (
    <div
      className={cn(
        "border-2 border-coo-black bg-white p-4",
        isWeekend && "bg-coo-paper/60"
      )}
      style={{ boxShadow: "4px 4px 0 #0A0A0A" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-archivo text-sm text-coo-black capitalize">{day.dayLabel}</p>
          {hasSaved && (
            <p className="font-dm text-xs text-coo-black/50 mt-0.5">
              {isSaving
                ? "Αποθήκευση…"
                : `✓ ${selected.map((t) => AVAILABILITY_CONFIG[t].label).join(" · ")}`}
            </p>
          )}
        </div>
        {/* Saved indicator dot */}
        <span
          className={cn(
            "w-2.5 h-2.5 rounded-full border-2 border-coo-black transition-colors",
            hasSaved ? "bg-coo-yellow" : "bg-transparent"
          )}
        />
      </div>

      {/* 2×2 button grid */}
      <div className="grid grid-cols-2 gap-2">
        {AVAIL_BUTTONS.map(({ type, icon, label }) => {
          const isActive = selected.includes(type);
          return (
            <button
              key={type}
              onClick={() => handleToggle(type)}
              disabled={disabled}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 border-2 font-dm text-sm font-medium",
                "transition-all duration-100 active:scale-[0.97]",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                isActive
                  ? ACTIVE_STYLES[type]
                  : "bg-white text-coo-black border-coo-black/25 hover:border-coo-black"
              )}
              style={
                isActive
                  ? { boxShadow: "2px 2px 0 #0A0A0A" }
                  : undefined
              }
            >
              <span className="text-base leading-none">{icon}</span>
              {label}
            </button>
          );
        })}
      </div>

      {/* Note toggle */}
      <button
        onClick={() => setNoteOpen((v) => !v)}
        className="mt-3 flex items-center gap-1 font-dm text-xs text-coo-black/40
                   hover:text-coo-black transition-colors"
      >
        {noteOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {noteOpen ? "Κλείσιμο σημείωσης" : "Προσθήκη σημείωσης"}
      </button>

      {noteOpen && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => {
            if (hasSaved) onSelect(selected, note || null);
          }}
          disabled={disabled}
          placeholder="πχ. φεύγω νωρίτερα…"
          rows={2}
          className="mt-2 w-full border-2 border-coo-black/20 focus:border-coo-black
                     bg-coo-paper px-3 py-2 font-dm text-sm resize-none
                     focus:outline-none transition-colors"
        />
      )}
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

interface AvailabilityFormProps {
  userId: string;
  initial: Availability[]; // already fetched for next week
}

export function AvailabilityForm({ userId, initial }: AvailabilityFormProps) {
  const supabase = createClient();
  const days = getNextWeekDays();
  const { from, to, label: weekLabel } = getNextWeekRange();
  const deadline = getDeadline();
  const { label: countdownLabel, expired } = useCountdown(deadline);

  // Map dateStr → saved availability (array)
  const [saved, setSaved] = useState<Record<string, AvailabilityType[]>>(() => {
    const map: Record<string, AvailabilityType[]> = {};
    for (const a of initial) map[a.date] = a.availability;
    return map;
  });
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Debounce refs per day
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleSelect = useCallback(
    (dateStr: string, types: AvailabilityType[], note: string | null) => {
      // Optimistic update
      setSaved((prev) => {
        const copy = { ...prev };
        if (types.length === 0) delete copy[dateStr];
        else copy[dateStr] = types;
        return copy;
      });

      // Debounce 400ms
      if (timers.current[dateStr]) clearTimeout(timers.current[dateStr]);
      timers.current[dateStr] = setTimeout(async () => {
        setSaving((p) => ({ ...p, [dateStr]: true }));
        try {
          if (types.length === 0) {
            await deleteAvailability(supabase, userId, dateStr);
          } else {
            await upsertAvailability(supabase, userId, dateStr, types, note);
            toast.success("✓ Αποθηκεύτηκε", {
              id: `avail-${dateStr}`,
              duration: 1800,
              style: { fontFamily: "'DM Sans', sans-serif" },
            });
          }
        } catch {
          toast.error("Σφάλμα αποθήκευσης");
          setSaved((prev) => {
            const copy = { ...prev };
            delete copy[dateStr];
            return copy;
          });
        } finally {
          setSaving((p) => ({ ...p, [dateStr]: false }));
        }
      }, 400);
    },
    [supabase, userId]
  );

  const totalFilled = Object.keys(saved).filter(
    (d) => d >= from && d <= to && saved[d].length > 0
  ).length;

  return (
    <div>
      {/* Banner */}
      <div
        className="mx-4 mt-4 border-2 border-coo-black bg-coo-yellow p-4"
        style={{ boxShadow: "4px 4px 0 #0A0A0A" }}
      >
        <p className="font-archivo text-base text-coo-black">
          Διαθεσιμότητα {weekLabel}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-1.5 font-dm text-sm text-coo-black/70">
            <Clock size={13} />
            <span className={expired ? "text-coo-red font-semibold" : ""}>
              {countdownLabel}
            </span>
          </div>
          <span className="font-archivo text-xs text-coo-black/60">
            {totalFilled}/7 μέρες
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-coo-black/15 border border-coo-black/20">
          <div
            className="h-full bg-coo-black transition-all duration-300"
            style={{ width: `${(totalFilled / 7) * 100}%` }}
          />
        </div>
      </div>

      {/* Day cards */}
      <div className="flex flex-col gap-4 p-4">
        {days.map((day) => (
          <DayCard
            key={day.dateStr}
            day={day}
            saved={saved[day.dateStr] ?? []}
            isSaving={saving[day.dateStr] ?? false}
            disabled={expired}
            onSelect={(types, note) => handleSelect(day.dateStr, types, note)}
          />
        ))}
      </div>

      {expired && (
        <p className="text-center font-dm text-sm text-coo-black/50 pb-6 px-4">
          Η δήλωση διαθεσιμότητας για αυτή την εβδομάδα έχει κλείσει.
        </p>
      )}
    </div>
  );
}

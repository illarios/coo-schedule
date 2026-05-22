/**
 * Vercel Cron: runs every 15 min (see vercel.json).
 * Morning/split: reminder 1h before start (09:00 → fires ~08:00)
 * Evening: reminder 2h before start (17:00 → fires ~15:00)
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Minutes before shift start to send the reminder
const REMINDER_BEFORE_MIN: Record<string, number> = {
  morning: 60,   // 1 hour before
  evening: 120,  // 2 hours before
  split:   60,   // 1 hour before
};

const SHIFT_START: Record<string, { h: number; m: number }> = {
  morning: { h: 9,  m: 0 },
  evening: { h: 17, m: 0 },
  split:   { h: 9,  m: 0 },
};

const SHIFT_LABELS: Record<string, string> = {
  morning: "ΠΡΩΙ (09:00–17:00)",
  evening: "ΒΡΑΔΥ (17:00–κλείσιμο)",
  split:   "ΣΠΑΣΤΟ",
};

export async function GET(request: Request) {
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const isInternal   = request.headers.get("x-coo-secret") === process.env.COO_INTERNAL_SECRET;
  if (!isVercelCron && !isInternal) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();

  // Fetch today's and tomorrow's assigned shifts (covers all timezones safely)
  const today    = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: shifts, error } = await adminSupabase
    .from("shifts")
    .select("id, date, shift_type, assigned_to")
    .not("assigned_to", "is", null)
    .gte("date", today)
    .lte("date", tomorrow);

  if (error || !shifts?.length) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  let sent = 0;

  for (const shift of shifts) {
    const cfg = SHIFT_START[shift.shift_type];
    const reminderMin = REMINDER_BEFORE_MIN[shift.shift_type];
    if (!cfg || reminderMin === undefined) continue;

    const shiftStart = new Date(shift.date + "T00:00:00");
    shiftStart.setHours(cfg.h, cfg.m, 0, 0);

    const diffMin = (shiftStart.getTime() - now.getTime()) / 60000;

    // Fire within ±7.5 min of the reminder window (cron runs every 15 min)
    const target = reminderMin;
    if (diffMin < target - 7.5 || diffMin > target + 7.5) continue;

    // Dedup — only one reminder per shift
    const { count } = await adminSupabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", shift.assigned_to)
      .eq("related_id", shift.id)
      .eq("type", "reminder");

    if ((count ?? 0) > 0) continue;

    const hoursText = shift.shift_type === "evening" ? "2 ώρες" : "1 ώρα";

    await adminSupabase.from("notifications").insert({
      user_id:    shift.assigned_to,
      type:       "reminder",
      title:      "Υπενθύμιση βάρδιας",
      body:       `Η βάρδιά σου ${SHIFT_LABELS[shift.shift_type] ?? shift.shift_type} ξεκινά σε ${hoursText}.`,
      related_id: shift.id,
    });

    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}

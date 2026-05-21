/**
 * Vercel Cron: runs every 15 min (see vercel.json).
 * Finds shifts starting in ~2 hours and inserts reminder notifications.
 * The DB trigger on notifications then fires the Edge Function to push.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SHIFT_START: Record<string, { h: number; m: number }> = {
  morning: { h: 8,  m: 0 },
  evening: { h: 16, m: 0 },
  split:   { h: 11, m: 0 },
};

const SHIFT_LABELS: Record<string, string> = {
  morning: "ΠΡΩΙ (08:00–15:00)",
  evening: "ΒΡΑΔΥ (16:00–23:00)",
  split:   "ΣΠΑΣΤΟ (11:00–15:00 + 19:00–23:00)",
};

export async function GET(request: Request) {
  // Vercel cron requests include this header in production
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const isInternal   = request.headers.get("x-coo-secret") === process.env.COO_INTERNAL_SECRET;
  if (!isVercelCron && !isInternal) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const from = new Date(now.getTime() + 105 * 60 * 1000); // +1h45m
  const to   = new Date(now.getTime() + 135 * 60 * 1000); // +2h15m

  const { data: shifts, error } = await adminSupabase
    .from("shifts")
    .select("id, date, shift_type, assigned_to")
    .not("assigned_to", "is", null)
    .gte("date", from.toISOString().slice(0, 10))
    .lte("date", to.toISOString().slice(0, 10));

  if (error || !shifts?.length) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  let sent = 0;

  for (const shift of shifts) {
    const cfg = SHIFT_START[shift.shift_type];
    if (!cfg) continue;

    const shiftStart = new Date(shift.date + "T00:00:00");
    shiftStart.setHours(cfg.h, cfg.m, 0, 0);

    const diffMin = (shiftStart.getTime() - now.getTime()) / 60000;
    if (diffMin < 105 || diffMin > 135) continue;

    // Dedup — only one reminder per shift
    const { count } = await adminSupabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", shift.assigned_to)
      .eq("related_id", shift.id)
      .eq("type", "reminder");

    if ((count ?? 0) > 0) continue;

    await adminSupabase.from("notifications").insert({
      user_id:    shift.assigned_to,
      type:       "reminder",
      title:      "Υπενθύμιση βάρδιας",
      body:       "Η βάρδιά σου " + (SHIFT_LABELS[shift.shift_type] ?? shift.shift_type) + " ξεκινά σε 2 ώρες.",
      related_id: shift.id,
    });

    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}

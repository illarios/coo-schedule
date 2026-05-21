/**
 * Supabase Edge Function: shift-reminders
 *
 * Runs every 15 minutes via a Supabase Cron job.
 * Finds shifts that start in [1h 45min, 2h 15min] from now and inserts
 * a reminder notification for the assigned employee (once per shift).
 *
 * ── Deployment ────────────────────────────────────────────────────────────
 * 1. Deploy:   supabase functions deploy shift-reminders
 * 2. Create cron (Supabase Dashboard → Database → Cron jobs):
 *      Name:       shift-reminders
 *      Schedule:   "* /15 * * * *"   (every 15 min, remove the space)
 *      Command:    supabase.functions.invoke('shift-reminders')
 *    OR via SQL:
 *      select cron.schedule(
 *        'shift-reminders',
 *        '* /15 * * * *',   -- remove space
 *        $$
 *          select net.http_post(
 *            url := 'https://cwipzfjqwbbqljwtzkaf.supabase.co/functions/v1/shift-reminders',
 *            headers := '{"Authorization":"Bearer <service_role_key>"}'::jsonb
 *          )
 *        $$
 *      );
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SHIFT_LABELS: Record<string, string> = {
  morning: "ΠΡΩΙ (08:00–15:00)",
  evening: "ΒΡΑΔΥ (16:00–23:00)",
  split:   "ΣΠΑΣΤΟ (11:00–15:00 + 19:00–23:00)",
};

const SHIFT_START: Record<string, string> = {
  morning: "08:00",
  evening: "16:00",
  split:   "11:00",
};

Deno.serve(async () => {
  const now = new Date();

  // Window: shifts starting in 1h45m – 2h15m from now
  const from = new Date(now.getTime() + 105 * 60 * 1000); // +1h45m
  const to   = new Date(now.getTime() + 135 * 60 * 1000); // +2h15m

  const fromDate = from.toISOString().slice(0, 10);
  const toDate   = to.toISOString().slice(0, 10);

  // Fetch shifts that fall in the window and have an assignee
  const { data: shifts, error } = await supabase
    .from("shifts")
    .select("id, date, shift_type, assigned_to, start_time")
    .not("assigned_to", "is", null)
    .gte("date", fromDate)
    .lte("date", toDate);

  if (error || !shifts?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  let sent = 0;

  for (const shift of shifts) {
    // Build the actual shift start datetime
    const startHour = parseInt((SHIFT_START[shift.shift_type] ?? shift.start_time ?? "00:00").split(":")[0], 10);
    const startMin  = parseInt((SHIFT_START[shift.shift_type] ?? shift.start_time ?? "00:00").split(":")[1], 10);
    const shiftStart = new Date(shift.date + "T00:00:00");
    shiftStart.setHours(startHour, startMin, 0, 0);

    const diffMin = (shiftStart.getTime() - now.getTime()) / 60000;
    if (diffMin < 105 || diffMin > 135) continue;

    // Skip if we already sent a reminder for this shift
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", shift.assigned_to)
      .eq("related_id", shift.id)
      .eq("type", "reminder");

    if ((count ?? 0) > 0) continue;

    await supabase.from("notifications").insert({
      user_id:    shift.assigned_to,
      type:       "reminder",
      title:      "Υπενθύμιση βάρδιας",
      body:       "Η βάρδιά σου " + (SHIFT_LABELS[shift.shift_type] ?? shift.shift_type) + " ξεκινά σε 2 ώρες.",
      related_id: shift.id,
    });

    sent++;
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { "Content-Type": "application/json" },
  });
});

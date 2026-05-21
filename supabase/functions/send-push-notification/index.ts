/**
 * Supabase Edge Function: send-push-notification
 *
 * Triggered via a Supabase Database Webhook on INSERT to public.notifications.
 * Reads the new notification row and calls the Next.js API route to send
 * a Web Push message to all subscribed devices of the target user.
 *
 * ── Deployment ────────────────────────────────────────────────────────────
 * 1. Install Supabase CLI:  npm install -g supabase
 * 2. Link project:          supabase link --project-ref cwipzfjqwbbqljwtzkaf
 * 3. Set secrets:
 *      supabase secrets set APP_URL=https://your-app.vercel.app
 *      supabase secrets set COO_INTERNAL_SECRET=<random-strong-secret>
 * 4. Deploy function:       supabase functions deploy send-push-notification
 * 5. Create DB Webhook (Supabase Dashboard → Database → Webhooks):
 *      Name:       notify-on-insert
 *      Table:      public.notifications
 *      Events:     INSERT
 *      HTTP URL:   https://cwipzfjqwbbqljwtzkaf.supabase.co/functions/v1/send-push-notification
 *      HTTP method: POST
 *      Headers:    Authorization: Bearer <service_role_key>
 *
 * ── Local testing ─────────────────────────────────────────────────────────
 *   supabase functions serve send-push-notification --env-file .env.local
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const APP_URL            = Deno.env.get("APP_URL") ?? "";
const COO_INTERNAL_SECRET = Deno.env.get("COO_INTERNAL_SECRET") ?? "";
const SUPABASE_URL        = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Supabase sends the webhook payload as JSON
  let record: Record<string, unknown>;
  try {
    const payload = await req.json();
    // Supabase DB webhook wraps the row in `record`
    record = (payload.record ?? payload) as Record<string, unknown>;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const userId = record.user_id as string | undefined;
  const title  = record.title  as string | undefined;
  const body   = record.body   as string | undefined;
  const type   = record.type   as string | undefined;

  if (!userId || !title || !body) {
    return new Response(JSON.stringify({ ok: true, reason: "missing fields" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Map notification type to a deep-link URL
  const url = resolveUrl(type);

  // Call Next.js push send endpoint
  const response = await fetch(`${APP_URL}/api/notifications/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-coo-secret": COO_INTERNAL_SECRET,
    },
    body: JSON.stringify({ userId, title, body, url }),
  });

  const result = await response.json().catch(() => ({}));

  return new Response(JSON.stringify({ ok: true, push: result }), {
    headers: { "Content-Type": "application/json" },
  });
});

function resolveUrl(type: string | undefined): string {
  switch (type) {
    case "shift_assigned":
    case "shift_changed":
    case "reminder":
      return "/schedule";
    case "swap_request":
    case "swap_approved":
    case "swap_rejected":
      return "/schedule";
    default:
      return "/schedule";
  }
}

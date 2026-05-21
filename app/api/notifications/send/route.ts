/**
 * POST /api/notifications/send
 * Called by Supabase Edge Functions (via service role) to send push notifications
 * to all subscribed devices of a given user.
 *
 * Body: { userId: string; title: string; body: string; url?: string }
 */
import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const vapidPublicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? "";
const vapidEmail      = process.env.VAPID_EMAIL ?? "mailto:admin@coo.internal";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

// Service-role client — bypasses RLS so we can read push_subscriptions
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  // Minimal auth: Edge Functions will pass a shared secret header
  const secret = request.headers.get("x-coo-secret");
  if (secret !== process.env.COO_INTERNAL_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { userId: string; title: string; body: string; url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, title, body: msgBody, url = "/schedule" } = body;
  if (!userId || !title || !msgBody) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ ok: true, sent: 0, reason: "VAPID not configured" });
  }

  // Fetch all subscriptions for the user
  const { data: subs, error } = await adminSupabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subs?.length) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const payload = JSON.stringify({ title, body: msgBody, url, icon: "/icons/icon-192.png" });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  // Remove expired subscriptions (410 Gone)
  const expired = subs.filter((_, i) => {
    const r = results[i];
    return r.status === "rejected" && (r.reason as { statusCode?: number })?.statusCode === 410;
  });
  if (expired.length) {
    await adminSupabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expired.map((s) => s.endpoint));
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ ok: true, sent });
}

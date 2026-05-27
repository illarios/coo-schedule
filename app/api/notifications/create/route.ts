/**
 * POST /api/notifications/create
 * Inserts a notification for any user_id, bypassing RLS via service role.
 * Caller must be an authenticated user (validated via anon key session check).
 */
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  // Verify caller is authenticated
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    user_id: string;
    type: string;
    title: string;
    body: string;
    related_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { user_id, type, title, body: msgBody, related_id } = body;
  if (!user_id || !type || !title || !msgBody) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { error } = await adminSupabase.from("notifications").insert({
    user_id,
    type,
    title,
    body: msgBody,
    related_id: related_id ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

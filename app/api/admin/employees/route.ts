/**
 * POST /api/admin/employees        — create employee
 * PATCH /api/admin/employees       — update (password reset / activate / deactivate)
 * DELETE /api/admin/employees?id=  — delete
 *
 * All endpoints require admin session. Uses service_role key to bypass RLS
 * and call Supabase Auth Admin API.
 */
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function requireAdmin() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return data?.role === "admin" ? user : null;
}

// ── POST: create new employee ────────────────────────────────────────────────
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as {
    nickname: string;
    password: string;
    role?: "employee" | "admin";
    color?: string;
  };

  const { nickname, password, role = "employee", color = "#FFD800" } = body;

  if (!nickname?.trim() || !password || password.length < 6) {
    return NextResponse.json(
      { error: "Απαιτείται όνομα και κωδικός (min 6 χαρακτήρες)" },
      { status: 400 }
    );
  }

  // Generate a stable internal email from the nickname
  const slug = nickname.trim().toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]/g, "");
  const uniqueSuffix = Date.now().toString(36);
  const email = `${slug || "user"}_${uniqueSuffix}@coo.internal`;

  // Create auth user
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nickname: nickname.trim(), role, color },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  // Update profile (trigger handle_new_user already inserted a row)
  const { error: profileError } = await adminSupabase
    .from("profiles")
    .update({
      nickname:  nickname.trim(),
      full_name: nickname.trim(),
      role,
      color,
      active: true,
    })
    .eq("id", authData.user.id);

  if (profileError) {
    // Rollback auth user
    await adminSupabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: authData.user.id });
}

// ── PATCH: update password / role / active ───────────────────────────────────
export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as {
    id: string;
    password?: string;
    role?: "employee" | "admin";
    color?: string;
    active?: boolean;
    nickname?: string;
  };

  const { id, password, role, color, active, nickname } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Auth update (password)
  if (password) {
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Κωδικός min 6 χαρακτήρες" },
        { status: 400 }
      );
    }
    const { error } = await adminSupabase.auth.admin.updateUserById(id, { password });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Profile update
  const profilePatch: Record<string, unknown> = {};
  if (role     !== undefined) profilePatch.role     = role;
  if (color    !== undefined) profilePatch.color    = color;
  if (active   !== undefined) profilePatch.active   = active;
  if (nickname !== undefined) {
    profilePatch.nickname  = nickname.trim();
    profilePatch.full_name = nickname.trim();
  }

  if (Object.keys(profilePatch).length > 0) {
    const { error } = await adminSupabase
      .from("profiles")
      .update(profilePatch)
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ── DELETE: remove employee ──────────────────────────────────────────────────
export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await adminSupabase.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const canSubmit = nickname.trim().length > 0 && password.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError(null);

    try {
      // Step 1: Resolve nickname → email via RPC (anon-callable, SECURITY DEFINER)
      const { data: email, error: rpcError } = await supabase.rpc(
        "get_email_by_nickname",
        { p_nickname: nickname.trim() }
      );

      if (rpcError || !email) {
        setError("Λάθος όνομα ή κωδικός.");
        setLoading(false);
        return;
      }

      // Step 2: Sign in with email + password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email as string,
        password,
      });

      if (signInError) {
        // Use generic message — don't reveal which field is wrong
        setError("Λάθος όνομα ή κωδικός.");
        setLoading(false);
        return;
      }

      // Success — middleware will redirect to /schedule
      router.refresh();
    } catch {
      setError("Κάτι πήγε στραβά. Δοκίμασε ξανά.");
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-between px-6 py-12">

      {/* Logo */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <div className="font-marker text-8xl text-coo-black leading-none select-none">
          COO
        </div>
        <div className="font-archivo text-sm tracking-widest text-coo-black/60 uppercase">
          cafe · bar
        </div>
        <div className="mt-2 w-16 h-1 bg-coo-black" />
      </div>

      {/* Form card */}
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-sm">
        <div
          className="bg-white border-2 border-coo-black p-6"
          style={{ boxShadow: "4px 4px 0 #0A0A0A" }}
        >
          <h1 className="font-archivo text-2xl text-coo-black mb-1">
            Σύνδεση
          </h1>
          <p className="font-dm text-sm text-coo-black/55 mb-6 leading-relaxed">
            Χρησιμοποίησε το όνομά σου και τον κωδικό που σου δώσαμε.
          </p>

          {/* Nickname */}
          <div className="mb-4">
            <label className="font-archivo text-xs tracking-wider text-coo-black block mb-2">
              ΟΝΟΜΑ
            </label>
            <input
              type="text"
              required
              autoComplete="username"
              autoFocus
              autoCapitalize="words"
              placeholder="πχ. Λένιο"
              value={nickname}
              onChange={(e) => { setNickname(e.target.value); setError(null); }}
              onKeyDown={(e) => e.key === "Enter" && passwordRef.current?.focus()}
              disabled={loading}
              className="w-full border-2 border-coo-black px-4 py-3 font-dm text-base bg-coo-paper
                         placeholder:text-coo-black/30
                         focus:outline-none focus:bg-coo-yellow/20
                         disabled:opacity-50
                         transition-colors duration-150"
            />
          </div>

          {/* Password */}
          <div className="mb-2">
            <label className="font-archivo text-xs tracking-wider text-coo-black block mb-2">
              ΚΩΔΙΚΟΣ
            </label>
            <div className="relative">
              <input
                ref={passwordRef}
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                disabled={loading}
                className="w-full border-2 border-coo-black px-4 py-3 pr-12 font-dm text-base bg-coo-paper
                           placeholder:text-coo-black/30
                           focus:outline-none focus:bg-coo-yellow/20
                           disabled:opacity-50
                           transition-colors duration-150"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2
                           text-coo-black/40 hover:text-coo-black transition-colors p-1"
                aria-label={showPassword ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-coo-red/10 border-2 border-coo-red">
              <span className="text-coo-red font-dm text-sm">{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="mt-5 w-full bg-coo-black text-coo-yellow font-archivo text-base py-3 px-6
                       border-2 border-coo-black
                       disabled:opacity-40 disabled:cursor-not-allowed
                       active:shadow-none active:translate-x-[2px] active:translate-y-[2px]
                       transition-all duration-75"
            style={{ boxShadow: !canSubmit || loading ? "none" : "4px 4px 0 #FFD800" }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Σύνδεση…
              </span>
            ) : (
              "Είσοδος →"
            )}
          </button>
        </div>
      </form>

      {/* Footer */}
      <p className="mt-8 font-dm text-xs text-coo-black/50 text-center">
        Πτολεμαΐδα · Περδίκα 4
      </p>
    </div>
  );
}

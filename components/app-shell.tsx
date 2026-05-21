"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { el } from "date-fns/locale";
import { X, BellOff, CheckCheck } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { BottomNav } from "@/components/bottom-nav";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/queries/notifications";
import type { Profile, AppNotification, NotificationType } from "@/lib/types";

interface AppShellProps {
  profile: Profile;
  initialNotifications: AppNotification[];
  children: React.ReactNode;
}

export function AppShell({ profile, initialNotifications, children }: AppShellProps) {
  const supabase = createClient();
  const router = useRouter();

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);

  // ── Realtime: subscribe to new notifications for this user ──────────────
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        async () => {
          const fresh = await getMyNotifications(supabase).catch(() => notifications);
          setNotifications(fresh);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Push permission: ask 3 s after first login (only once) ──────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (window.Notification.permission !== "default") return;

    const asked = sessionStorage.getItem("push-asked");
    if (asked) return;

    const timer = setTimeout(() => {
      sessionStorage.setItem("push-asked", "1");
      requestPushPermission(profile.id);
    }, 3000);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mark one notification as read + navigate ─────────────────────────────
  async function handleNotifTap(n: AppNotification) {
    if (!n.read) {
      await markNotificationRead(supabase, n.id);
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      );
    }
    setNotifOpen(false);
    const target = resolveNotifUrl(n);
    if (target) router.push(target);
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead(supabase);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col min-h-screen bg-coo-paper">
      <Topbar profile={profile} />

      <main className="flex-1 pb-20 overflow-y-auto">
        {children}
      </main>

      <BottomNav
        role={profile.role}
        unreadCount={unread}
        onNotificationsClick={() => setNotifOpen(true)}
      />

      <Modal
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        title="Ειδοποιήσεις"
      >
        <NotificationList
          notifications={notifications}
          onTap={handleNotifTap}
          onMarkAllRead={handleMarkAllRead}
          hasUnread={unread > 0}
        />
      </Modal>

      <InstallBanner />
    </div>
  );
}

// ── Notification list ──────────────────────────────────────────────────────

interface NotificationListProps {
  notifications: AppNotification[];
  onTap: (n: AppNotification) => void;
  onMarkAllRead: () => void;
  hasUnread: boolean;
}

function NotificationList({ notifications, onTap, onMarkAllRead, hasUnread }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <BellOff size={36} className="mx-auto text-coo-black/20 mb-3" />
        <p className="font-dm text-sm text-coo-black/50">Δεν υπάρχουν ειδοποιήσεις</p>
      </div>
    );
  }

  return (
    <div>
      {hasUnread && (
        <div className="flex justify-end mb-3">
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-1.5 font-archivo text-xs text-coo-black/60
                       hover:text-coo-black transition-colors"
          >
            <CheckCheck size={14} />
            Σήμανση όλων ως αναγνωσμένων
          </button>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {notifications.map((n) => (
          <li key={n.id}>
            <button
              onClick={() => onTap(n)}
              className={`w-full text-left flex gap-3 p-3 border-2 transition-colors
                ${n.read
                  ? "bg-white border-coo-black/15 hover:border-coo-black/40"
                  : "bg-coo-yellow/20 border-coo-yellow hover:border-coo-black"
                }`}
            >
              {/* Unread dot */}
              <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                <span className="text-xl leading-none">{typeIcon(n.type)}</span>
                {!n.read && (
                  <div className="w-1.5 h-1.5 rounded-full bg-coo-red" />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p
                  className={`font-archivo text-sm text-coo-black leading-snug ${
                    n.read ? "" : "font-black"
                  }`}
                >
                  {n.title}
                </p>
                <p className="font-dm text-xs text-coo-black/60 mt-0.5 leading-snug">
                  {n.body}
                </p>
                <p className="font-dm text-[10px] text-coo-black/35 mt-1">
                  {formatDistanceToNow(new Date(n.created_at), {
                    addSuffix: true,
                    locale: el,
                  })}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Install banner ─────────────────────────────────────────────────────────

function InstallBanner() {
  const [prompt, setPrompt] = useState<Event & { prompt?: () => Promise<void> } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Only show after a second visit
    const visits = parseInt(localStorage.getItem("coo-visits") ?? "0", 10) + 1;
    localStorage.setItem("coo-visits", String(visits));

    if (visits < 2) return;
    if (localStorage.getItem("coo-install-dismissed")) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as Event & { prompt?: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!prompt || dismissed) return null;

  async function handleInstall() {
    if (prompt && "prompt" in prompt && typeof prompt.prompt === "function") {
      await prompt.prompt();
    }
    setDismissed(true);
  }

  function handleDismiss() {
    localStorage.setItem("coo-install-dismissed", "1");
    setDismissed(true);
  }

  return (
    <div
      className="fixed bottom-[72px] left-1/2 -translate-x-1/2 w-full max-w-phone px-4 z-50
                 pointer-events-none"
    >
      <div
        className="pointer-events-auto bg-white border-2 border-coo-black p-4 flex items-center gap-3"
        style={{ boxShadow: "4px 4px 0 #FFD800" }}
      >
        <img src="/icons/icon-192.png" alt="" className="w-10 h-10 shrink-0 border border-coo-black/20" />
        <div className="flex-1 min-w-0">
          <p className="font-archivo text-sm text-coo-black">Εγκατέστησε το COO</p>
          <p className="font-dm text-xs text-coo-black/55">Πρόγραμμα βαρδιών πάντα διαθέσιμο</p>
        </div>
        <button
          onClick={handleInstall}
          className="font-archivo text-xs px-3 py-2 bg-coo-black text-coo-yellow border-2 border-coo-black shrink-0"
          style={{ boxShadow: "2px 2px 0 #FFD800" }}
        >
          Εγκατάσταση
        </button>
        <button
          onClick={handleDismiss}
          className="text-coo-black/40 hover:text-coo-black transition-colors shrink-0"
          aria-label="Κλείσιμο"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function typeIcon(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    shift_assigned: "📅",
    shift_changed:  "✏️",
    swap_request:   "🔄",
    swap_approved:  "✅",
    swap_rejected:  "❌",
    reminder:       "⏰",
  };
  return map[type] ?? "🔔";
}

function resolveNotifUrl(n: AppNotification): string | null {
  switch (n.type) {
    case "shift_assigned":
    case "shift_changed":
    case "reminder":
      return "/schedule";
    case "swap_request":
      return "/schedule";
    case "swap_approved":
    case "swap_rejected":
      return "/schedule";
    default:
      return null;
  }
}

// ── Push permission + subscription ────────────────────────────────────────

async function requestPushPermission(userId: string) {
  try {
    const permission = await window.Notification.requestPermission();
    if (permission !== "granted") return;

    const reg = await navigator.serviceWorker.ready;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey || vapidKey === "your-vapid-public-key") return;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), userId }),
    });
  } catch {
    // Silent — push is a nice-to-have
  }
}


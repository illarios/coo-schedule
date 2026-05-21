"use client";

import { useState } from "react";
import { Topbar } from "@/components/topbar";
import { BottomNav } from "@/components/bottom-nav";
import { Modal } from "@/components/ui/modal";
import type { Profile, AppNotification, NotificationType } from "@/lib/types";

interface AppShellProps {
  profile: Profile;
  notifications: AppNotification[];
  children: React.ReactNode;
}

export function AppShell({ profile, notifications, children }: AppShellProps) {
  const [notifOpen, setNotifOpen] = useState(false);
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
        <NotificationList notifications={notifications} />
      </Modal>
    </div>
  );
}

function NotificationList({ notifications }: { notifications: AppNotification[] }) {
  if (notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-3xl mb-2">🔔</p>
        <p className="font-dm text-sm text-coo-black/50">Δεν υπάρχουν ειδοποιήσεις</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {notifications.map((n) => (
        <li
          key={n.id}
          className={`flex gap-3 p-3 rounded-lg border-2 ${
            n.read
              ? "bg-white border-coo-black/10"
              : "bg-coo-yellow/20 border-coo-yellow"
          }`}
        >
          <span className="text-xl shrink-0">{typeIcon(n.type)}</span>
          <div className="min-w-0 flex-1">
            <p className="font-archivo text-sm text-coo-black leading-snug">{n.title}</p>
            <p className="font-dm text-xs text-coo-black/60 mt-0.5 leading-snug">{n.body}</p>
          </div>
          {!n.read && (
            <div className="w-2 h-2 rounded-full bg-coo-red shrink-0 mt-1.5" />
          )}
        </li>
      ))}
    </ul>
  );
}

function typeIcon(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    shift_assigned: "📅",
    shift_changed:  "✏️",
    swap_request:   "🔄",
    swap_approved:  "✅",
    reminder:       "⏰",
  };
  return map[type];
}

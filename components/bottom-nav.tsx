"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  employeeOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/schedule",     label: "Πρόγραμμα",    icon: "📅" },
  { href: "/availability", label: "Διαθέσιμος",   icon: "✋" },
  { href: "/swaps",        label: "Αλλαγές",       icon: "🔄", employeeOnly: true },
  { href: "/admin",        label: "Admin",         icon: "👑", adminOnly: true },
];

interface BottomNavProps {
  role: UserRole;
  unreadCount?: number;
  onNotificationsClick?: () => void;
}

export function BottomNav({
  role,
  unreadCount = 0,
  onNotificationsClick,
}: BottomNavProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return role === "admin";
    if (item.employeeOnly) return role !== "admin";
    return true;
  });

  // Notifications is always last
  const totalCols = visibleItems.length + 1;

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-phone
                 bg-coo-black z-40"
      style={{ borderTop: "3px solid #FFD800" }}
    >
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))` }}
      >
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/schedule"
              ? pathname === "/schedule" || pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-3 gap-0.5",
                "transition-colors duration-100",
                isActive
                  ? "bg-coo-yellow"
                  : "hover:bg-white/5 active:bg-white/10"
              )}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span
                className={cn(
                  "font-archivo text-[10px] leading-none",
                  isActive ? "text-coo-black" : "text-coo-yellow/80"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Notifications button */}
        <button
          onClick={onNotificationsClick}
          className={cn(
            "flex flex-col items-center justify-center py-3 gap-0.5",
            "hover:bg-white/5 active:bg-white/10 transition-colors relative"
          )}
        >
          <span className="text-xl leading-none relative">
            🔔
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-2 min-w-[16px] h-4 px-0.5
                           bg-coo-red text-white font-archivo text-[9px]
                           rounded-full flex items-center justify-center
                           border border-coo-black"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
          <span className="font-archivo text-[10px] leading-none text-coo-yellow/80">
            Ειδοπ.
          </span>
        </button>
      </div>
    </nav>
  );
}

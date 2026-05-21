"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AvailabilityForm } from "@/components/availability-form";
import { AvailabilityGrid } from "@/components/availability-grid";
import type { Availability } from "@/lib/types";
import type { AllAvailabilityRow } from "@/lib/queries/availability";

interface Employee {
  id: string;
  nickname: string;
  full_name: string;
  color: string;
}

interface AvailabilityAdminViewProps {
  userId: string;
  myAvailability: Availability[];
  allAvailability: AllAvailabilityRow[];
  employees: Employee[];
  nextWeekDates: string[];
}

export function AvailabilityAdminView({
  userId,
  myAvailability,
  allAvailability,
  employees,
  nextWeekDates,
}: AvailabilityAdminViewProps) {
  const [tab, setTab] = useState<"mine" | "all">("mine");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b-2 border-coo-black bg-white sticky top-[88px] z-20">
        <TabButton
          active={tab === "mine"}
          onClick={() => setTab("mine")}
        >
          Η δήλωσή μου
        </TabButton>
        <TabButton
          active={tab === "all"}
          onClick={() => setTab("all")}
        >
          Όλοι 👥
        </TabButton>
      </div>

      {tab === "mine" ? (
        <AvailabilityForm userId={userId} initial={myAvailability} />
      ) : (
        <AvailabilityGrid
          employees={employees}
          initialRows={allAvailability}
          dates={nextWeekDates}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 py-3 font-archivo text-sm transition-colors duration-100",
        active
          ? "bg-coo-yellow text-coo-black border-b-2 border-coo-black -mb-[2px]"
          : "bg-white text-coo-black/50 hover:text-coo-black"
      )}
    >
      {children}
    </button>
  );
}

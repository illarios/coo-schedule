import { AvailabilityGrid } from "@/components/availability-grid";
import type { AllAvailabilityRow } from "@/lib/queries/availability";

interface Employee {
  id: string;
  nickname: string;
  full_name: string;
  color: string;
}

interface AvailabilityAdminViewProps {
  allAvailability: AllAvailabilityRow[];
  employees: Employee[];
  nextWeekDates: string[];
}

export function AvailabilityAdminView({
  allAvailability,
  employees,
  nextWeekDates,
}: AvailabilityAdminViewProps) {
  return (
    <AvailabilityGrid
      employees={employees}
      initialRows={allAvailability}
      dates={nextWeekDates}
    />
  );
}

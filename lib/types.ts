// ── Enums ──────────────────────────────────────────────────────────────────

export type ShiftType = "morning" | "evening" | "split";
export type ShiftTypeLabel = "ΠΡΩΙ" | "ΒΡΑΔΥ" | "ΣΠΑΣΤΟ";
export type UserRole = "admin" | "employee";
export type SwapStatus = "pending" | "accepted_by_employee" | "approved" | "rejected";
export type AvailabilityType = "morning" | "evening" | "split" | "any" | "off";
export type NotificationType =
  | "shift_assigned"
  | "shift_changed"
  | "swap_request"
  | "swap_approved"
  | "reminder";

// ── Database rows ──────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  nickname: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  color: string;
  active: boolean;
  created_at: string;
}

export interface Shift {
  id: string;
  date: string;               // "2025-05-21"
  shift_type: ShiftType;
  start_time: string;         // "08:00:00"
  end_time: string;
  split_break_start: string | null;
  split_break_end: string | null;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  employee?: Profile;
}

export interface Availability {
  id: string;
  user_id: string;
  date: string;
  availability: AvailabilityType;
  note: string | null;
  created_at: string;
}

export interface ShiftSwap {
  id: string;
  shift_id: string;
  requested_by: string;
  requested_to: string;
  status: SwapStatus;
  message: string | null;
  created_at: string;
  resolved_at: string | null;
  // joined
  shift?: Shift;
  requester?: Profile;
  target?: Profile;
}

// Renamed to avoid conflict with browser's built-in Notification
export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  related_id: string | null;
  created_at: string;
}

// ── View helpers ───────────────────────────────────────────────────────────

export interface WeekDay {
  date: Date;
  dateStr: string;
  label: string;
  isToday: boolean;
}

export interface DaySchedule {
  date: string;
  shifts: Shift[];
  availability: Availability | null;
}

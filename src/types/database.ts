export type TodoStatus = "open" | "pending" | "confirmed" | "rejected" | "missed";
export type RecurrenceType = "daily" | "weekly" | "monthly";
export type ConfirmationAction = "confirmed" | "requested_proof";
export type ShiftRequestStatus = "none" | "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  joined_at: string;
  profile?: Profile;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  invited_email: string;
  invited_by: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  workspace_id: string;
  title: string;
  date: string;
  is_recurring: boolean;
  recurrence_type: RecurrenceType | null;
  recurrence_parent_id: string | null;
  status: TodoStatus;
  penalized: boolean;
  shift_count: number;
  shift_request_date: string | null;
  shift_request_reason: string | null;
  shift_request_status: ShiftRequestStatus;
  shift_auto_approved: boolean;
  suggested_points: number;
  created_at: string;
}

export interface TodoProof {
  id: string;
  todo_id: string;
  file_url: string;
  uploaded_at: string;
}

export interface TodoConfirmation {
  id: string;
  todo_id: string;
  confirmed_by: string;
  action: ConfirmationAction;
  comment: string | null;
  created_at: string;
  confirmer_name?: string;
}

export const POINT_OPTIONS = [1, 3, 5, 7, 9] as const;

export interface PointEntry {
  id: string;
  user_id: string;
  workspace_id: string;
  todo_id: string | null;
  amount: number;
  reason: string;
  created_at: string;
}

export interface Streak {
  user_id: string;
  workspace_id: string;
  current_streak: number;
  last_active_date: string | null;
}

export interface MonthlyGoal {
  id: string;
  user_id: string;
  workspace_id: string;
  month: string;
  target_points: number;
  reward_text: string;
  achieved: boolean;
  created_at: string;
}

export interface WeeklyGoal {
  id: string;
  user_id: string;
  workspace_id: string;
  week_start: string;
  title: string;
  created_at: string;
}

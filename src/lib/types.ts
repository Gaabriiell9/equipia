export type Role = "employee" | "manager" | "hr" | "admin";
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type Category =
  | "paid_leave"
  | "rtt"
  | "sick"
  | "sick_pro"
  | "family"
  | "remote"
  | "unpaid"
  | "recovery"
  | "holiday_comp"
  | "other";

export interface Organization {
  id: string;
  name: string;
  sector: "general" | "hcr";
  timezone: string;
  holiday_region: string;
  holidays_off: boolean;
  cp_counting: "ouvrables" | "ouvres";
  cp_period_start_month: number;
  work_days: number[];
  allow_anticipation: boolean;
  allow_negative_balance: boolean;
  negative_balance_limit: number;
  hr_approval_required: boolean;
  min_notice_days: number;
  fractionnement_enabled: boolean;
  mfa_required: boolean;
  plan: "trial" | "essentiel" | "pro" | "sur_mesure";
  trial_ends_at: string;
  has_demo_data: boolean;
  created_at: string;
}

export interface Member {
  id: string;
  org_id: string;
  user_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  team_id: string | null;
  manager_id: string | null;
  job_title: string | null;
  work_days: number[] | null;
  status: "invited" | "active" | "disabled";
  notify_email: boolean;
  is_demo: boolean;
  invited_at: string | null;
  joined_at: string | null;
}

export interface MemberContract {
  member_id: string;
  contract_type: string;
  hire_date: string | null;
  end_date: string | null;
  weekly_hours: number | null;
  employee_number: string | null;
  hr_notes: string | null;
}

export interface Team {
  id: string;
  org_id: string;
  name: string;
  color: string;
  min_present: number;
}

export interface LeaveReason {
  code: string;
  label: string;
  days: number;
}

export interface LeaveType {
  id: string;
  org_id: string;
  code: string;
  name: string;
  color: string;
  category: Category;
  counting: "ouvrables" | "ouvres" | "calendaires";
  allow_half_days: boolean;
  deducts_balance: boolean;
  accrual_mode: "none" | "monthly" | "annual";
  accrual_amount: number;
  period_kind: "cp" | "civil";
  min_seniority_months: number;
  carryover_max: number | null;
  requires_approval: boolean;
  requires_attachment: boolean;
  counts_as_absence: boolean;
  visible_to_colleagues: boolean;
  reasons: LeaveReason[];
  description: string | null;
  active: boolean;
  position: number;
}

export interface LeaveRequest {
  id: string;
  org_id: string;
  member_id: string;
  leave_type_id: string;
  start_date: string;
  start_half: "full" | "pm";
  end_date: string;
  end_half: "full" | "am";
  days: number;
  status: RequestStatus;
  step: "manager" | "hr" | null;
  reason_code: string | null;
  comment: string | null;
  decision_comment: string | null;
  attachment_path: string | null;
  manager_approved_by: string | null;
  manager_approved_at: string | null;
  decided_by: string | null;
  decided_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface LedgerEntry {
  id: number;
  member_id: string;
  leave_type_id: string;
  period_start: string;
  amount: number;
  kind: string;
  request_id: string | null;
  note: string | null;
  created_at: string;
  created_by: string | null;
}

export interface BalancePeriod {
  period_start: string;
  is_current: boolean;
  acquired: number;
  taken: number;
  other: number;
  balance: number;
}

export interface Balance {
  leave_type_id: string;
  code: string;
  name: string;
  color: string;
  category: Category;
  counting: LeaveType["counting"];
  period_kind: "cp" | "civil";
  available: number;
  pending: number;
  projected: number;
  periods: BalancePeriod[];
}

export interface CalendarRow {
  request_id: string;
  member_id: string;
  start_date: string;
  start_half: "full" | "pm";
  end_date: string;
  end_half: "full" | "am";
  status: "approved" | "pending";
  leave_type_id: string | null;
  label: string;
  color: string;
  masked: boolean;
  counts_as_absence: boolean;
  days: number | null;
}

export interface RequestEvaluation {
  days: number;
  available?: number | null;
  pending?: number | null;
  after?: number | null;
  errors: string[];
  warnings: string[];
  conflicts: { date: string; present: number; min: number; team: string }[];
  holidays: { date: string; name: string }[];
  deducts: boolean;
}

export interface NotifyPayload {
  email: string;
  first_name: string;
  kind: string;
  title: string;
  body: string;
  link: string;
}

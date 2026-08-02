export const ROLES = ["HEAD_COACH", "ASSISTANT", "POSITION_COACH"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  HEAD_COACH: "Head Coach",
  ASSISTANT: "Assistant Coach",
  POSITION_COACH: "Position Coach",
};

export const EVENT_TYPES = [
  "PRACTICE",
  "GAME",
  "SCRIMMAGE",
  "MEETING",
  "WORKOUT",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<string, string> = {
  PRACTICE: "Practice",
  GAME: "Game",
  SCRIMMAGE: "Scrimmage",
  MEETING: "Meeting",
  WORKOUT: "Workout",
};

export const EVENT_TYPE_COLORS: Record<string, string> = {
  PRACTICE: "bg-blue-100 text-blue-800",
  GAME: "bg-red-100 text-red-800",
  SCRIMMAGE: "bg-orange-100 text-orange-800",
  MEETING: "bg-purple-100 text-purple-800",
  WORKOUT: "bg-green-100 text-green-800",
};

export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "LATE",
  "EXCUSED",
  "ABSENT",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_LABELS: Record<string, string> = {
  PRESENT: "Present",
  LATE: "Late",
  EXCUSED: "Excused",
  ABSENT: "Absent",
};

export const TASK_STATUSES = ["OPEN", "IN_PROGRESS", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

export const PLAYER_STATUSES = ["ACTIVE", "INJURED", "ARCHIVED"] as const;

export const PLAYER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INJURED: "Injured",
  ARCHIVED: "Archived",
};

export const POSITIONS = [
  "QB",
  "RB",
  "FB",
  "WR",
  "TE",
  "OT",
  "OG",
  "C",
  "DE",
  "DT",
  "LB",
  "CB",
  "S",
  "K",
  "P",
  "LS",
  "ATH",
] as const;

export const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
] as const;

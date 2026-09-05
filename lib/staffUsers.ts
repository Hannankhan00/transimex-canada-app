import { IUser } from "@/models/User";

export type StaffRole = "Super Admin" | "Dispatcher" | "Customs Agent" | "Support Specialist" | "Auditor";
export type StaffStatus = "Active" | "Pending" | "Revoked";

export const STAFF_ROLES: StaffRole[] = [
  "Super Admin",
  "Dispatcher",
  "Customs Agent",
  "Support Specialist",
  "Auditor",
];

export interface StaffUserView {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  department: string;
  status: StaffStatus;
  lastLogin: string;
  createdAt: string;
}

/** Coarse permission tier stored on User.role, derived from the display title. */
export function staffRoleToPermissionRole(role: string): "superadmin" | "subadmin" | "dispatcher" {
  if (role === "Super Admin") return "superadmin";
  if (role === "Dispatcher") return "dispatcher";
  return "subadmin";
}

/** Best-effort reverse mapping so the UI has a sensible title to preselect. */
function permissionRoleToStaffRole(role?: string): StaffRole {
  if (role === "superadmin" || role === "admin") return "Super Admin";
  if (role === "dispatcher") return "Dispatcher";
  return "Customs Agent";
}

const STATUS_MAP: Record<string, StaffStatus> = {
  active: "Active",
  pending: "Pending",
  revoked: "Revoked",
};

export function toStaffUserView(user: IUser & { _id: any }): StaffUserView {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: (user.jobTitle as StaffRole) || permissionRoleToStaffRole(user.role),
    department: user.department || "",
    status: STATUS_MAP[user.accountStatus || "active"] || "Active",
    lastLogin: user.lastLoginAt
      ? new Date(user.lastLoginAt).toLocaleString("en-CA")
      : "Never (Invited)",
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : "",
  };
}

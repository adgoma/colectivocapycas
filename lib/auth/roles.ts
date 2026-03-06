export const ROLES = {
  SUPERADMIN: "superadmin",
  EDITOR: "editor",
  VIEWER: "viewer"
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ADMIN_ROLES: readonly Role[] = [ROLES.SUPERADMIN, ROLES.EDITOR];

export function canManageContent(roles: readonly string[]): boolean {
  return roles.some((role) => ADMIN_ROLES.includes(role as Role));
}

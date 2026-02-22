import { Types } from "mongoose";
import Role from "@/models/Role";
import "@/models/Permission"; // ensure Permission schema is registered for populate
import type { TenantModels } from "@/lib/tenant-models";

/**
 * Get permissions for a user using tenant-specific models (for multi-tenant use).
 */
export async function getTenantPermissions(
  roles: string[] | Types.ObjectId[],
  models: TenantModels
): Promise<Set<string>> {
  if (!roles || roles.length === 0) return new Set();

  const { Role: TenantRole } = models;
  const populatedRoles = await TenantRole.find({
    _id: { $in: roles },
    isActive: true,
  }).populate<{ permissions: { resource: string; action: string }[] }>(
    "permissions",
    "resource action"
  );

  const perms = new Set<string>();
  for (const role of populatedRoles) {
    for (const p of (role as any).permissions) {
      perms.add(`${p.resource}:${p.action}`);
    }
  }
  return perms;
}

/**
 * Legacy: get permissions using the default mongoose connection.
 * @deprecated Use getTenantPermissions instead.
 */
export async function getUserPermissions(roles: string[] | Types.ObjectId[]): Promise<Set<string>> {
  if (!roles || roles.length === 0) return new Set();

  const populatedRoles = await Role.find({
    _id: { $in: roles },
    isActive: true,
  }).populate<{ permissions: { resource: string; action: string }[] }>(
    "permissions",
    "resource action"
  );

  const perms = new Set<string>();
  for (const role of populatedRoles) {
    for (const p of role.permissions) {
      perms.add(`${p.resource}:${p.action}`);
    }
  }
  return perms;
}

export function checkPermission(userPerms: Set<string>, permission: string): boolean {
  if (userPerms.has("*:*")) return true;
  return userPerms.has(permission);
}


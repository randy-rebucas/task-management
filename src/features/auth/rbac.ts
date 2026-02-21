import { Types } from "mongoose";
import Role from "@/models/Role";
import "@/models/Permission"; // ensure Permission schema is registered for populate

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
  // Wildcard: super-admin with *:* bypasses all checks
  if (userPerms.has("*:*")) return true;
  return userPerms.has(permission);
}


import { Types } from "mongoose";
import Permission from "@/models/Permission";
import Role from "@/models/Role";
import { IPermission } from "@/types";

export async function getUserPermissions(
  roleIds: (string | Types.ObjectId)[]
): Promise<Set<string>> {
  const roles = await Role.find({
    _id: { $in: roleIds },
    isActive: true,
  })
    .populate("permissions")
    .lean();

  // If any role is super-admin, grant all permissions
  if (roles.some((role) => role.slug === "super-admin")) {
    const allPerms = await Permission.find().lean();
    return new Set(allPerms.map((p: any) => `${p.resource}:${p.action}`));
  }

  const permSet = new Set<string>();
  for (const role of roles) {
    for (const perm of role.permissions as unknown as IPermission[]) {
      permSet.add(`${perm.resource}:${perm.action}`);
    }
  }
  return permSet;
}

export function checkPermission(
  userPermissions: Set<string>,
  required: string
): boolean {
  return userPermissions.has(required);
}

export function checkAnyPermission(
  userPermissions: Set<string>,
  required: string[]
): boolean {
  return required.some((p) => userPermissions.has(p));
}

import { Types } from "mongoose";
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

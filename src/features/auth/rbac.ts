import { Types } from "mongoose";
import { PERMISSIONS } from "@/config/permissions";

export function getUserPermissions(roles: string[] | Types.ObjectId[]): Set<string> {
	// Example: aggregate permissions from roles
	// In real app, fetch roles and permissions from DB
	// Here, just return all permissions for demo
	return new Set(PERMISSIONS.map((p) => `${p.resource}:${p.action}`));
}

export function checkPermission(userPerms: Set<string>, permission: string): boolean {
	return userPerms.has(permission);
}
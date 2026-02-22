import { NextRequest } from "next/server";
import ActivityLog from "@/features/users/ActivityLog";
import type { TenantModels } from "@/lib/tenant-models";

export async function logActivity(params: {
	actor: string;
	action: string;
	resource: string;
	resourceId: string;
	details?: Record<string, unknown>;
	req?: NextRequest;
	models?: TenantModels;
}) {
	try {
		const ActivityLogModel = params.models?.ActivityLog ?? ActivityLog;
		await ActivityLogModel.create({
			actor: params.actor,
			action: params.action,
			resource: params.resource,
			resourceId: params.resourceId,
			details: params.details || {},
			ipAddress:
				params.req?.headers.get("x-forwarded-for") ||
				params.req?.headers.get("x-real-ip") ||
				"",
			userAgent: params.req?.headers.get("user-agent") || "",
		});
	} catch (error) {
		console.error("Failed to log activity:", error);
	}
}

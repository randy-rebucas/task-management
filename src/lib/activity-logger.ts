import { NextRequest } from "next/server";
import ActivityLog from "@/models/ActivityLog";

export async function logActivity(params: {
  actor: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: Record<string, unknown>;
  req?: NextRequest;
}) {
  try {
    await ActivityLog.create({
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

import { dbConnect } from "@/lib/db";
import Task from "@/models/Task";
import Lead from "@/models/Lead";
import Client from "@/models/Client";
import User from "@/models/User";
import NotificationRule from "@/models/NotificationRule";
import { deliverNotification } from "@/features/notifications/deliver";
import { INotification } from "@/types";
import type { TenantModels } from "@/lib/tenant-models";

// Maps internal event name → NotificationRule event slug (as configured in Settings UI)
const EVENT_TO_RULE: Record<string, string> = {
  task_assigned:       "task-assigned",
  task_updated:        "task-updated",
  status_changed:      "task-status-changed",
  comment_added:       "task-commented",
  follow_up_reminder:  "follow-up-reminder",
};

const EVENT_TO_TYPE: Record<string, INotification["type"]> = {
  task_assigned:      "task_assigned",
  task_updated:       "task_updated",
  status_changed:     "status_changed",
  comment_added:      "comment_added",
  follow_up_reminder: "system",
};

function buildTitle(event: string, data: Record<string, string>): string {
  switch (event) {
    case "task_assigned":     return `Task assigned: ${data.taskTitle ?? ""}`;
    case "task_updated":      return `Task updated: ${data.taskTitle ?? ""}`;
    case "status_changed":    return `Status changed: ${data.taskTitle ?? ""}`;
    case "comment_added":     return `New comment on: ${data.taskTitle ?? ""}`;
    default:                  return "Notification";
  }
}

function buildMessage(event: string, data: Record<string, string>): string {
  const actor = data.actorName ?? "Someone";
  switch (event) {
    case "task_assigned":
      return `${actor} assigned you to task "${data.taskTitle}".`;
    case "task_updated":
      return `${actor} updated task "${data.taskTitle}".`;
    case "status_changed":
      return `${actor} moved "${data.taskTitle}" from "${data.fromStatus}" to "${data.toStatus}".`;
    case "comment_added":
      return `${actor} commented on task "${data.taskTitle}".`;
    default:
      return "You have a new notification.";
  }
}

type PopulatedUser = { _id: { toString(): string }; email: string; firstName: string };

export async function triggerNotification(
  event: string,
  payload?: Record<string, unknown>,
  tenantModels?: TenantModels
) {
  try {
    if (!tenantModels) {
      await dbConnect();
    }

    const TaskModel          = (tenantModels?.Task          ?? Task) as any;
    const LeadModel          = (tenantModels?.Lead          ?? Lead) as any;
    const ClientModel        = (tenantModels?.Client        ?? Client) as any;
    const UserModel          = (tenantModels?.User          ?? User) as any;
    const NotificationRuleModel = (tenantModels?.NotificationRule ?? NotificationRule) as any;

    const actorId      = payload?.actorId as string | undefined;
    const taskId       = payload?.taskId as string | undefined;
    const resourceType = payload?.resourceType as string | undefined;
    const resourceId   = payload?.resourceId as string | undefined;
    const data         = (payload?.data ?? {}) as Record<string, string>;

    // Resolve notification channels from matching rule (fall back to in_app)
    const ruleEvent = EVENT_TO_RULE[event] ?? event;
    const rule = await (NotificationRuleModel as any).findOne({ event: ruleEvent, isActive: true }).lean() as any;
    const channels = (rule?.channels?.length ? rule.channels : ["in_app"]) as ("in_app" | "email")[];

    // ── Task-based events ──────────────────────────────────────────────────────
    if (taskId) {
      const task = await TaskModel.findById(taskId)
        .populate("assignees", "email firstName lastName")
        .populate("createdBy", "email firstName lastName")
        .lean();
      if (!task) return;

      const assignees = ((task as any).assignees as unknown as PopulatedUser[]) ?? [];
      const creator   = (task as any).createdBy as unknown as PopulatedUser | null;

      let recipientIds: string[];

      if (event === "task_assigned" && payload?.additionalRecipients) {
        recipientIds = (payload.additionalRecipients as string[]).map(String);
      } else if (event === "status_changed" || event === "comment_added") {
        recipientIds = [
          ...assignees.map((a) => a._id.toString()),
          ...(creator ? [creator._id.toString()] : []),
        ];
      } else {
        recipientIds = assignees.map((a) => a._id.toString());
      }

      const uniqueIds = [...new Set(recipientIds)].filter((id) => id !== actorId);
      if (!uniqueIds.length) return;

      const recipients = await UserModel.find({ _id: { $in: uniqueIds }, isActive: true })
        .select("email firstName")
        .lean();

      const type    = EVENT_TO_TYPE[event] ?? "system";
      const title   = buildTitle(event, data);
      const message = buildMessage(event, data);

      for (const user of recipients) {
        await deliverNotification({
          recipient:      (user as any)._id.toString(),
          recipientEmail: (user as any).email,
          type,
          title,
          message,
          relatedTask: taskId,
          channels,
        });
      }
      return;
    }

    // ── CRM follow-up reminder ─────────────────────────────────────────────────
    if (resourceType && resourceId) {
      let assignedUser: PopulatedUser | null = null;

      if (resourceType === "lead") {
        const lead = await LeadModel.findById(resourceId)
          .populate("assignedTo", "email firstName lastName")
          .lean();
        assignedUser = (lead as any)?.assignedTo as unknown as PopulatedUser | null;
      } else if (resourceType === "client") {
        const client = await ClientModel.findById(resourceId)
          .populate("assignedTo", "email firstName lastName")
          .lean();
        assignedUser = (client as any)?.assignedTo as unknown as PopulatedUser | null;
      }

      if (!assignedUser || assignedUser._id.toString() === actorId) return;

      const dateStr = data.followUpDate
        ? new Date(data.followUpDate).toLocaleDateString()
        : "";

      await deliverNotification({
        recipient:      assignedUser._id.toString(),
        recipientEmail: assignedUser.email,
        type:    "system",
        title:   `Follow-up scheduled: ${data.name ?? ""}`,
        message: `A follow-up for "${data.name}" has been set for ${dateStr}.`,
        channels,
      });
    }
  } catch (err) {
    console.error("[triggerNotification] Error:", err);
  }
}

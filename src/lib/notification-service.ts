import Notification from "@/models/Notification";
import NotificationRule from "@/models/NotificationRule";
import Task from "@/models/Task";
import User from "@/models/User";
import { sendEmail } from "@/lib/email";

interface NotificationContext {
  taskId?: string;
  actorId: string;
  additionalRecipients?: string[];
  data?: Record<string, unknown>;
}

async function resolveRecipients(
  rule: { recipientStrategy: string; recipientRoles?: { _id: unknown }[] },
  context: NotificationContext
): Promise<string[]> {
  const recipients = new Set<string>();

  if (context.additionalRecipients) {
    context.additionalRecipients.forEach((r) => recipients.add(r));
  }

  if (context.taskId) {
    const task = await Task.findById(context.taskId).lean();
    if (!task) return Array.from(recipients);

    switch (rule.recipientStrategy) {
      case "assignees":
        task.assignees.forEach((a) => recipients.add(a.toString()));
        break;
      case "creator":
        recipients.add(task.createdBy.toString());
        break;
      case "department_head":
        if (task.department) {
          const { default: Department } = await import("@/models/Department");
          const dept = await Department.findById(task.department).lean();
          if (dept?.head) recipients.add(dept.head.toString());
        }
        break;
      case "specific_roles":
        if (rule.recipientRoles?.length) {
          const roleIds = rule.recipientRoles.map((r) => r._id);
          const users = await User.find({
            roles: { $in: roleIds },
            isActive: true,
          }).lean();
          users.forEach((u) => recipients.add(u._id.toString()));
        }
        break;
    }
  }

  // Remove the actor from notifications (don't notify yourself)
  recipients.delete(context.actorId);
  return Array.from(recipients);
}

function buildTitle(event: string, data?: Record<string, unknown>): string {
  const taskTitle = (data?.taskTitle as string) || "a task";
  const titles: Record<string, string> = {
    task_assigned: `You were assigned to "${taskTitle}"`,
    task_updated: `Task "${taskTitle}" was updated`,
    status_changed: `Status changed on "${taskTitle}"`,
    comment_added: `New comment on "${taskTitle}"`,
    deadline_approaching: `Deadline approaching for "${taskTitle}"`,
    task_overdue: `Task "${taskTitle}" is overdue`,
    approval_needed: `Approval needed for "${taskTitle}"`,
    approval_resolved: `Approval resolved for "${taskTitle}"`,
  };
  return titles[event] || `Notification: ${event}`;
}

function buildMessage(event: string, data?: Record<string, unknown>): string {
  const actorName = (data?.actorName as string) || "Someone";
  const messages: Record<string, string> = {
    task_assigned: `${actorName} assigned you to this task.`,
    task_updated: `${actorName} updated this task.`,
    status_changed: `Status changed from "${data?.fromStatus || ""}" to "${data?.toStatus || ""}".`,
    comment_added: `${actorName} added a comment.`,
    deadline_approaching: `This task is due soon.`,
    task_overdue: `This task has passed its due date.`,
    approval_needed: `${actorName} requested approval.`,
    approval_resolved: `The approval has been resolved.`,
  };
  return messages[event] || `Action: ${event}`;
}

export async function triggerNotification(
  event: string,
  context: NotificationContext
) {
  try {
    const rules = await NotificationRule.find({
      event,
      isActive: true,
    })
      .populate("recipientRoles")
      .lean();

    if (rules.length === 0) return;

    for (const rule of rules) {
      const recipients = await resolveRecipients(
        rule as unknown as { recipientStrategy: string; recipientRoles?: { _id: unknown }[] },
        context
      );

      if (recipients.length === 0) continue;

      const title = buildTitle(event, context.data);
      const message = buildMessage(event, context.data);

      if (rule.channels.includes("in_app")) {
        const notifications = recipients.map((recipientId) => ({
          recipient: recipientId,
          type: event,
          title,
          message,
          relatedTask: context.taskId,
          relatedUser: context.actorId,
        }));
        await Notification.insertMany(notifications);
      }

      if (rule.channels.includes("email")) {
        for (const recipientId of recipients) {
          const user = await User.findById(recipientId).lean();
          if (user?.email) {
            await sendEmail({
              to: user.email,
              subject: title,
              text: message,
            }).catch((err) =>
              console.error("Failed to send email notification:", err)
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("Failed to trigger notification:", error);
  }
}

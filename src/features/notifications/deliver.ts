import { dbConnect } from "@/lib/db";
import Notification from "@/models/Notification";
import { sendEmail } from "@/lib/email";
import { INotification } from "@/types";

export async function deliverNotification(params: {
  recipient: string;
  recipientEmail: string;
  type: INotification["type"];
  title: string;
  message: string;
  relatedTask?: string;
  channels: ("in_app" | "email")[];
}): Promise<void> {
  await dbConnect();

  let notifId: string | null = null;

  if (params.channels.includes("in_app")) {
    try {
      const notif = await Notification.create({
        recipient: params.recipient,
        type: params.type,
        title: params.title,
        message: params.message,
        ...(params.relatedTask ? { relatedTask: params.relatedTask } : {}),
      });
      notifId = String(notif._id);
    } catch (err) {
      console.error("[deliverNotification] Failed to create in-app notification:", err);
    }
  }

  if (params.channels.includes("email")) {
    try {
      await sendEmail({
        to: params.recipientEmail,
        subject: params.title,
        text: params.message,
        html: `<p>${params.message.replace(/\n/g, "<br/>")}</p>`,
      });
      if (notifId) {
        await Notification.findByIdAndUpdate(notifId, {
          emailSent: true,
          emailSentAt: new Date(),
        });
      }
    } catch (err) {
      console.error("[deliverNotification] Failed to send email notification:", err);
    }
  }
}

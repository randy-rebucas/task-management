import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { createCrmAttachmentSchema } from "@/features/auth/validators";
import CrmAttachment from "@/models/CrmAttachment";

export const GET = withPermission("crm:view", async (_req, ctx) => {
  const { clientId } = await ctx.params;
  const attachments = await CrmAttachment.find({ client: clientId })
    .sort({ createdAt: -1 })
    .populate("uploadedBy", "firstName lastName email avatar");
  return apiSuccess(attachments);
});

export const POST = withPermission("crm:update", async (req, ctx, session) => {
  const { clientId } = await ctx.params;
  const body = await req.json();
  const parsed = createCrmAttachmentSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const attachment = await CrmAttachment.create({
    ...parsed.data,
    client: clientId,
    uploadedBy: session.user.id,
  });
  const populated = await attachment.populate("uploadedBy", "firstName lastName email avatar");
  return apiSuccess(populated, 201);
});

export const DELETE = withPermission("crm:update", async (req, ctx) => {
  const { clientId } = await ctx.params;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return apiError("Attachment ID is required", 400);

  const attachment = await CrmAttachment.findOneAndDelete({ _id: id, client: clientId });
  if (!attachment) return apiError("Attachment not found", 404);
  return apiSuccess({ message: "Attachment deleted" });
});

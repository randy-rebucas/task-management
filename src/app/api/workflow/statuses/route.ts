import { withPermission, withAuth, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { createWorkflowStatusSchema } from "@/features/auth/validators";
export const GET = withAuth(async (_req, _ctx, _session, models) => {
  const statuses = await models.WorkflowStatus.find({ isActive: true })
    .sort({ order: 1 })
    .lean();
  return apiSuccess(statuses);
});

export const POST = withPermission("workflow:configure", async (req, _ctx, _session, models) => {
  const body = await req.json();
  const parsed = createWorkflowStatusSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  if (parsed.data.isDefault) {
    await models.WorkflowStatus.updateMany({}, { isDefault: false });
  }

  const status = await models.WorkflowStatus.create(parsed.data);
  return apiSuccess(status, 201);
});

export const PUT = withPermission("workflow:configure", async (req, _ctx, _session, models) => {
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return apiError("Status ID required");

  if (data.isDefault) {
    await models.WorkflowStatus.updateMany({ _id: { $ne: id } }, { isDefault: false });
  }

  const status = await models.WorkflowStatus.findByIdAndUpdate(id, data, { new: true });
  if (!status) return apiError("Status not found", 404);
  return apiSuccess(status);
});

export const DELETE = withPermission("workflow:configure", async (req, _ctx, _session, models) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return apiError("Status ID required");

  await models.WorkflowStatus.findByIdAndUpdate(id, { isActive: false });
  return apiSuccess({ message: "Status deactivated" });
});

import { withPermission, withAuth, apiSuccess, apiError } from "@/lib/api-helpers";
import { createWorkflowStatusSchema } from "@/lib/validators";
import WorkflowStatus from "@/models/WorkflowStatus";

export const GET = withAuth(async () => {
  const statuses = await WorkflowStatus.find({ isActive: true })
    .sort({ order: 1 })
    .lean();
  return apiSuccess(statuses);
});

export const POST = withPermission("workflow:configure", async (req) => {
  const body = await req.json();
  const parsed = createWorkflowStatusSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  if (parsed.data.isDefault) {
    await WorkflowStatus.updateMany({}, { isDefault: false });
  }

  const status = await WorkflowStatus.create(parsed.data);
  return apiSuccess(status, 201);
});

export const PUT = withPermission("workflow:configure", async (req) => {
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return apiError("Status ID required");

  if (data.isDefault) {
    await WorkflowStatus.updateMany({ _id: { $ne: id } }, { isDefault: false });
  }

  const status = await WorkflowStatus.findByIdAndUpdate(id, data, { new: true });
  if (!status) return apiError("Status not found", 404);
  return apiSuccess(status);
});

export const DELETE = withPermission("workflow:configure", async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return apiError("Status ID required");

  await WorkflowStatus.findByIdAndUpdate(id, { isActive: false });
  return apiSuccess({ message: "Status deactivated" });
});

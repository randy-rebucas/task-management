import { withPermission, apiSuccess, apiError } from "@/lib/api-helpers";
import { createTransitionSchema } from "@/lib/validators";
import WorkflowTransition from "@/models/WorkflowTransition";

export const GET = withPermission("workflow:configure", async () => {
  const transitions = await WorkflowTransition.find({ isActive: true })
    .populate("fromStatus", "name slug color")
    .populate("toStatus", "name slug color")
    .populate("allowedRoles", "name slug")
    .populate("approverRoles", "name slug")
    .lean();

  return apiSuccess(transitions);
});

export const POST = withPermission("workflow:configure", async (req) => {
  const body = await req.json();
  const parsed = createTransitionSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const existing = await WorkflowTransition.findOne({
    fromStatus: parsed.data.fromStatus,
    toStatus: parsed.data.toStatus,
  });
  if (existing) return apiError("This transition already exists", 409);

  const transition = await WorkflowTransition.create(parsed.data);
  return apiSuccess(transition, 201);
});

export const PUT = withPermission("workflow:configure", async (req) => {
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return apiError("Transition ID required");

  const transition = await WorkflowTransition.findByIdAndUpdate(id, data, { new: true });
  if (!transition) return apiError("Transition not found", 404);
  return apiSuccess(transition);
});

export const DELETE = withPermission("workflow:configure", async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return apiError("Transition ID required");

  await WorkflowTransition.findByIdAndUpdate(id, { isActive: false });
  return apiSuccess({ message: "Transition deactivated" });
});

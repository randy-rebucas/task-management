import { withPermission, apiSuccess, apiError } from "@/lib/api-helpers";
import { createDependencySchema } from "@/lib/validators";
import TaskDependency from "@/models/TaskDependency";

export const GET = withPermission("tasks:view", async (req, ctx) => {
  const { taskId } = await ctx.params;
  const deps = await TaskDependency.find({ task: taskId })
    .populate("dependsOn", "taskNumber title status")
    .lean();

  return apiSuccess(deps);
});

export const POST = withPermission("tasks:update", async (req, ctx, session) => {
  const { taskId } = await ctx.params;
  const body = await req.json();
  const parsed = createDependencySchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  if (parsed.data.dependsOn === taskId) {
    return apiError("A task cannot depend on itself");
  }

  const existing = await TaskDependency.findOne({
    task: taskId,
    dependsOn: parsed.data.dependsOn,
  });
  if (existing) return apiError("Dependency already exists", 409);

  const dep = await TaskDependency.create({
    task: taskId,
    dependsOn: parsed.data.dependsOn,
    type: parsed.data.type,
  });

  return apiSuccess(dep, 201);
});

export const DELETE = withPermission("tasks:update", async (req, ctx) => {
  const { taskId } = await ctx.params;
  const url = new URL(req.url);
  const dependencyId = url.searchParams.get("id");

  if (!dependencyId) return apiError("Dependency ID required");

  await TaskDependency.findOneAndDelete({ _id: dependencyId, task: taskId });
  return apiSuccess({ message: "Dependency removed" });
});

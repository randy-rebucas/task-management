import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { createDependencySchema } from "@/features/auth/validators";

/** DFS cycle detection: returns true if adding task→newDep would create a cycle. */
async function wouldCreateCycle(
  models: any,
  fromTaskId: string,
  toTaskId: string
): Promise<boolean> {
  const visited = new Set<string>();
  const stack = [toTaskId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === fromTaskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const children = await models.TaskDependency.find({ task: current })
      .select("dependsOn")
      .lean() as { dependsOn: any }[];
    for (const c of children) stack.push(c.dependsOn.toString());
  }
  return false;
}

export const GET = withPermission("tasks:view", async (req, ctx, _session, models) => {
  const { taskId } = await ctx.params;
  const deps = await models.TaskDependency.find({ task: taskId })
    .populate("dependsOn", "taskNumber title status")
    .lean();

  return apiSuccess(deps);
});

export const POST = withPermission("tasks:update", async (req, ctx, session, models) => {
  const { taskId } = await ctx.params;
  const body = await req.json();
  const parsed = createDependencySchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  if (parsed.data.dependsOn === taskId) {
    return apiError("A task cannot depend on itself");
  }

  const existing = await models.TaskDependency.findOne({
    task: taskId,
    dependsOn: parsed.data.dependsOn,
  });
  if (existing) return apiError("Dependency already exists", 409);

  // Detect circular dependencies via DFS before persisting
  const cycle = await wouldCreateCycle(models, taskId, parsed.data.dependsOn);
  if (cycle) return apiError("Adding this dependency would create a circular reference", 409);

  const dep = await models.TaskDependency.create({
    task: taskId,
    dependsOn: parsed.data.dependsOn,
    type: parsed.data.type,
  });

  return apiSuccess(dep, 201);
});

export const DELETE = withPermission("tasks:update", async (req, ctx, _session, models) => {
  const { taskId } = await ctx.params;
  const url = new URL(req.url);
  const dependencyId = url.searchParams.get("id");

  if (!dependencyId) return apiError("Dependency ID required");

  await models.TaskDependency.findOneAndDelete({ _id: dependencyId, task: taskId });
  return apiSuccess({ message: "Dependency removed" });
});

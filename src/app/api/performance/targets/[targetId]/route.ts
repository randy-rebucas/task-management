import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { updatePerformanceTargetSchema } from "@/features/auth/validators";
export const PUT = withPermission("performance:manage", async (req, ctx, _session, models) => {
  const { targetId } = await ctx.params;
  const body = await req.json();
  const parsed = updatePerformanceTargetSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const target = await models.PerformanceTarget.findByIdAndUpdate(targetId, parsed.data, { new: true });
  if (!target) return apiError("Target not found", 404);
  return apiSuccess(target);
});

export const DELETE = withPermission("performance:manage", async (_req, ctx, _session, models) => {
  const { targetId } = await ctx.params;
  const target = await models.PerformanceTarget.findByIdAndDelete(targetId);
  if (!target) return apiError("Target not found", 404);
  return apiSuccess({ message: "Target deleted" });
});

import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { updateCommissionRuleSchema } from "@/features/auth/validators";
export const PUT = withPermission("performance:manage", async (req, ctx, _session, models) => {
  const { ruleId } = await ctx.params;
  const body = await req.json();
  const parsed = updateCommissionRuleSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const rule = await models.CommissionRule.findByIdAndUpdate(ruleId, parsed.data, { new: true });
  if (!rule) return apiError("Commission rule not found", 404);
  return apiSuccess(rule);
});

export const DELETE = withPermission("performance:manage", async (_req, ctx, _session, models) => {
  const { ruleId } = await ctx.params;
  const rule = await models.CommissionRule.findByIdAndDelete(ruleId);
  if (!rule) return apiError("Commission rule not found", 404);
  return apiSuccess({ message: "Rule deleted" });
});

import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { createCommissionRuleSchema } from "@/features/auth/validators";
export const GET = withPermission("performance:manage", async () => {
  const rules = await models.CommissionRule.find()
    .sort({ createdAt: -1 })
    .populate("department", "name")
    .populate("createdBy", "firstName lastName");
  return apiSuccess(rules);
});

export const POST = withPermission("performance:manage", async (req, _ctx, session) => {
  const body = await req.json();
  const parsed = createCommissionRuleSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const rule = await models.CommissionRule.create({
    ...parsed.data,
    createdBy: session.user.id,
  });
  return apiSuccess(rule, 201);
});

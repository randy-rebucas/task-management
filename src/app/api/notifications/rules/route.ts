import { withPermission, apiSuccess, apiError } from "@/lib/api-helpers";
import { createNotificationRuleSchema } from "@/lib/validators";
import NotificationRule from "@/models/NotificationRule";

export const GET = withPermission("notifications:manage_rules", async () => {
  const rules = await NotificationRule.find()
    .populate("recipientRoles", "name slug")
    .sort({ event: 1 })
    .lean();
  return apiSuccess(rules);
});

export const POST = withPermission("notifications:manage_rules", async (req) => {
  const body = await req.json();
  const parsed = createNotificationRuleSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const rule = await NotificationRule.create(parsed.data);
  return apiSuccess(rule, 201);
});

export const PUT = withPermission("notifications:manage_rules", async (req) => {
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return apiError("Rule ID required");

  const rule = await NotificationRule.findByIdAndUpdate(id, data, { new: true });
  if (!rule) return apiError("Rule not found", 404);
  return apiSuccess(rule);
});

export const DELETE = withPermission("notifications:manage_rules", async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return apiError("Rule ID required");

  await NotificationRule.findByIdAndDelete(id);
  return apiSuccess({ message: "Rule deleted" });
});

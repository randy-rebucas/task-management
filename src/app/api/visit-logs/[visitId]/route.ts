import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { getTenantPermissions } from "@/features/auth/rbac";

export const GET = withPermission("visit_logs:view", async (req, ctx, session, models) => {
  const { visitId } = await ctx.params;
  const perms = await getTenantPermissions(session.user.roles, models);
  const canViewAll = perms.has("visit_logs:view_all");

  const filter: Record<string, unknown> = { _id: visitId };
  if (!canViewAll) filter.user = session.user.id;

  const visitLog = await models.VisitLog.findOne(filter).lean();
  if (!visitLog) return apiError("Visit log not found", 404);
  return apiSuccess({ data: visitLog });
});

export const DELETE = withPermission("visit_logs:delete", async (_req, ctx, _session, models) => {
  const { visitId } = await ctx.params;
  const visitLog = await models.VisitLog.findByIdAndDelete(visitId);
  if (!visitLog) return apiError("Visit log not found", 404);
  return apiSuccess({ ok: true });
});

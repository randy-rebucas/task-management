import { withAuth, apiSuccess, apiError } from "@/features/auth/api-helpers";
import VisitLog from "@/models/VisitLog";

export const GET = withAuth(async (req, ctx, session) => {
  const { visitId } = await ctx.params;
  const visitLog = await VisitLog.findOne({ _id: visitId, user: session.user.id }).lean();
  if (!visitLog) return apiError("Visit log not found", 404);
  return apiSuccess({ data: visitLog });
});

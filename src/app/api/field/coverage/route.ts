import { withPermission, apiSuccess } from "@/features/auth/api-helpers";
import type { IFieldSession } from "@/types";
// GET /api/field/coverage - all check-in locations for heatmap
export const GET = withPermission("visit_logs:view_all", async (req, _ctx, _session, models) => {
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") || "30", 10);

  const since = new Date();
  since.setDate(since.getDate() - Math.min(days, 90));

  const sessions = await models.FieldSession.find({
    date: { $gte: since },
  })
    .populate("user", "firstName lastName")
    .select("checkIn.location checkIn.time user date status")
    .lean() as unknown as IFieldSession[];

  const points = sessions.map((s) => ({
    lat: s.checkIn.location.lat,
    lng: s.checkIn.location.lng,
    user: s.user,
    date: s.date,
    time: s.checkIn.time,
    status: s.status,
  }));

  return apiSuccess({ points, total: points.length });
});

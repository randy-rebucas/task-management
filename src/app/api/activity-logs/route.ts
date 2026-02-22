import { withPermission, apiSuccess, getPaginationParams } from "@/features/auth/api-helpers";
export const GET = withPermission("activity_logs:view", async (req, _ctx, _session, models) => {
  const url = new URL(req.url);
  const { page, limit, skip } = getPaginationParams(url);
  const resource = url.searchParams.get("resource");
  const resourceId = url.searchParams.get("resourceId");
  const actor = url.searchParams.get("actor");
  const action = url.searchParams.get("action");

  const filter: Record<string, unknown> = {};
  if (resource) filter.resource = resource;
  if (resourceId) filter.resourceId = resourceId;
  if (actor) filter.actor = actor;
  if (action) filter.action = { $regex: action, $options: "i" };

  const [data, total] = await Promise.all([
    models.ActivityLog.find(filter)
      .populate("actor", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    models.ActivityLog.countDocuments(filter),
  ]);

  return apiSuccess({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

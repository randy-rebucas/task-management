import { withPermission, apiSuccess, getPaginationParams } from "@/lib/api-helpers";
import ActivityLog from "@/models/ActivityLog";

export const GET = withPermission("activity_logs:view", async (req) => {
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
    ActivityLog.find(filter)
      .populate("actor", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);

  return apiSuccess({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

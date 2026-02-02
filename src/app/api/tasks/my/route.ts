import { withAuth, apiSuccess, getPaginationParams } from "@/lib/api-helpers";
import Task from "@/models/Task";

export const GET = withAuth(async (req, ctx, session) => {
  const url = new URL(req.url);
  const { page, limit, skip } = getPaginationParams(url);
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");

  const filter: Record<string, unknown> = {
    assignees: session.user.id,
    isArchived: false,
  };

  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const [data, total] = await Promise.all([
    Task.find(filter)
      .populate("status", "name slug color")
      .populate("assignees", "firstName lastName email avatar")
      .populate("createdBy", "firstName lastName email")
      .sort({ dueDate: 1, priority: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Task.countDocuments(filter),
  ]);

  return apiSuccess({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

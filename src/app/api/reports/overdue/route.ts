import { withPermission, apiSuccess, getPaginationParams } from "@/lib/api-helpers";
import Task from "@/models/Task";

export const GET = withPermission("reports:view", async (req) => {
  const url = new URL(req.url);
  const { page, limit, skip } = getPaginationParams(url);
  const department = url.searchParams.get("department");

  const filter: Record<string, unknown> = {
    dueDate: { $lt: new Date() },
    completedAt: null,
    isArchived: false,
  };
  if (department) filter.department = department;

  const [data, total] = await Promise.all([
    Task.find(filter)
      .populate("status", "name slug color")
      .populate("assignees", "firstName lastName email")
      .populate("department", "name code")
      .sort({ dueDate: 1 })
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

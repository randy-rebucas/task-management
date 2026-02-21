import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { createPerformanceTargetSchema } from "@/features/auth/validators";
import PerformanceTarget from "@/models/PerformanceTarget";

export const GET = withPermission("performance:view", async (req) => {
  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  const year = url.searchParams.get("year");
  const userId = url.searchParams.get("userId");

  const filter: Record<string, unknown> = {};
  if (month) filter.month = parseInt(month);
  if (year) filter.year = parseInt(year);
  if (userId) filter.user = userId;

  const targets = await PerformanceTarget.find(filter)
    .sort({ year: -1, month: -1 })
    .populate("user", "firstName lastName email avatar");
  return apiSuccess(targets);
});

export const POST = withPermission("performance:manage", async (req, _ctx, session) => {
  const body = await req.json();
  const parsed = createPerformanceTargetSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const { user, month, year, ...rest } = parsed.data;
  const target = await PerformanceTarget.findOneAndUpdate(
    { user, month, year },
    { ...rest, createdBy: session.user.id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return apiSuccess(target, 201);
});

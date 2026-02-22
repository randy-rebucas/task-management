import { withAuth, apiSuccess, apiError, getPaginationParams } from "@/features/auth/api-helpers";
import { getTenantPermissions } from "@/features/auth/rbac";
// GET /api/field/sessions - list sessions (own or all for managers)
export const GET = withAuth(async (req, ctx, session, models) => {
  const url = new URL(req.url);
  const { page, limit, skip } = getPaginationParams(url);

  const perms = await getTenantPermissions(session.user.roles, models);
  const canViewAll = perms.has("visit_logs:view_all");
  const userId = url.searchParams.get("userId");
  const dateStr = url.searchParams.get("date");
  const status = url.searchParams.get("status");

  const filter: Record<string, unknown> = {};

  if (canViewAll && userId) {
    filter.user = userId;
  } else if (!canViewAll) {
    filter.user = session.user.id;
  }

  if (dateStr) {
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);
    filter.date = { $gte: start, $lte: end };
  }

  if (status) filter.status = status;

  const [data, total] = await Promise.all([
    models.FieldSession.find(filter)
      .populate("user", "firstName lastName email")
      .populate("task", "taskNumber title")
      .sort({ "checkIn.time": -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    models.FieldSession.countDocuments(filter),
  ]);

  return apiSuccess({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
});

// POST /api/field/sessions - check-in
export const POST = withAuth(async (req, ctx, session, models) => {
  const body = await req.json();
  const { lat, lng, address, photo, notes, taskId } = body;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return apiError("GPS coordinates (lat, lng) are required", 400);
  }

  // Prevent duplicate active session
  const existing = await models.FieldSession.findOne({
    user: session.user.id,
    status: "active",
  });
  if (existing) {
    return apiError("You already have an active check-in session. Please check out first.", 409);
  }

  const now = new Date();
  const dateOnly = new Date(now);
  dateOnly.setHours(0, 0, 0, 0);

  const fieldSession = await models.FieldSession.create({
    user: session.user.id,
    task: taskId || undefined,
    date: dateOnly,
    checkIn: {
      time: now,
      location: { lat, lng },
      address: address || undefined,
      photo: photo || undefined,
    },
    routePoints: [{ lat, lng, timestamp: now }],
    notes: notes || undefined,
    status: "active",
  });

  return apiSuccess(fieldSession, 201);
});

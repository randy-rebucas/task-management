import { withAuth, apiSuccess, apiError } from "@/features/auth/api-helpers";
import FieldSession from "@/models/FieldSession";

export const GET = withAuth(async (req, ctx, session) => {
  const { sessionId } = await ctx.params;
  const canViewAll = session.user.permissions?.includes("visit_logs:view_all");

  const filter: Record<string, unknown> = { _id: sessionId };
  if (!canViewAll) filter.user = session.user.id;

  const fieldSession = await FieldSession.findOne(filter)
    .populate("user", "firstName lastName email")
    .populate("task", "taskNumber title")
    .lean();

  if (!fieldSession) return apiError("Session not found", 404);
  return apiSuccess(fieldSession);
});

export const PATCH = withAuth(async (req, ctx, session) => {
  const { sessionId } = await ctx.params;
  const body = await req.json();
  const { action, lat, lng, photo, notes } = body;

  const fieldSession = await FieldSession.findOne({
    _id: sessionId,
    user: session.user.id,
  });
  if (!fieldSession) return apiError("Session not found", 404);

  if (action === "checkout") {
    if (fieldSession.status === "completed") {
      return apiError("Session already checked out", 400);
    }
    if (typeof lat !== "number" || typeof lng !== "number") {
      return apiError("GPS coordinates required for check-out", 400);
    }

    const now = new Date();
    const durationMs = now.getTime() - fieldSession.checkIn.time.getTime();
    const durationMins = Math.round(durationMs / 60000);

    fieldSession.checkOut = {
      time: now,
      location: { lat, lng },
      photo: photo || undefined,
    };
    fieldSession.duration = durationMins;
    fieldSession.status = "completed";
    fieldSession.routePoints.push({ lat, lng, timestamp: now });
    if (notes) fieldSession.notes = notes;

    await fieldSession.save();
    return apiSuccess(fieldSession);
  }

  if (action === "route_point") {
    if (typeof lat !== "number" || typeof lng !== "number") {
      return apiError("GPS coordinates required", 400);
    }
    fieldSession.routePoints.push({ lat, lng, timestamp: new Date() });
    await fieldSession.save();
    return apiSuccess({ added: true });
  }

  return apiError("Invalid action. Use 'checkout' or 'route_point'.", 400);
});

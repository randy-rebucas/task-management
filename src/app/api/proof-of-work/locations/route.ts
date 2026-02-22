import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { createPartnerLocationSchema } from "@/features/auth/validators";
export const GET = withPermission("proof_of_work:view", async (_req, _ctx, _session, models) => {
  const locations = await models.PartnerLocation.find({ isActive: true }).sort({ name: 1 }).lean();
  return apiSuccess(locations);
});

export const POST = withPermission("proof_of_work:manage", async (req, _ctx, session, models) => {
  const body = await req.json();
  const parsed = createPartnerLocationSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const location = await models.PartnerLocation.create({ ...parsed.data, createdBy: session.user.id });
  return apiSuccess(location, 201);
});

import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { createPartnerLocationSchema } from "@/features/auth/validators";
import PartnerLocation from "@/models/PartnerLocation";

export const GET = withPermission("proof_of_work:view", async () => {
  const locations = await PartnerLocation.find({ isActive: true }).sort({ name: 1 }).lean();
  return apiSuccess(locations);
});

export const POST = withPermission("proof_of_work:manage", async (req, _ctx, session) => {
  const body = await req.json();
  const parsed = createPartnerLocationSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const location = await PartnerLocation.create({ ...parsed.data, createdBy: session.user.id });
  return apiSuccess(location, 201);
});

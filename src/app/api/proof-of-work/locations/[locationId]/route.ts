import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { updatePartnerLocationSchema } from "@/features/auth/validators";
import PartnerLocation from "@/models/PartnerLocation";

export const PUT = withPermission("proof_of_work:manage", async (req, ctx) => {
  const { locationId } = await ctx.params;
  const body = await req.json();
  const parsed = updatePartnerLocationSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const location = await PartnerLocation.findByIdAndUpdate(locationId, parsed.data, { new: true });
  if (!location) return apiError("Location not found", 404);
  return apiSuccess(location);
});

export const DELETE = withPermission("proof_of_work:manage", async (_req, ctx) => {
  const { locationId } = await ctx.params;
  const location = await PartnerLocation.findByIdAndUpdate(
    locationId,
    { isActive: false },
    { new: true }
  );
  if (!location) return apiError("Location not found", 404);
  return apiSuccess({ message: "Location deactivated" });
});

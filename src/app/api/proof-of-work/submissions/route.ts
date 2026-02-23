import mongoose from "mongoose";
import { withPermission, withAuth, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { getTenantPermissions } from "@/features/auth/rbac";
import { submitProofSchema } from "@/features/auth/validators";
import { haversineMetres } from "@/lib/geo";

export const GET = withAuth(async (req, _ctx, session, models) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const taskId = url.searchParams.get("taskId");
  const userId = url.searchParams.get("userId");

  // Non-managers can only view their own submissions
  const perms = await getTenantPermissions(session.user.roles, models);
  const hasManage = perms.has("proof_of_work:manage");
  const filter: Record<string, unknown> = {};
  if (status) filter.verificationStatus = status;
  if (taskId) filter.task = taskId;
  if (userId && hasManage) {
    // Only managers can filter by arbitrary userId
    filter.submittedBy = userId;
  } else if (!hasManage) {
    // Regular submitters always see only their own
    filter.submittedBy = session.user.id;
  }
  // If manager and no userId filter, they see all — no extra constraint needed

  const submissions = await models.ProofOfWork.find(filter)
    .sort({ createdAt: -1 })
    .populate("submittedBy", "firstName lastName avatar")
    .populate("task", "title")
    .populate("qrCheckIn.partnerLocation", "name address")
    .lean();

  return apiSuccess(submissions);
});

export const POST = withPermission("proof_of_work:submit", async (req, _ctx, session, models) => {
  const body = await req.json();
  const parsed = submitProofSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const { task, photos, signatureUrl, capturedAt, capturedLocation, qrCheckIn, notes } = parsed.data;

  let qrCheckInData: {
    partnerLocation: mongoose.Types.ObjectId;
    scannedAt: Date;
    isWithinRadius: boolean;
    distanceMetres: number;
  } | undefined;

  if (qrCheckIn) {
    const loc = await models.PartnerLocation.findById(qrCheckIn.partnerLocation).lean() as any;
    if (!loc) return apiError("Partner location not found", 404);

    let distanceMetres = -1;
    let isWithinRadius = false;

    if (capturedLocation) {
      distanceMetres = Math.round(
        haversineMetres(capturedLocation.lat, capturedLocation.lng, loc.lat, loc.lng)
      );
      isWithinRadius = distanceMetres <= loc.radius;
    }

    qrCheckInData = {
      partnerLocation: loc._id as mongoose.Types.ObjectId,
      scannedAt: new Date(qrCheckIn.scannedAt),
      isWithinRadius,
      distanceMetres,
    };
  }

  const proof = await models.ProofOfWork.create({
    task,
    submittedBy: session.user.id,
    photos,
    signatureUrl,
    capturedAt: new Date(capturedAt),
    capturedLocation,
    qrCheckIn: qrCheckInData,
    notes,
    verificationStatus: "pending",
  });

  return apiSuccess(proof, 201);
});

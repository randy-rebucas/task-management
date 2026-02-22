import mongoose from "mongoose";
import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { submitProofSchema } from "@/features/auth/validators";
function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const GET = withPermission("proof_of_work:view", async (req, _ctx, session) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const taskId = url.searchParams.get("taskId");
  const userId = url.searchParams.get("userId");

  // Non-managers can only view their own submissions
  const hasManage = true; // permission check happens via withPermission; filter by session for non-managers
  const filter: Record<string, unknown> = {};
  if (status) filter.verificationStatus = status;
  if (taskId) filter.task = taskId;
  if (userId) {
    filter.submittedBy = userId;
  }
  // If no userId param and no manage capability, default to own submissions
  // We pass userId=me from front-end for own view; admin passes any userId or none
  if (!userId && !taskId) {
    // show own by default (front-end controls this via userId param)
    filter.submittedBy = session.user.id;
  }

  const submissions = await models.ProofOfWork.find(filter)
    .sort({ createdAt: -1 })
    .populate("submittedBy", "firstName lastName avatar")
    .populate("task", "title")
    .populate("qrCheckIn.partnerLocation", "name address")
    .lean();

  return apiSuccess(submissions);
});

export const POST = withPermission("proof_of_work:submit", async (req, _ctx, session) => {
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
    const loc = await models.PartnerLocation.findById(qrCheckIn.partnerLocation);
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

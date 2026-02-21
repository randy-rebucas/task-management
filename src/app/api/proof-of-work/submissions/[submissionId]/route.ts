import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { verifyProofSchema } from "@/features/auth/validators";
import ProofOfWork from "@/models/ProofOfWork";

export const GET = withPermission("proof_of_work:view", async (_req, ctx) => {
  const { submissionId } = await ctx.params;
  const proof = await ProofOfWork.findById(submissionId)
    .populate("submittedBy", "firstName lastName avatar email")
    .populate("task", "title taskType")
    .populate("qrCheckIn.partnerLocation", "name address lat lng radius")
    .populate("verifiedBy", "firstName lastName")
    .lean();
  if (!proof) return apiError("Submission not found", 404);
  return apiSuccess(proof);
});

export const PUT = withPermission("proof_of_work:manage", async (req, ctx, session) => {
  const { submissionId } = await ctx.params;
  const body = await req.json();
  const parsed = verifyProofSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const update: Record<string, unknown> = {
    verificationStatus: parsed.data.verificationStatus,
    verifiedBy: session.user.id,
    verifiedAt: new Date(),
  };
  if (parsed.data.rejectionReason) {
    update.rejectionReason = parsed.data.rejectionReason;
  }

  const proof = await ProofOfWork.findByIdAndUpdate(submissionId, update, { new: true });
  if (!proof) return apiError("Submission not found", 404);
  return apiSuccess(proof);
});

export const DELETE = withPermission("proof_of_work:manage", async (_req, ctx) => {
  const { submissionId } = await ctx.params;
  const proof = await ProofOfWork.findByIdAndDelete(submissionId);
  if (!proof) return apiError("Submission not found", 404);
  return apiSuccess({ message: "Submission deleted" });
});

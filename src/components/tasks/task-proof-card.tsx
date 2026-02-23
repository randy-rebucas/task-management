"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, CheckCircle2, XCircle, Clock, Plus } from "lucide-react";
import { format } from "date-fns";
import SubmitProofModal from "@/components/proof/submit-proof-modal";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface TaskProofCardProps {
  taskId: string;
}

export function TaskProofCard({ taskId }: TaskProofCardProps) {
  const [open, setOpen] = useState(false);
  const { data: submissions, mutate } = useSWR(
    `/api/proof-of-work/submissions?taskId=${taskId}`,
    fetcher
  );

  const statusMap: Record<string, { label: string; icon: typeof CheckCircle2; cls: string }> = {
    pending:  { label: "Pending",  icon: Clock,        cls: "text-yellow-600" },
    verified: { label: "Verified", icon: CheckCircle2, cls: "text-green-600"  },
    rejected: { label: "Rejected", icon: XCircle,      cls: "text-red-600"    },
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Proof of Work
              {Array.isArray(submissions) && submissions.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({submissions.length})
                </span>
              )}
            </CardTitle>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Submit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {!Array.isArray(submissions) || submissions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No submissions yet.</p>
          ) : (
            submissions.map((p: any) => {
              const st = statusMap[p.verificationStatus] ?? statusMap.pending;
              const Icon = st.icon;
              return (
                <div key={p._id} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(p.createdAt), "MMM d, HH:mm")}
                    {" · "}{p.photos?.length ?? 0} photo{p.photos?.length !== 1 ? "s" : ""}
                    {p.signatureUrl ? " · Signed" : ""}
                    {p.qrCheckIn ? (p.qrCheckIn.isWithinRadius ? " · QR ✓" : " · QR ✗") : ""}
                  </span>
                  <span className={`flex items-center gap-1 text-xs font-medium ${st.cls}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {st.label}
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <SubmitProofModal
        taskId={taskId}
        open={open}
        onClose={() => setOpen(false)}
        onSubmitted={() => mutate()}
      />
    </>
  );
}

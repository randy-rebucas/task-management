"use client";

import { useState, useRef } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Camera,
  PenLine,
  QrCode,
  Plus,
  Trash2,
  Edit,
  PrinterIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useSession } from "next-auth/react";
import { usePermissions } from "@/features/auth/use-permissions";
import { toast } from "sonner";
import SubmitProofModal from "@/components/proof/submit-proof-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json()).then((d) => d.data);

type VerificationStatus = "pending" | "verified" | "rejected";

interface Submission {
  _id: string;
  task: { _id: string; title: string } | null;
  submittedBy: { _id: string; firstName: string; lastName: string; avatar?: string } | null;
  photos: string[];
  signatureUrl?: string;
  capturedAt: string;
  capturedLocation?: { lat: number; lng: number };
  qrCheckIn?: {
    partnerLocation: { _id: string; name: string; address?: string } | string;
    scannedAt: string;
    isWithinRadius: boolean;
    distanceMetres: number;
  };
  verificationStatus: VerificationStatus;
  verifiedBy?: { firstName: string; lastName: string };
  verifiedAt?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
}

interface PartnerLocation {
  _id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  radius: number;
  isActive: boolean;
}

const STATUS_CONFIG: Record<VerificationStatus, { label: string; className: string; icon: React.ElementType }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100", icon: Clock },
  verified: { label: "Verified", className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100", icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100", icon: XCircle },
};

function StatusBadge({ status }: { status: VerificationStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={cfg.className}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

export default function ProofOfWorkPage() {
  const { data: session } = useSession();
  const { can } = usePermissions();
  const [tab, setTab] = useState(0);
  const [submitModal, setSubmitModal] = useState<{ open: boolean; taskId: string }>({
    open: false,
    taskId: "",
  });
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showQr, setShowQr] = useState<PartnerLocation | null>(null);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editLocation, setEditLocation] = useState<PartnerLocation | null>(null);
  const [locationForm, setLocationForm] = useState({ name: "", address: "", lat: "", lng: "", radius: "100" });
  const [locationSaving, setLocationSaving] = useState(false);
  const [deleteLocationTarget, setDeleteLocationTarget] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const mySubmissionsUrl = `/api/proof-of-work/submissions?userId=${session?.user?.id ?? ""}`;
  const allSubmissionsUrl = `/api/proof-of-work/submissions${statusFilter && statusFilter !== "all" ? `?status=${statusFilter}` : ""}`;

  const { data: mySubmissions = [], mutate: mutateMySubmissions } = useSWR<Submission[]>(
    session?.user?.id ? mySubmissionsUrl : null,
    fetcher
  );
  const { data: allSubmissions = [], mutate: mutateAllSubmissions } = useSWR<Submission[]>(
    tab === 1 ? allSubmissionsUrl : null,
    fetcher
  );
  const { data: locations = [], mutate: mutateLocations } = useSWR<PartnerLocation[]>(
    tab === 2 ? "/api/proof-of-work/locations" : null,
    fetcher
  );

  const handleVerify = async (id: string, status: "verified" | "rejected", reason?: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/proof-of-work/submissions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus: status, ...(reason ? { rejectionReason: reason } : {}) }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update submission");
      }
      toast.success(status === "verified" ? "Submission verified" : "Submission rejected");
      await mutateAllSubmissions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update submission");
    } finally {
      setActionLoading(null);
      setRejectId(null);
      setRejectReason("");
    }
  };

  const handleSaveLocation = async () => {
    setLocationSaving(true);
    try {
      const payload = {
        name: locationForm.name,
        address: locationForm.address || undefined,
        lat: parseFloat(locationForm.lat),
        lng: parseFloat(locationForm.lng),
        radius: parseInt(locationForm.radius),
      };
      const res = editLocation
        ? await fetch(`/api/proof-of-work/locations/${editLocation._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/proof-of-work/locations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save location");
      }
      toast.success(editLocation ? "Location updated" : "Location created");
      await mutateLocations();
      setShowLocationForm(false);
      setEditLocation(null);
      setLocationForm({ name: "", address: "", lat: "", lng: "", radius: "100" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save location");
    } finally {
      setLocationSaving(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    try {
      const res = await fetch(`/api/proof-of-work/locations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove location");
      toast.success("Location removed");
      await mutateLocations();
    } catch {
      toast.error("Failed to remove location");
    } finally {
      setDeleteLocationTarget(null);
    }
  };

  const handlePrintQr = () => window.print();

  const openEditLocation = (loc: PartnerLocation) => {
    setEditLocation(loc);
    setLocationForm({
      name: loc.name,
      address: loc.address ?? "",
      lat: String(loc.lat),
      lng: String(loc.lng),
      radius: String(loc.radius),
    });
    setShowLocationForm(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Proof of Work</h1>
            <p className="text-sm text-muted-foreground">Visit verification and field documentation</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/proof-of-work/scan">
              <QrCode className="h-4 w-4" />
              Scan QR
            </a>
          </Button>
          <Button size="sm" onClick={() => setSubmitModal({ open: true, taskId: "" })}>
            <Plus className="h-4 w-4" />
            Submit Proof
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={String(tab)} onValueChange={(v) => setTab(Number(v))}>
        <TabsList>
          <TabsTrigger value="0">My Submissions</TabsTrigger>
          {can("proof_of_work:view") && <TabsTrigger value="1">All Submissions</TabsTrigger>}
          {can("proof_of_work:manage") && <TabsTrigger value="2">Partner Locations</TabsTrigger>}
        </TabsList>

        {/* Tab 0 — My Submissions */}
        <TabsContent value="0" className="space-y-3 mt-4">
          {mySubmissions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-muted-foreground">
              <ShieldCheck className="mx-auto mb-2 h-10 w-10 text-gray-300" />
              <p>No proof submissions yet. Submit your first one!</p>
            </div>
          ) : (
            mySubmissions.map((s) => (
              <SubmissionRow key={s._id} submission={s} showUser={false} />
            ))
          )}
        </TabsContent>

        {/* Tab 1 — All Submissions */}
        <TabsContent value="1" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {allSubmissions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-muted-foreground">
              No submissions found.
            </div>
          ) : (
            allSubmissions.map((s) => (
              <Card key={s._id}>
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">
                          {s.task?.title ?? "Unknown Task"}
                        </span>
                        <StatusBadge status={s.verificationStatus} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        By{" "}
                        {s.submittedBy
                          ? `${s.submittedBy.firstName} ${s.submittedBy.lastName}`
                          : "Unknown"}
                        {" · "}
                        {new Date(s.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>
                          <Camera className="mr-1 inline h-3 w-3" />
                          {s.photos.length} photo{s.photos.length !== 1 ? "s" : ""}
                        </span>
                        {s.signatureUrl && (
                          <span>
                            <PenLine className="mr-1 inline h-3 w-3" />
                            Signed
                          </span>
                        )}
                        {s.qrCheckIn && (
                          <span className={s.qrCheckIn.isWithinRadius ? "text-green-600" : "text-yellow-600"}>
                            <MapPin className="mr-1 inline h-3 w-3" />
                            {s.qrCheckIn.isWithinRadius ? "In radius" : "Outside radius"} ({s.qrCheckIn.distanceMetres}m)
                          </span>
                        )}
                      </div>
                      {s.rejectionReason && (
                        <p className="text-xs text-destructive">Reason: {s.rejectionReason}</p>
                      )}
                    </div>
                    {s.verificationStatus === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                          onClick={() => handleVerify(s._id, "verified")}
                          disabled={actionLoading === s._id}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 h-7 text-xs"
                          onClick={() => setRejectId(s._id)}
                          disabled={actionLoading === s._id}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Reject form */}
                  {rejectId === s._id && (
                    <div className="mt-2 rounded-lg bg-red-50 p-3 space-y-2">
                      <Textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection…"
                        rows={2}
                        className="border-red-200 focus-visible:ring-red-400"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white h-7 text-xs"
                          onClick={() => handleVerify(s._id, "rejected", rejectReason)}
                        >
                          Confirm Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => { setRejectId(null); setRejectReason(""); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Tab 2 — Partner Locations */}
        <TabsContent value="2" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                setShowLocationForm(true);
                setEditLocation(null);
                setLocationForm({ name: "", address: "", lat: "", lng: "", radius: "100" });
              }}
            >
              <Plus className="h-4 w-4" />
              Add Location
            </Button>
          </div>

          {showLocationForm && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-4">
              <h3 className="font-medium text-gray-900">{editLocation ? "Edit Location" : "New Partner Location"}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={locationForm.name}
                    onChange={(e) => setLocationForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Head Office"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Address</Label>
                  <Input
                    value={locationForm.address}
                    onChange={(e) => setLocationForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="123 Main St, City"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Latitude <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    step="any"
                    value={locationForm.lat}
                    onChange={(e) => setLocationForm((f) => ({ ...f, lat: e.target.value }))}
                    placeholder="14.5995"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Longitude <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    step="any"
                    value={locationForm.lng}
                    onChange={(e) => setLocationForm((f) => ({ ...f, lng: e.target.value }))}
                    placeholder="120.9842"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Radius (metres)</Label>
                  <Input
                    type="number"
                    min="10"
                    value={locationForm.radius}
                    onChange={(e) => setLocationForm((f) => ({ ...f, radius: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveLocation}
                  disabled={locationSaving || !locationForm.name || !locationForm.lat || !locationForm.lng}
                >
                  {locationSaving ? "Saving…" : "Save"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setShowLocationForm(false); setEditLocation(null); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {locations.length === 0 && !showLocationForm ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-muted-foreground">
              No partner locations yet.
            </div>
          ) : (
            <div className="space-y-3">
              {locations.map((loc) => (
                <Card key={loc._id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900">{loc.name}</p>
                        {loc.address && <p className="text-sm text-muted-foreground">{loc.address}</p>}
                        <p className="text-xs text-muted-foreground">
                          {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)} · Radius: {loc.radius}m
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => setShowQr(loc)}>
                          <QrCode className="h-3.5 w-3.5" />
                          QR
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEditLocation(loc)}>
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteLocationTarget(loc._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* QR Modal */}
      <Dialog open={!!showQr} onOpenChange={(open) => { if (!open) setShowQr(null); }}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader>
            <DialogTitle>{showQr?.name}</DialogTitle>
            {showQr?.address && <p className="text-sm text-muted-foreground">{showQr.address}</p>}
          </DialogHeader>
          <div ref={printRef} className="flex justify-center py-2">
            {showQr && (
              <QRCodeSVG
                value={JSON.stringify({
                  locationId: showQr._id,
                  name: showQr.name,
                  lat: showQr.lat,
                  lng: showQr.lng,
                  radius: showQr.radius,
                })}
                size={200}
              />
            )}
          </div>
          <Button variant="outline" className="w-full" onClick={handlePrintQr}>
            <PrinterIcon className="h-4 w-4" />
            Print
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete Location Confirmation */}
      <AlertDialog open={!!deleteLocationTarget} onOpenChange={(open) => { if (!open) setDeleteLocationTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Location?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the partner location and any QR codes printed for it will stop working for future check-ins.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => deleteLocationTarget && handleDeleteLocation(deleteLocationTarget)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit Proof Modal */}
      <SubmitProofModal
        taskId={submitModal.taskId}
        open={submitModal.open}
        onClose={() => setSubmitModal({ open: false, taskId: "" })}
        onSubmitted={() => {
          mutateMySubmissions();
          globalMutate(allSubmissionsUrl);
        }}
      />
    </div>
  );
}

function SubmissionRow({ submission: s, showUser }: { submission: Submission; showUser: boolean }) {
  return (
    <Card>
      <CardContent className="p-5 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900">{s.task?.title ?? "Unknown Task"}</span>
              <StatusBadge status={s.verificationStatus} />
            </div>
            {showUser && s.submittedBy && (
              <p className="text-sm text-muted-foreground">
                {s.submittedBy.firstName} {s.submittedBy.lastName}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString()}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>
                <Camera className="mr-0.5 inline h-3 w-3" />
                {s.photos.length} photo{s.photos.length !== 1 ? "s" : ""}
              </span>
              {s.signatureUrl && (
                <span>
                  <PenLine className="mr-0.5 inline h-3 w-3" />
                  Signed
                </span>
              )}
              {s.qrCheckIn && (
                <span className={s.qrCheckIn.isWithinRadius ? "text-green-600" : "text-yellow-600"}>
                  <MapPin className="mr-0.5 inline h-3 w-3" />
                  {s.qrCheckIn.isWithinRadius ? "In radius" : "Outside radius"} ({s.qrCheckIn.distanceMetres}m)
                </span>
              )}
              {s.capturedLocation && (
                <span>
                  GPS: {s.capturedLocation.lat.toFixed(4)}, {s.capturedLocation.lng.toFixed(4)}
                </span>
              )}
            </div>
            {s.rejectionReason && (
              <p className="text-xs text-destructive mt-1">Rejected: {s.rejectionReason}</p>
            )}
          </div>
        </div>
        {s.photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pt-1">
            {s.photos.slice(0, 5).map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`Photo ${i + 1}`}
                className="h-16 w-16 shrink-0 rounded-lg object-cover"
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

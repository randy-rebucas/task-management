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
import SubmitProofModal from "@/components/proof/submit-proof-modal";

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

const STATUS_CONFIG: Record<VerificationStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  verified: { label: "Verified", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
};

function StatusBadge({ status }: { status: VerificationStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

export default function ProofOfWorkPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState(0);
  const [submitModal, setSubmitModal] = useState<{ open: boolean; taskId: string }>({
    open: false,
    taskId: "",
  });
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [showQr, setShowQr] = useState<PartnerLocation | null>(null);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editLocation, setEditLocation] = useState<PartnerLocation | null>(null);
  const [locationForm, setLocationForm] = useState({ name: "", address: "", lat: "", lng: "", radius: "100" });
  const [locationSaving, setLocationSaving] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const mySubmissionsUrl = `/api/proof-of-work/submissions?userId=${session?.user?.id ?? ""}`;
  const allSubmissionsUrl = `/api/proof-of-work/submissions${statusFilter ? `?status=${statusFilter}` : ""}`;

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
      await fetch(`/api/proof-of-work/submissions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus: status, ...(reason ? { rejectionReason: reason } : {}) }),
      });
      await mutateAllSubmissions();
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
      if (editLocation) {
        await fetch(`/api/proof-of-work/locations/${editLocation._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/proof-of-work/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      await mutateLocations();
      setShowLocationForm(false);
      setEditLocation(null);
      setLocationForm({ name: "", address: "", lat: "", lng: "", radius: "100" });
    } finally {
      setLocationSaving(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    await fetch(`/api/proof-of-work/locations/${id}`, { method: "DELETE" });
    await mutateLocations();
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

  const TABS = ["My Submissions", "All Submissions", "Partner Locations"];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Proof of Work</h1>
            <p className="text-sm text-gray-500">Visit verification and field documentation</p>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href="/proof-of-work/scan"
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <QrCode className="h-4 w-4" />
            Scan QR
          </a>
          <button
            onClick={() => setSubmitModal({ open: true, taskId: "" })}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Submit Proof
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex gap-6">
          {TABS.map((label, i) => (
            <button
              key={label}
              onClick={() => setTab(i)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                tab === i
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab 0 — My Submissions */}
      {tab === 0 && (
        <div className="space-y-3">
          {mySubmissions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
              <ShieldCheck className="mx-auto mb-2 h-10 w-10 text-gray-300" />
              <p>No proof submissions yet. Submit your first one!</p>
            </div>
          ) : (
            mySubmissions.map((s) => (
              <SubmissionRow key={s._id} submission={s} showUser={false} />
            ))
          )}
        </div>
      )}

      {/* Tab 1 — All Submissions */}
      {tab === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {allSubmissions.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-gray-500">
              No submissions found.
            </div>
          ) : (
            allSubmissions.map((s) => (
              <div key={s._id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">
                        {s.task?.title ?? "Unknown Task"}
                      </span>
                      <StatusBadge status={s.verificationStatus} />
                    </div>
                    <p className="text-sm text-gray-500">
                      By{" "}
                      {s.submittedBy
                        ? `${s.submittedBy.firstName} ${s.submittedBy.lastName}`
                        : "Unknown"}
                      {" · "}
                      {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex gap-4 text-xs text-gray-500">
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
                      <p className="text-xs text-red-600">Reason: {s.rejectionReason}</p>
                    )}
                  </div>
                  {s.verificationStatus === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleVerify(s._id, "verified")}
                        disabled={actionLoading === s._id}
                        className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Verify
                      </button>
                      <button
                        onClick={() => setRejectId(s._id)}
                        disabled={actionLoading === s._id}
                        className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                {/* Reject form */}
                {rejectId === s._id && (
                  <div className="mt-4 rounded-lg bg-red-50 p-3 space-y-2">
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection…"
                      rows={2}
                      className="w-full rounded border border-red-200 px-2 py-1.5 text-sm focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerify(s._id, "rejected", rejectReason)}
                        className="rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                      >
                        Confirm Reject
                      </button>
                      <button
                        onClick={() => { setRejectId(null); setRejectReason(""); }}
                        className="rounded-lg border px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2 — Partner Locations */}
      {tab === 2 && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setShowLocationForm(true); setEditLocation(null); setLocationForm({ name: "", address: "", lat: "", lng: "", radius: "100" }); }}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Location
            </button>
          </div>

          {showLocationForm && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-3">
              <h3 className="font-medium text-gray-900">{editLocation ? "Edit Location" : "New Partner Location"}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Name *</label>
                  <input
                    value={locationForm.name}
                    onChange={(e) => setLocationForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Head Office"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Address</label>
                  <input
                    value={locationForm.address}
                    onChange={(e) => setLocationForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123 Main St, City"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Latitude *</label>
                  <input
                    type="number"
                    step="any"
                    value={locationForm.lat}
                    onChange={(e) => setLocationForm((f) => ({ ...f, lat: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="14.5995"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Longitude *</label>
                  <input
                    type="number"
                    step="any"
                    value={locationForm.lng}
                    onChange={(e) => setLocationForm((f) => ({ ...f, lng: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="120.9842"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Radius (metres)</label>
                  <input
                    type="number"
                    min="10"
                    value={locationForm.radius}
                    onChange={(e) => setLocationForm((f) => ({ ...f, radius: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveLocation}
                  disabled={locationSaving || !locationForm.name || !locationForm.lat || !locationForm.lng}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {locationSaving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => { setShowLocationForm(false); setEditLocation(null); }}
                  className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {locations.length === 0 && !showLocationForm ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-gray-500">
              No partner locations yet.
            </div>
          ) : (
            <div className="space-y-3">
              {locations.map((loc) => (
                <div key={loc._id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">{loc.name}</p>
                      {loc.address && <p className="text-sm text-gray-500">{loc.address}</p>}
                      <p className="text-xs text-gray-400">
                        {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)} · Radius: {loc.radius}m
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setShowQr(loc)}
                        className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        QR
                      </button>
                      <button
                        onClick={() => openEditLocation(loc)}
                        className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteLocation(loc._id)}
                        className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QR Modal */}
      {showQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-xl bg-white p-8 shadow-2xl text-center space-y-4 max-w-xs w-full">
            <h3 className="font-semibold text-gray-900">{showQr.name}</h3>
            {showQr.address && <p className="text-sm text-gray-500">{showQr.address}</p>}
            <div ref={printRef} className="flex justify-center">
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
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrintQr}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <PrinterIcon className="h-4 w-4" />
                Print
              </button>
              <button
                onClick={() => setShowQr(null)}
                className="flex-1 rounded-lg bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">{s.task?.title ?? "Unknown Task"}</span>
            <StatusBadge status={s.verificationStatus} />
          </div>
          {showUser && s.submittedBy && (
            <p className="text-sm text-gray-500">
              {s.submittedBy.firstName} {s.submittedBy.lastName}
            </p>
          )}
          <p className="text-xs text-gray-400">{new Date(s.createdAt).toLocaleString()}</p>
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
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
            <p className="text-xs text-red-600 mt-1">Rejected: {s.rejectionReason}</p>
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
    </div>
  );
}

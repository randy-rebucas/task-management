"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import useSWR from "@/lib/swr-compat";
import { X, Camera, Pen, CheckCircle, MapPin, Upload, Trash2 } from "lucide-react";
import SignaturePad, { SignaturePadRef } from "./signature-pad";

interface QrCheckInData {
  partnerLocation: string;
  scannedAt: string;
  locationName: string;
  isWithinRadius: boolean;
  distanceMetres: number;
}

interface SubmitProofModalProps {
  taskId: string;
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

const STEPS = ["Photos", "Signature", "Review & Submit"] as const;

export default function SubmitProofModal({
  taskId,
  open,
  onClose,
  onSubmitted,
}: SubmitProofModalProps) {
  const [step, setStep] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState(taskId);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sigPadRef = useRef<SignaturePadRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch tasks for the task selector (only when modal is open and no pre-selected taskId)
  const { data: tasksData } = useSWR<{ items: { _id: string; title: string }[] }>(
    open && !taskId ? "/api/tasks?limit=200&sortBy=title&sortOrder=asc" : null,
    (url: string) => fetch(url).then((r) => r.json()).then((d) => d.data)
  );

  // Sync selectedTaskId when the taskId prop changes (e.g. opened from a task detail view)
  useEffect(() => {
    setSelectedTaskId(taskId);
  }, [taskId, open]);

  // Read QR check-in from sessionStorage (set by scan page)
  const getQrCheckIn = (): QrCheckInData | null => {
    try {
      const raw = sessionStorage.getItem("pow_qr_checkin");
      if (!raw) return null;
      return JSON.parse(raw) as QrCheckInData;
    } catch {
      return null;
    }
  };

  const captureGps = useCallback(() => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGpsError("Could not get location"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/field/photos", { method: "POST", body: form });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        urls.push(data.data?.url ?? data.url);
      }
      setPhotos((prev) => [...prev, ...urls]);
    } catch {
      setError("Photo upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveSignature = async () => {
    if (!sigPadRef.current) return;
    if (sigPadRef.current.isEmpty()) {
      setError("Please draw your signature before continuing.");
      return;
    }
    const dataUrl = sigPadRef.current.getDataUrl();
    if (!dataUrl) return;

    // Upload the signature PNG as a file instead of storing base64 in the DB
    setUploading(true);
    setError(null);
    try {
      const fetchRes = await fetch(dataUrl);
      const blob = await fetchRes.blob();
      const form = new FormData();
      form.append("file", blob, "signature.png");
      const uploadRes = await fetch("/api/field/photos", { method: "POST", body: form });
      if (!uploadRes.ok) throw new Error("Signature upload failed");
      const uploadData = await uploadRes.json();
      setSignatureUrl(uploadData.data?.url ?? uploadData.url);
      setError(null);
      setStep(2);
    } catch {
      setError("Signature upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTaskId) {
      setError("Please select a task.");
      return;
    }
    if (photos.length === 0) {
      setError("At least one photo is required.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const qrCheckIn = getQrCheckIn();

    const body: Record<string, unknown> = {
      task: selectedTaskId,
      photos,
      capturedAt: new Date().toISOString(),
      notes,
    };
    if (signatureUrl) body.signatureUrl = signatureUrl;
    if (gps) body.capturedLocation = gps;
    if (qrCheckIn) {
      body.qrCheckIn = {
        partnerLocation: qrCheckIn.partnerLocation,
        scannedAt: qrCheckIn.scannedAt,
      };
    }

    try {
      const res = await fetch("/api/proof-of-work/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Submission failed");
      }
      sessionStorage.removeItem("pow_qr_checkin");
      onSubmitted();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(0);
    setSelectedTaskId(taskId);
    setPhotos([]);
    setSignatureUrl(null);
    setGps(null);
    setGpsError(null);
    setNotes("");
    setError(null);
    onClose();
  };

  const qrCheckIn = getQrCheckIn();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Submit Proof of Work</h2>
          <button onClick={handleClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex border-b">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`flex-1 py-3 text-center text-sm font-medium ${
                i === step
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : i < step
                  ? "text-green-600"
                  : "text-gray-400"
              }`}
            >
              {i < step ? <CheckCircle className="mx-auto h-4 w-4" /> : label}
            </div>
          ))}
        </div>

        <div className="px-6 py-5">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          {/* Step 0 — Photos */}
          {step === 0 && (
            <div className="space-y-4">
              {/* Task selector — shown when no task was pre-selected */}
              {!taskId && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Task <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a task…</option>
                    {tasksData?.items?.map((t) => (
                      <option key={t._id} value={t._id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <p className="text-sm text-gray-600">
                Take at least one photo as proof of your visit.
              </p>

              {qrCheckIn && (
                <div
                  className={`rounded-lg border p-3 text-sm ${
                    qrCheckIn.isWithinRadius
                      ? "border-green-200 bg-green-50 text-green-800"
                      : "border-yellow-200 bg-yellow-50 text-yellow-800"
                  }`}
                >
                  <MapPin className="mr-1 inline h-4 w-4" />
                  QR Checked in: <strong>{qrCheckIn.locationName}</strong>
                  {" — "}
                  {qrCheckIn.isWithinRadius
                    ? `Within radius (${qrCheckIn.distanceMetres}m)`
                    : `Outside radius (${qrCheckIn.distanceMetres}m)`}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                {photos.map((url, i) => (
                  <div key={i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Photo ${i + 1}`}
                      className="h-24 w-full rounded-lg object-cover"
                    />
                    <button
                      onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                      className="absolute right-1 top-1 rounded-full bg-red-500 p-0.5 text-white"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex h-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 disabled:opacity-50"
                >
                  {uploading ? (
                    <Upload className="h-5 w-5 animate-bounce" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                  {uploading ? "Uploading…" : "Add Photo"}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => {
                  if (!selectedTaskId) {
                    setError("Please select a task.");
                    return;
                  }
                  if (photos.length === 0) {
                    setError("At least one photo is required.");
                    return;
                  }
                  setError(null);
                  captureGps();
                  setStep(1);
                }}
                disabled={uploading}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Next: Signature
              </button>
            </div>
          )}

          {/* Step 1 — Signature */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Draw your signature below to confirm this visit.</p>
              <div className="overflow-hidden rounded-lg border border-gray-300 bg-gray-50">
                <SignaturePad
                  ref={sigPadRef}
                  width={450}
                  height={180}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => sigPadRef.current?.clear()}
                  className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Clear
                </button>
                <button
                  onClick={saveSignature}
                  className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Pen className="mr-1 inline h-4 w-4" />
                  Save Signature
                </button>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  setStep(2);
                }}
                className="w-full text-center text-sm text-gray-400 underline"
              >
                Skip signature
              </button>
            </div>
          )}

          {/* Step 2 — Review & Submit */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Photos</span>
                  <span className="font-medium">{photos.length} captured</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Signature</span>
                  <span className="font-medium">{signatureUrl ? "Drawn" : "Skipped"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">GPS</span>
                  <span className="font-medium">
                    {gps ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : gpsError ?? "Not captured"}
                  </span>
                </div>
                {qrCheckIn && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">QR Check-in</span>
                    <span className={`font-medium ${qrCheckIn.isWithinRadius ? "text-green-600" : "text-yellow-600"}`}>
                      {qrCheckIn.locationName} ({qrCheckIn.distanceMetres}m)
                    </span>
                  </div>
                )}
              </div>

              {signatureUrl && (
                <div>
                  <p className="mb-1 text-xs text-gray-500">Signature preview</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={signatureUrl}
                    alt="Signature"
                    className="h-16 rounded border border-gray-200 bg-white"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any notes about this visit…"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Submit Proof"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

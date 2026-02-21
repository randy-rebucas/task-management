"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { MapPin, CheckCircle2, XCircle, ArrowLeft, QrCode } from "lucide-react";

const QrScanner = dynamic(() => import("@/components/proof/qr-scanner"), { ssr: false });

interface QrPayload {
  locationId: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
}

interface ScanResult {
  payload: QrPayload;
  distance: number;
  isWithinRadius: boolean;
  userLat: number;
  userLng: number;
}

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

export default function QrScanPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const handleScan = useCallback((data: string) => {
    if (!scanning) return;
    setScanning(false);

    let payload: QrPayload;
    try {
      payload = JSON.parse(data) as QrPayload;
      if (!payload.locationId || typeof payload.lat !== "number") {
        setError("Invalid QR code — not a Proof of Work location QR.");
        return;
      }
    } catch {
      setError("Could not read QR code data.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        const distance = Math.round(haversineMetres(userLat, userLng, payload.lat, payload.lng));
        const isWithinRadius = distance <= payload.radius;

        setResult({ payload, distance, isWithinRadius, userLat, userLng });
        setLocating(false);
      },
      () => {
        // GPS failed — still record the scan but mark distance as unknown
        setResult({ payload, distance: -1, isWithinRadius: false, userLat: 0, userLng: 0 });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [scanning]);

  const handleAddToProof = () => {
    if (!result) return;
    const checkIn = {
      partnerLocation: result.payload.locationId,
      scannedAt: new Date().toISOString(),
      locationName: result.payload.name,
      isWithinRadius: result.isWithinRadius,
      distanceMetres: result.distance,
    };
    sessionStorage.setItem("pow_qr_checkin", JSON.stringify(checkIn));
    router.push("/proof-of-work");
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-white">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-4">
        <button
          onClick={() => router.push("/proof-of-work")}
          className="rounded-full p-2 hover:bg-gray-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-blue-400" />
          <span className="font-semibold">Scan Partner QR</span>
        </div>
      </div>

      {/* Scanner area */}
      {scanning && !locating && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <p className="text-sm text-gray-400">Point camera at the partner location QR code</p>
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-gray-900">
            <QrScanner
              onResult={handleScan}
              onError={(e) => {
                // Ignore common "no QR code found" errors during scanning
                if (!e.includes("No MultiFormat")) setError(e);
              }}
            />
          </div>
        </div>
      )}

      {locating && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <MapPin className="h-10 w-10 animate-bounce text-blue-400" />
          <p className="text-gray-300">Getting your location…</p>
        </div>
      )}

      {error && !locating && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <XCircle className="h-12 w-12 text-red-400" />
          <p className="text-center text-gray-300">{error}</p>
          <button
            onClick={() => { setError(null); setScanning(true); }}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Result */}
      {result && !locating && (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6">
          {result.isWithinRadius ? (
            <CheckCircle2 className="h-16 w-16 text-green-400" />
          ) : (
            <XCircle className="h-16 w-16 text-yellow-400" />
          )}

          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold">{result.payload.name}</h2>
            <p className="text-sm text-gray-400">
              {result.distance >= 0 ? `${result.distance}m from location` : "Distance unknown"}
            </p>
            <p
              className={`text-sm font-medium ${
                result.isWithinRadius ? "text-green-400" : "text-yellow-400"
              }`}
            >
              {result.isWithinRadius
                ? `Within ${result.payload.radius}m radius ✓`
                : `Outside ${result.payload.radius}m radius`}
            </p>
          </div>

          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={handleAddToProof}
              className="w-full rounded-xl bg-blue-600 py-3 font-medium hover:bg-blue-700"
            >
              Add to Proof Submission
            </button>
            <button
              onClick={() => { setResult(null); setScanning(true); }}
              className="w-full rounded-xl border border-gray-700 py-3 text-sm text-gray-400 hover:bg-gray-800"
            >
              Scan Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

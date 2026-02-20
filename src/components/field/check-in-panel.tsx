"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, LogIn, LogOut, Camera, Loader2, Clock, Navigation } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function CheckInPanel() {
  const { data: sessions, mutate } = useSWR(
    "/api/field/sessions?status=active",
    fetcher
  );

  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  const activeSession = sessions?.data?.[0];
  const isCheckedIn = !!activeSession;

  const getLocation = useCallback((): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(new Error(err.message)),
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });
  }, []);

  async function uploadPhoto(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/field/photos", { method: "POST", body: form });
    if (!res.ok) throw new Error("Photo upload failed");
    const data = await res.json();
    return data.url;
  }

  async function handleCheckIn() {
    setLoading(true);
    setLocating(true);
    try {
      const location = await getLocation();
      setCoords(location);
      setLocating(false);

      let photoUrl: string | undefined;
      if (photo) {
        photoUrl = await uploadPhoto(photo);
      }

      const res = await fetch("/api/field/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: location.lat,
          lng: location.lng,
          notes: notes || undefined,
          photo: photoUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Check-in failed");
      }

      toast.success("Checked in successfully!");
      setNotes("");
      setPhoto(null);
      setShowNotes(false);
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Check-in failed");
    } finally {
      setLoading(false);
      setLocating(false);
    }
  }

  async function handleCheckOut() {
    if (!activeSession) return;
    setLoading(true);
    setLocating(true);
    try {
      const location = await getLocation();
      setLocating(false);

      let photoUrl: string | undefined;
      if (photo) {
        photoUrl = await uploadPhoto(photo);
      }

      const res = await fetch(`/api/field/sessions/${activeSession._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "checkout",
          lat: location.lat,
          lng: location.lng,
          photo: photoUrl,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Check-out failed");
      }

      const result = await res.json();
      toast.success(
        `Checked out! Duration: ${formatDuration(result.duration || 0)}`
      );
      setNotes("");
      setPhoto(null);
      setShowNotes(false);
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Check-out failed");
    } finally {
      setLoading(false);
      setLocating(false);
    }
  }

  const now = new Date();
  const sessionDuration = activeSession
    ? Math.round((now.getTime() - new Date(activeSession.checkIn.time).getTime()) / 60000)
    : 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Navigation className="h-4 w-4" />
          Field Check-In
          {isCheckedIn && (
            <Badge className="ml-auto bg-green-500 text-white">Active Session</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isCheckedIn ? (
          <>
            {/* Active session info */}
            <div className="rounded-md bg-green-50 border border-green-200 p-3 space-y-2 dark:bg-green-950/30 dark:border-green-800">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-3.5 w-3.5 text-green-600" />
                <span className="font-medium text-green-700 dark:text-green-400">
                  {formatDuration(sessionDuration)} elapsed
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Checked in at {format(new Date(activeSession.checkIn.time), "h:mm a")} &bull;{" "}
                {formatDistanceToNow(new Date(activeSession.checkIn.time), { addSuffix: true })}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {activeSession.checkIn.location.lat.toFixed(5)},{" "}
                {activeSession.checkIn.location.lng.toFixed(5)}
              </div>
              {activeSession.checkIn.photo && (
                <img
                  src={activeSession.checkIn.photo}
                  alt="Check-in photo"
                  className="h-20 w-auto rounded object-cover mt-1"
                />
              )}
            </div>

            {showNotes && (
              <div className="space-y-2">
                <Label htmlFor="checkout-notes">Notes (optional)</Label>
                <Textarea
                  id="checkout-notes"
                  placeholder="Summary of field work..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Camera className="h-3 w-3" /> Geotagged photo (optional)
                  </Label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                    className="text-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {!showNotes && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNotes(true)}
                  className="flex-1"
                >
                  <Camera className="h-3.5 w-3.5 mr-1" /> Add Notes / Photo
                </Button>
              )}
              <Button
                onClick={handleCheckOut}
                disabled={loading}
                variant="destructive"
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : locating ? (
                  <MapPin className="h-4 w-4 animate-pulse mr-2" />
                ) : (
                  <LogOut className="h-4 w-4 mr-2" />
                )}
                {locating ? "Getting GPS..." : "Check Out"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Start a field session to track your location and visit duration.
            </p>

            {showNotes && (
              <div className="space-y-2">
                <Label htmlFor="checkin-notes">Notes (optional)</Label>
                <Textarea
                  id="checkin-notes"
                  placeholder="Purpose, destination..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Camera className="h-3 w-3" /> Geotagged photo (optional)
                  </Label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                    className="text-sm"
                  />
                  {photo && <p className="text-xs text-muted-foreground">{photo.name}</p>}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {!showNotes && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNotes(true)}
                >
                  <Camera className="h-3.5 w-3.5 mr-1" /> Add Photo
                </Button>
              )}
              <Button
                onClick={handleCheckIn}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : locating ? (
                  <MapPin className="h-4 w-4 animate-pulse mr-2" />
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                {locating ? "Getting GPS..." : "Check In"}
              </Button>
            </div>

            {coords && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

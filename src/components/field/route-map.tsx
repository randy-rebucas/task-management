"use client";

import { useEffect, useRef } from "react";

interface Point {
  lat: number;
  lng: number;
  timestamp?: string;
}

interface RouteMapProps {
  checkIn?: Point;
  checkOut?: Point;
  routePoints?: Point[];
  height?: number;
}

export function RouteMap({ checkIn, checkOut, routePoints = [], height = 400 }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let aborted = false;
    let localMap: any = null;

    (async () => {
      const L = (await import("leaflet")).default;

      if (aborted || !containerRef.current) return;

      // Inject Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const map = L.map(containerRef.current!);
      localMap = map;
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const allPoints: [number, number][] = [];

      // Check-in marker (green)
      if (checkIn) {
        allPoints.push([checkIn.lat, checkIn.lng]);
        L.circleMarker([checkIn.lat, checkIn.lng], {
          radius: 10,
          fillColor: "#22c55e",
          color: "#16a34a",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        })
          .bindPopup(
            `<b>Check-In</b><br/>${checkIn.timestamp ? new Date(checkIn.timestamp).toLocaleTimeString() : ""}`
          )
          .addTo(map);
      }

      // Route points (blue dots)
      routePoints.forEach((pt, i) => {
        allPoints.push([pt.lat, pt.lng]);
        L.circleMarker([pt.lat, pt.lng], {
          radius: 5,
          fillColor: "#3b82f6",
          color: "#1d4ed8",
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.7,
        })
          .bindPopup(
            `<b>Point ${i + 1}</b><br/>${pt.timestamp ? new Date(pt.timestamp).toLocaleTimeString() : ""}`
          )
          .addTo(map);
      });

      // Draw route polyline
      if (allPoints.length > 1) {
        L.polyline(allPoints, {
          color: "#3b82f6",
          weight: 3,
          opacity: 0.7,
          dashArray: "6, 4",
        }).addTo(map);
      }

      // Check-out marker (red)
      if (checkOut) {
        allPoints.push([checkOut.lat, checkOut.lng]);
        L.circleMarker([checkOut.lat, checkOut.lng], {
          radius: 10,
          fillColor: "#ef4444",
          color: "#b91c1c",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        })
          .bindPopup(
            `<b>Check-Out</b><br/>${checkOut.timestamp ? new Date(checkOut.timestamp).toLocaleTimeString() : ""}`
          )
          .addTo(map);
      }

      // Fit map to bounds
      if (allPoints.length > 0) {
        map.fitBounds(allPoints, { padding: [30, 30] });
      } else {
        map.setView([14.5995, 120.9842], 12); // Default: Manila
      }

    })();

    return () => {
      aborted = true;
      if (localMap) {
        localMap.remove();
        localMap = null;
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative rounded-md overflow-hidden border">
      <div ref={containerRef} style={{ height }} />
      <div className="absolute bottom-2 left-2 z-[1000] flex gap-2 text-xs bg-white/90 rounded px-2 py-1 shadow">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" /> Check-In
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" /> Route
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" /> Check-Out
        </span>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";

interface CoveragePoint {
  lat: number;
  lng: number;
  user?: { firstName: string; lastName: string };
  time?: string;
}

interface CoverageMapProps {
  points: CoveragePoint[];
  height?: number;
}

export function CoverageMap({ points, height = 500 }: CoverageMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return;

    let aborted = false;
    let localMap: any = null;

    (async () => {
      const L = (await import("leaflet")).default;

      if (aborted || !containerRef.current) return;

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

      // Cluster points by location (rounding to 4 decimal places ~11m precision)
      const clusters = new Map<string, { count: number; lat: number; lng: number; users: string[] }>();
      points.forEach((pt) => {
        const key = `${pt.lat.toFixed(4)},${pt.lng.toFixed(4)}`;
        if (!clusters.has(key)) {
          clusters.set(key, { count: 0, lat: pt.lat, lng: pt.lng, users: [] });
        }
        const c = clusters.get(key)!;
        c.count++;
        if (pt.user) {
          const name = `${pt.user.firstName} ${pt.user.lastName}`;
          if (!c.users.includes(name)) c.users.push(name);
        }
      });

      const maxCount = Math.max(...Array.from(clusters.values()).map((c) => c.count));

      clusters.forEach((cluster) => {
        const intensity = cluster.count / maxCount;
        const radius = 10 + intensity * 30;
        const opacity = 0.3 + intensity * 0.5;

        L.circleMarker([cluster.lat, cluster.lng], {
          radius,
          fillColor: `hsl(${220 - intensity * 160}, 90%, 50%)`,
          color: "transparent",
          fillOpacity: opacity,
        })
          .bindPopup(
            `<b>${cluster.count} visit${cluster.count !== 1 ? "s" : ""}</b><br/>${cluster.users.slice(0, 5).join("<br/>")}`
          )
          .addTo(map);
      });

      const latlngs = points.map((p) => [p.lat, p.lng] as [number, number]);
      map.fitBounds(latlngs, { padding: [40, 40] });

    })();

    return () => {
      aborted = true;
      if (localMap) {
        localMap.remove();
        localMap = null;
        mapRef.current = null;
      }
    };
  }, [points]);

  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-md border bg-muted/30 text-muted-foreground text-sm"
        style={{ height }}
      >
        No location data available for the selected period.
      </div>
    );
  }

  return (
    <div className="relative rounded-md overflow-hidden border">
      <div ref={containerRef} style={{ height }} />
      <div className="absolute top-2 right-2 z-[1000] bg-white/90 rounded px-2 py-1 shadow text-xs space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-blue-400 inline-block" /> Low density
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-orange-400 inline-block" /> Medium
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-500 inline-block" /> High density
        </div>
      </div>
    </div>
  );
}

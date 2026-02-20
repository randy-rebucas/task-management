"use client";

import { useState, lazy, Suspense } from "react";
import useSWR from "swr";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckInPanel } from "@/components/field/check-in-panel";
import { usePermissions } from "@/features/auth/use-permissions";
import {
  Navigation,
  Users,
  Clock,
  MapPin,
  Activity,
  ChevronRight,
  Eye,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const RouteMap = lazy(() =>
  import("@/components/field/route-map").then((m) => ({ default: m.RouteMap }))
);
const CoverageMap = lazy(() =>
  import("@/components/field/coverage-map").then((m) => ({ default: m.CoverageMap }))
);

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type TabId = "checkin" | "sessions" | "route" | "coverage";

const TABS: { id: TabId; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
  { id: "checkin", label: "Check In / Out", icon: Navigation },
  { id: "sessions", label: "Sessions", icon: Activity },
  { id: "route", label: "Route History", icon: MapPin, adminOnly: true },
  { id: "coverage", label: "Coverage Map", icon: Users, adminOnly: true },
];

function formatDuration(minutes?: number) {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function FieldMonitoringPage() {
  const { can } = usePermissions();
  const isAdmin = can("visit_logs:view_all");
  const [activeTab, setActiveTab] = useState<TabId>("checkin");

  // Sessions tab
  const [dateFilter, setDateFilter] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [userFilter, setUserFilter] = useState("");

  const sessionsParams = new URLSearchParams();
  if (dateFilter) sessionsParams.set("date", dateFilter);
  if (userFilter) sessionsParams.set("userId", userFilter);
  const { data: sessionsData, isLoading: sessionsLoading } = useSWR(
    activeTab === "sessions" ? `/api/field/sessions?${sessionsParams}` : null,
    fetcher
  );

  // Route history tab
  const [routeSessionId, setRouteSessionId] = useState("");
  const { data: routeSession } = useSWR(
    activeTab === "route" && routeSessionId
      ? `/api/field/sessions/${routeSessionId}`
      : null,
    fetcher
  );

  // Users list for filter dropdown
  const { data: users } = useSWR(isAdmin ? "/api/users?limit=100" : null, fetcher);

  // Coverage tab
  const [coverageDays, setCoverageDays] = useState("30");
  const { data: coverageData, isLoading: coverageLoading } = useSWR(
    activeTab === "coverage" ? `/api/field/coverage?days=${coverageDays}` : null,
    fetcher
  );

  const tabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div>
      <PageHeader
        title="Field Monitoring"
        description="GPS check-in tracking, route history, and territory coverage"
      />

      {/* Tab bar */}
      <div className="mt-6 flex gap-1 border-b pb-0 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {/* CHECK IN / OUT TAB */}
        {activeTab === "checkin" && (
          <div className="grid gap-6 md:grid-cols-2">
            <CheckInPanel />
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" /> My Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RecentSessions onViewRoute={(id) => { setRouteSessionId(id); setActiveTab("route"); }} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* SESSIONS TAB */}
        {activeTab === "sessions" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-auto"
              />
              {isAdmin && (
                <select
                  className="border rounded px-3 py-1.5 text-sm"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                >
                  <option value="">All Staff</option>
                  {users?.data?.map((u: any) => (
                    <option key={u._id} value={u._id}>
                      {u.firstName} {u.lastName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Summary cards */}
            {!sessionsLoading && sessionsData && (
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Total Sessions</p>
                    <p className="text-2xl font-bold">{sessionsData.total || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Active Now</p>
                    <p className="text-2xl font-bold text-green-600">
                      {sessionsData.data?.filter((s: any) => s.status === "active").length || 0}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Avg Duration</p>
                    <p className="text-2xl font-bold">
                      {formatDuration(
                        sessionsData.data
                          ?.filter((s: any) => s.duration)
                          .reduce((sum: number, s: any) => sum + (s.duration || 0), 0) /
                          Math.max(sessionsData.data?.filter((s: any) => s.duration).length || 1, 1)
                      )}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {sessionsLoading ? (
              <LoadingSkeleton />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isAdmin && <TableHead>Staff</TableHead>}
                      <TableHead>Check-In</TableHead>
                      <TableHead>Check-Out</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      {isAdmin && <TableHead></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionsData?.data?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No sessions found for the selected filters.
                        </TableCell>
                      </TableRow>
                    )}
                    {sessionsData?.data?.map((s: any) => (
                      <TableRow key={s._id}>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px]">
                                  {s.user?.firstName?.[0]}{s.user?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {s.user?.firstName} {s.user?.lastName}
                              </span>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="text-sm">
                          <div>{format(new Date(s.checkIn.time), "h:mm a")}</div>
                          <div className="text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 inline mr-0.5" />
                            {s.checkIn.location.lat.toFixed(4)},{" "}
                            {s.checkIn.location.lng.toFixed(4)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {s.checkOut ? (
                            <div>
                              <div>{format(new Date(s.checkOut.time), "h:mm a")}</div>
                              <div className="text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 inline mr-0.5" />
                                {s.checkOut.location.lat.toFixed(4)},{" "}
                                {s.checkOut.location.lng.toFixed(4)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">Still out</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{formatDuration(s.duration)}</TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground">
                            {s.routePoints?.length || 0} points
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={s.status === "active" ? "default" : "secondary"}
                            className={s.status === "active" ? "bg-green-500" : ""}
                          >
                            {s.status}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRouteSessionId(s._id);
                                setActiveTab("route");
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" /> Route
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* ROUTE HISTORY TAB */}
        {activeTab === "route" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              {isAdmin && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Staff Member</label>
                  <select
                    className="border rounded px-3 py-1.5 text-sm"
                    value={userFilter}
                    onChange={(e) => {
                      setUserFilter(e.target.value);
                      setRouteSessionId("");
                    }}
                  >
                    <option value="">Select staff...</option>
                    {users?.data?.map((u: any) => (
                      <option key={u._id} value={u._id}>
                        {u.firstName} {u.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Date</label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setRouteSessionId("");
                  }}
                  className="w-auto"
                />
              </div>
            </div>

            <SessionPicker
              userId={userFilter || undefined}
              date={dateFilter}
              selected={routeSessionId}
              onSelect={setRouteSessionId}
            />

            {routeSessionId && routeSession && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Check-in: </span>
                    <strong>{format(new Date(routeSession.checkIn.time), "h:mm a")}</strong>
                  </div>
                  {routeSession.checkOut && (
                    <div>
                      <span className="text-muted-foreground">Check-out: </span>
                      <strong>{format(new Date(routeSession.checkOut.time), "h:mm a")}</strong>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Duration: </span>
                    <strong>{formatDuration(routeSession.duration)}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Route points: </span>
                    <strong>{routeSession.routePoints?.length || 0}</strong>
                  </div>
                </div>

                <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-md" />}>
                  <RouteMap
                    checkIn={{
                      lat: routeSession.checkIn.location.lat,
                      lng: routeSession.checkIn.location.lng,
                      timestamp: routeSession.checkIn.time,
                    }}
                    checkOut={
                      routeSession.checkOut
                        ? {
                            lat: routeSession.checkOut.location.lat,
                            lng: routeSession.checkOut.location.lng,
                            timestamp: routeSession.checkOut.time,
                          }
                        : undefined
                    }
                    routePoints={routeSession.routePoints || []}
                    height={450}
                  />
                </Suspense>

                {/* Photos */}
                {(routeSession.checkIn.photo || routeSession.checkOut?.photo) && (
                  <div className="flex gap-3">
                    {routeSession.checkIn.photo && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Check-in photo</p>
                        <img
                          src={routeSession.checkIn.photo}
                          alt="Check-in"
                          className="h-24 w-auto rounded border object-cover"
                        />
                      </div>
                    )}
                    {routeSession.checkOut?.photo && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Check-out photo</p>
                        <img
                          src={routeSession.checkOut.photo}
                          alt="Check-out"
                          className="h-24 w-auto rounded border object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {routeSessionId && !routeSession && (
              <div className="h-96 animate-pulse bg-muted rounded-md" />
            )}

            {!routeSessionId && (
              <div className="rounded-md border bg-muted/30 p-8 text-center text-muted-foreground text-sm">
                Select a session above to view its route on the map.
              </div>
            )}
          </div>
        )}

        {/* COVERAGE TAB */}
        {activeTab === "coverage" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm">Show last</label>
              <select
                className="border rounded px-3 py-1.5 text-sm"
                value={coverageDays}
                onChange={(e) => setCoverageDays(e.target.value)}
              >
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
              </select>
              <span className="text-sm text-muted-foreground">
                {coverageData?.total || 0} check-in locations plotted
              </span>
            </div>

            {coverageLoading ? (
              <div className="h-[500px] animate-pulse bg-muted rounded-md" />
            ) : (
              <Suspense fallback={<div className="h-[500px] animate-pulse bg-muted rounded-md" />}>
                <CoverageMap points={coverageData?.points || []} height={500} />
              </Suspense>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component: session picker for route history tab
function SessionPicker({
  userId,
  date,
  selected,
  onSelect,
}: {
  userId?: string;
  date: string;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (userId) params.set("userId", userId);

  const { data } = useSWR(`/api/field/sessions?${params}`, fetcher);
  const sessions = data?.data || [];

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No sessions found for the selected date{userId ? " and staff member" : ""}.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sessions.map((s: any) => (
        <button
          key={s._id}
          onClick={() => onSelect(s._id)}
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
            selected === s._id
              ? "border-primary bg-primary/10 text-primary"
              : "hover:border-primary/50"
          }`}
        >
          <div className="text-left">
            {s.user && (
              <div className="font-medium">
                {s.user.firstName} {s.user.lastName}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {format(new Date(s.checkIn.time), "h:mm a")}
              {s.checkOut ? ` → ${format(new Date(s.checkOut.time), "h:mm a")}` : " (active)"}
            </div>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}

// Sub-component: recent sessions for the check-in tab
function RecentSessions({ onViewRoute }: { onViewRoute: (id: string) => void }) {
  const { data, isLoading } = useSWR("/api/field/sessions?limit=5", fetcher);

  if (isLoading) return <LoadingSkeleton />;

  const sessions = data?.data || [];
  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">No sessions yet.</p>;
  }

  return (
    <div className="space-y-2">
      {sessions.map((s: any) => (
        <div
          key={s._id}
          className="flex items-center justify-between rounded border p-2 text-sm"
        >
          <div>
            <div className="font-medium">
              {format(new Date(s.checkIn.time), "MMM d, h:mm a")}
            </div>
            <div className="text-xs text-muted-foreground">
              {s.duration ? formatDuration(s.duration) : "Active"} &bull;{" "}
              {s.routePoints?.length || 0} pts
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={s.status === "active" ? "default" : "secondary"}
              className={`text-[10px] ${s.status === "active" ? "bg-green-500" : ""}`}
            >
              {s.status}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => onViewRoute(s._id)}
            >
              <MapPin className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

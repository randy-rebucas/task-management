"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { usePermissions } from "@/features/auth/use-permissions";

export function VisitLogTable() {
    const router = useRouter();
    const { can } = usePermissions();
    const isAdmin = can("visit_logs:view_all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [userFilter, setUserFilter] = useState("");
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    if (search) params.set("search", search);
    if (isAdmin && userFilter) params.set("userId", userFilter);
    const { data, isLoading } = useSWR(`/api/visit-logs?${params}`, (url) => fetch(url).then(r => r.json()));
    const { data: usersData } = useSWR(isAdmin ? "/api/users?limit=100" : null, (url) => fetch(url).then(r => r.json()));

    return (
        <div>
            <div className="mb-4 flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Input
                        placeholder="Search places, people, purpose..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="pl-3"
                    />
                </div>
                {isAdmin && (
                    <select
                        className="border rounded px-3 py-1.5 text-sm"
                        value={userFilter}
                        onChange={e => { setUserFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">All Staff</option>
                        {usersData?.data?.map((u: any) => (
                            <option key={u._id} value={u._id}>
                                {u.firstName} {u.lastName}
                            </option>
                        ))}
                    </select>
                )}
            </div>
            <div className="rounded-md border">
                {isLoading ? (
                    <div className="p-8"><LoadingSkeleton /></div>
                ) : data?.data?.length === 0 ? (
                    <EmptyState
                        title="No visit logs found"
                        description="Create a new visit log to get started."
                    />
                ) : (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    {isAdmin && <TableHead>Submitted By</TableHead>}
                                    <TableHead>Places Visited</TableHead>
                                    <TableHead>People Met</TableHead>
                                    <TableHead>Purpose</TableHead>
                                    <TableHead>Outcome</TableHead>
                                    <TableHead>Next Action</TableHead>
                                    <TableHead>Photos</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.data?.map((log: any) => (
                                    <TableRow
                                        key={log._id}
                                        className="hover:bg-muted/40 transition-colors cursor-pointer"
                                        onClick={() => router.push(`/visit-logs/${log._id}`)}
                                        tabIndex={0}
                                        role="link"
                                        aria-label={`View visit log ${log._id}`}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <TableCell>{format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}</TableCell>
                                        {isAdmin && (
                                            <TableCell className="text-sm">
                                                {log.user ? `${log.user.firstName} ${log.user.lastName}` : "—"}
                                            </TableCell>
                                        )}
                                        <TableCell className="max-w-[160px] truncate" title={log.placesVisited}>{log.placesVisited}</TableCell>
                                        <TableCell className="max-w-[120px] truncate" title={log.peopleMet}>{log.peopleMet}</TableCell>
                                        <TableCell className="max-w-[120px] truncate" title={log.purpose}>{log.purpose}</TableCell>
                                        <TableCell className="max-w-[120px] truncate" title={log.outcome}>{log.outcome}</TableCell>
                                        <TableCell className="max-w-[120px] truncate" title={log.nextAction}>{log.nextAction}</TableCell>
                                        <TableCell>
                                            {log.photos && log.photos.length > 0 ? (
                                                <span className="inline-flex items-center gap-1 text-xs">
                                                    <span className="rounded bg-muted px-2 py-0.5">{log.photos.length} photo{log.photos.length > 1 ? "s" : ""}</span>
                                                    <span className="flex flex-wrap gap-1">
                                                        {log.photos.slice(0, 2).map((url: string, idx: number) => (
                                                            <Image key={url + idx} src={url} alt="Visit photo" width={36} height={28} className="rounded border" />
                                                        ))}
                                                    </span>
                                                </span>
                                            ) : <span className="text-muted-foreground">—</span>}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="flex justify-end items-center space-x-2 p-2">
                            <span className="text-sm text-muted-foreground">
                                Page {data?.page || 1} of {data?.totalPages || 1} ({data?.total || 0} logs)
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage(page - 1)}
                            >Previous</Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= (data?.totalPages || 1)}
                                onClick={() => setPage(page + 1)}
                            >Next</Button>

                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

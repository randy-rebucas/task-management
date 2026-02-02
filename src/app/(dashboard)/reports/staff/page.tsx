"use client";

import { useState } from "react";
import useSWR from "swr";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Download, Users } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function StaffWorkloadReportPage() {
  const [department, setDepartment] = useState("");

  const params = new URLSearchParams();
  if (department) params.set("department", department);

  const { data, isLoading } = useSWR(`/api/reports/staff-workload?${params}`, fetcher);
  const { data: departments } = useSWR("/api/departments", fetcher);

  async function handleExport() {
    try {
      const exportParams = new URLSearchParams();
      exportParams.set("type", "staff-workload");
      if (department) exportParams.set("department", department);

      const res = await fetch(`/api/reports/export?${exportParams}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `staff-workload-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report exported successfully");
    } catch {
      toast.error("Failed to export report");
    }
  }

  return (
    <div>
      <PageHeader
        title="Staff Workload Report"
        description="View task distribution across staff members"
        action={
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <div className="mb-6">
        <Select value={department} onValueChange={(v) => setDepartment(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments?.map((d: { _id: string; name: string }) => (
              <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : data?.staff?.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No data available"
          description="No staff workload data found for the selected filters"
        />
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data?.staff?.length || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Tasks per Person</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data?.avgTasks?.toFixed(1) || "0.0"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours Logged</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data?.totalHours?.toFixed(1) || "0.0"}h</p>
              </CardContent>
            </Card>
          </div>

          {/* Staff Table */}
          <Card>
            <CardHeader>
              <CardTitle>Staff Workload</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Total Tasks</TableHead>
                      <TableHead className="text-right">In Progress</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Overdue</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="w-[120px]">Completion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.staff?.map(
                      (member: {
                        _id: string;
                        firstName: string;
                        lastName: string;
                        department?: string;
                        totalTasks: number;
                        inProgress: number;
                        completed: number;
                        overdue: number;
                        hoursLogged: number;
                      }) => {
                        const completionRate = member.totalTasks
                          ? (member.completed / member.totalTasks) * 100
                          : 0;
                        return (
                          <TableRow key={member._id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7">
                                  <AvatarFallback className="text-[10px]">
                                    {member.firstName[0]}{member.lastName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">
                                  {member.firstName} {member.lastName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{member.department || "—"}</TableCell>
                            <TableCell className="text-right">{member.totalTasks}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">{member.inProgress}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="default">{member.completed}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {member.overdue > 0 ? (
                                <Badge variant="destructive">{member.overdue}</Badge>
                              ) : (
                                <span className="text-sm">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {member.hoursLogged.toFixed(1)}h
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={completionRate} className="h-2" />
                                <span className="text-xs text-muted-foreground w-10 text-right">
                                  {completionRate.toFixed(0)}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      }
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

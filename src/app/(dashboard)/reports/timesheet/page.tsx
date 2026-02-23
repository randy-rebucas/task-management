"use client";

import { useState } from "react";
import useSWR from "@/lib/swr-compat";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Download, Clock, Calendar, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "exceljs";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function initials(row: { firstName?: string; lastName?: string } | undefined): string {
  if (!row) return "?";
  return `${(row.firstName ?? " ")[0]}${(row.lastName ?? " ")[0]}`.toUpperCase();
}

function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function TimesheetReportPage() {
  const [days, setDays] = useState("30");

  const { data, isLoading } = useSWR(
    `/api/reports/timesheet?days=${days}`,
    fetcher
  );

  const rows: Array<{
    userId: string;
    date: string;
    totalMinutes: number;
    totalHours: number;
    logCount: number;
    user: { firstName: string; lastName: string; email: string };
  }> = data?.data?.rows ?? [];

  const summary: Array<{
    user: { _id: string; firstName: string; lastName: string; email: string };
    totalMinutes: number;
    totalHours: number;
    daysWorked: number;
  }> = data?.data?.summary ?? [];

  async function handleExport() {
    try {
      const workbook = new XLSX.Workbook();

      // Summary sheet
      const summarySheet = workbook.addWorksheet("Summary");
      summarySheet.columns = [
        { header: "Name",         key: "name",        width: 25 },
        { header: "Email",        key: "email",       width: 30 },
        { header: "Days Worked",  key: "daysWorked",  width: 14 },
        { header: "Total Hours",  key: "totalHours",  width: 14 },
        { header: "Total Minutes",key: "totalMinutes",width: 16 },
      ];
      summarySheet.getRow(1).font = { bold: true };
      for (const s of summary) {
        summarySheet.addRow({
          name: `${s.user.firstName} ${s.user.lastName}`,
          email: s.user.email,
          daysWorked: s.daysWorked,
          totalHours: s.totalHours,
          totalMinutes: s.totalMinutes,
        });
      }

      // Detail sheet
      const detailSheet = workbook.addWorksheet("Daily Detail");
      detailSheet.columns = [
        { header: "Date",          key: "date",         width: 14 },
        { header: "Name",          key: "name",         width: 25 },
        { header: "Email",         key: "email",        width: 30 },
        { header: "Log Entries",   key: "logCount",     width: 14 },
        { header: "Total Hours",   key: "totalHours",   width: 14 },
        { header: "Total Minutes", key: "totalMinutes", width: 16 },
      ];
      detailSheet.getRow(1).font = { bold: true };
      for (const r of rows) {
        detailSheet.addRow({
          date: r.date,
          name: `${r.user.firstName} ${r.user.lastName}`,
          email: r.user.email,
          logCount: r.logCount,
          totalHours: r.totalHours,
          totalMinutes: r.totalMinutes,
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `timesheet-report-${days}d.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Timesheet exported successfully");
    } catch {
      toast.error("Failed to export timesheet");
    }
  }

  return (
    <div>
      <PageHeader
        title="Timesheet Report"
        description="Time logged per staff member across tasks"
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={isLoading || summary.length === 0}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export Excel
          </Button>
        }
      />

      {/* Controls */}
      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Period:</span>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingSkeleton />}

      {!isLoading && summary.length === 0 && (
        <EmptyState
          icon={<Clock className="h-12 w-12" />}
          title="No time logs found"
          description={`No time entries were recorded in the last ${days} days.`}
        />
      )}

      {!isLoading && summary.length > 0 && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  Staff with logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Total hours (team)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {fmtHours(summary.reduce((s, r) => s + r.totalMinutes, 0))}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Period
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{days}d</p>
              </CardContent>
            </Card>
          </div>

          {/* Per-staff summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Staff Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead className="text-right">Days Logged</TableHead>
                    <TableHead className="text-right">Total Time</TableHead>
                    <TableHead className="text-right">Avg / Day</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.map((s) => (
                    <TableRow key={String(s.user._id)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs">
                              {initials(s.user)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {s.user.firstName} {s.user.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">{s.user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{s.daysWorked}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {fmtHours(s.totalMinutes)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {fmtHours(Math.round(s.totalMinutes / s.daysWorked))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Daily detail */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Detail</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Staff Member</TableHead>
                    <TableHead className="text-right">Entries</TableHead>
                    <TableHead className="text-right">Time Logged</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={`${r.userId}-${r.date}-${i}`}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(parseISO(r.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.user.firstName} {r.user.lastName}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {r.logCount}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {fmtHours(r.totalMinutes)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

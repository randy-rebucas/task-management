"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, AlertTriangle, ArrowRight } from "lucide-react";

const reports = [
  {
    title: "Task Summary",
    description: "Overview of tasks by status, priority, and category with charts and trends.",
    href: "/reports/tasks",
    icon: BarChart3,
  },
  {
    title: "Staff Workload",
    description: "View task distribution and workload across staff members and departments.",
    href: "/reports/staff",
    icon: Users,
  },
  {
    title: "Overdue Tasks",
    description: "Track overdue tasks, analyze delays, and identify bottlenecks.",
    href: "/reports/overdue",
    icon: AlertTriangle,
  },
];

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="View reports and analytics for your task management"
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.href} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <report.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{report.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">{report.description}</CardDescription>
              <Button variant="outline" asChild className="w-full">
                <Link href={report.href}>
                  View Report <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

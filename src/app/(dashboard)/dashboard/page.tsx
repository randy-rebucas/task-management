"use client";

import { usePermissions } from "@/hooks/use-permissions";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { ManagerDashboard } from "@/components/dashboard/manager-dashboard";
import { StaffDashboard } from "@/components/dashboard/staff-dashboard";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

export default function DashboardPage() {
  const { can, isLoading } = usePermissions();

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your task management system" />
      {can("dashboard:admin") ? (
        <AdminDashboard />
      ) : can("dashboard:manager") ? (
        <ManagerDashboard />
      ) : (
        <StaffDashboard />
      )}
    </div>
  );
}

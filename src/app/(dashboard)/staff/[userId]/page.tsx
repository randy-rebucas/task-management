"use client";

import { use } from "react";
import useSWR from "swr";
import Link from "next/link";
import { usePermissions } from "@/hooks/use-permissions";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Edit, Mail, Phone, Building2, Briefcase } from "lucide-react";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function StaffDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const { can } = usePermissions();
  const { data: user, isLoading } = useSWR(`/api/users/${userId}`, fetcher);

  if (isLoading) return <LoadingSkeleton />;
  if (!user) return <div>Staff member not found</div>;

  return (
    <div>
      <PageHeader
        title={`${user.firstName} ${user.lastName}`}
        description={user.jobTitle || undefined}
        action={
          can("users:update") ? (
            <Button asChild variant="outline">
              <Link href={`/staff/${userId}/edit`}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-2xl">
                    {user.firstName[0]}{user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-3 flex-1">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {user.firstName} {user.lastName}
                    </h3>
                    {user.jobTitle && (
                      <p className="text-sm text-muted-foreground">{user.jobTitle}</p>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${user.email}`} className="text-primary hover:underline">
                        {user.email}
                      </a>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    {user.department && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{user.department.name}</span>
                      </div>
                    )}
                    {user.jobTitle && (
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span>{user.jobTitle}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assigned Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View tasks assigned to this staff member in the{" "}
                <Link href={`/tasks?assignee=${userId}`} className="text-primary hover:underline">
                  tasks page
                </Link>.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={user.isActive ? "default" : "outline"}>
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <Separator />
              <div>
                <span className="text-sm text-muted-foreground">Roles</span>
                <div className="mt-2 flex flex-wrap gap-1">
                  {user.roles?.map((r: { _id: string; name: string }) => (
                    <Badge key={r._id} variant="secondary">
                      {r.name}
                    </Badge>
                  ))}
                  {user.roles?.length === 0 && (
                    <span className="text-sm text-muted-foreground">No roles assigned</span>
                  )}
                </div>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">
                  {format(new Date(user.createdAt), "MMM d, yyyy")}
                </span>
              </div>
              {user.lastLogin && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Login</span>
                    <span className="text-sm">
                      {format(new Date(user.lastLogin), "MMM d, yyyy h:mm a")}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

"use client";

import useSWR from "@/lib/swr-compat";
import Link from "next/link";
import { Users, TrendingUp, Briefcase, UserPlus, KanbanSquare, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEAL_STAGES } from "@/config/constants";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CRMPage() {
  const { data: leadsData } = useSWR("/api/crm/leads?limit=5", fetcher);
  const { data: clientsData } = useSWR("/api/crm/clients?limit=5", fetcher);
  const { data: pipeline } = useSWR("/api/crm/pipeline", fetcher);

  const leads = leadsData?.data ?? [];
  const clients = clientsData?.data ?? [];
  const stages = pipeline ?? [];

  const totalLeads = leadsData?.total ?? 0;
  const totalClients = clientsData?.total ?? 0;
  const totalDeals = stages.reduce((s: number, st: any) => s + st.count, 0);
  const totalValue = stages.reduce((s: number, st: any) => s + st.totalValue, 0);
  const wonDeals = stages.find((s: any) => s.stage === "closed_won");
  const closedLost = stages.find((s: any) => s.stage === "closed_lost");
  const closedTotal = (wonDeals?.count ?? 0) + (closedLost?.count ?? 0);
  const winRate =
    closedTotal > 0 ? Math.round(((wonDeals?.count ?? 0) / closedTotal) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CRM Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage leads, clients, and your sales pipeline
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/crm/leads/new">
              <UserPlus className="h-4 w-4 mr-1" /> New Lead
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/crm/pipeline">
              <KanbanSquare className="h-4 w-4 mr-1" /> Pipeline
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserPlus className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{totalLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clients</p>
                <p className="text-2xl font-bold">{totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Briefcase className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Deals</p>
                <p className="text-2xl font-bold">{totalDeals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">{winRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline snapshot */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Pipeline Snapshot</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/crm/pipeline">
              View Board <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {DEAL_STAGES.map((stage) => {
              const s = stages.find((st: any) => st.stage === stage.value);
              return (
                <div key={stage.value} className="flex-shrink-0 min-w-[130px] border rounded-lg p-3 text-center">
                  <Badge className={`${stage.color} mb-2 text-xs`}>{stage.label}</Badge>
                  <p className="text-xl font-bold">{s?.count ?? 0}</p>
                  <p className="text-xs text-muted-foreground">
                    ₱{((s?.totalValue ?? 0) / 1000).toFixed(0)}k
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Leads</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/crm/leads">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {leads.length === 0 && (
              <p className="text-sm text-muted-foreground">No leads yet.</p>
            )}
            {leads.map((lead: any) => (
              <Link
                key={lead._id}
                href={`/crm/leads/${lead._id}`}
                className="flex items-center justify-between hover:bg-muted/50 rounded p-2 -mx-2"
              >
                <div>
                  <p className="text-sm font-medium">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.company || "—"}</p>
                </div>
                <Badge
                  className={
                    lead.status === "converted"
                      ? "bg-emerald-100 text-emerald-800"
                      : lead.status === "qualified"
                      ? "bg-green-100 text-green-800"
                      : "bg-blue-100 text-blue-800"
                  }
                >
                  {lead.status}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Clients</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/crm/clients">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {clients.length === 0 && (
              <p className="text-sm text-muted-foreground">No clients yet.</p>
            )}
            {clients.map((client: any) => (
              <Link
                key={client._id}
                href={`/crm/clients/${client._id}`}
                className="flex items-center justify-between hover:bg-muted/50 rounded p-2 -mx-2"
              >
                <div>
                  <p className="text-sm font-medium">{client.name}</p>
                  <p className="text-xs text-muted-foreground">{client.company || "—"}</p>
                </div>
                <Badge
                  className={
                    client.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }
                >
                  {client.status}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

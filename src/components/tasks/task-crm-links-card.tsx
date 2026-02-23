"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase } from "lucide-react";
import { DEAL_STAGES } from "@/config/constants";

interface CrmEntity {
  _id?: string;
  name?: string;
  company?: string;
  status?: string;
  title?: string;
  stage?: string;
}

interface TaskCrmLinksCardProps {
  lead?: CrmEntity | string;
  client?: CrmEntity | string;
  deal?: CrmEntity | string;
}

export function TaskCrmLinksCard({ lead, client, deal }: TaskCrmLinksCardProps) {
  if (!lead && !client && !deal) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Briefcase className="h-4 w-4" /> CRM Links
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {lead && typeof lead === "object" && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Lead</p>
            <Link
              href={`/crm/leads/${lead._id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {lead.name || "View Lead"}
            </Link>
            {lead.status && (
              <span className="ml-2 text-xs text-muted-foreground">({lead.status})</span>
            )}
          </div>
        )}
        {client && typeof client === "object" && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Client</p>
            <Link
              href={`/crm/clients/${client._id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {client.name || "View Client"}
            </Link>
            {client.company && (
              <span className="ml-2 text-xs text-muted-foreground">{client.company}</span>
            )}
          </div>
        )}
        {deal && typeof deal === "object" && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Deal</p>
            <Link
              href={`/crm/deals/${deal._id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {deal.title || "View Deal"}
            </Link>
            {deal.stage && (() => {
              const stageCfg = DEAL_STAGES.find((s) => s.value === deal.stage);
              return stageCfg ? (
                <Badge className={`ml-2 text-xs ${stageCfg.color}`}>{stageCfg.label}</Badge>
              ) : null;
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

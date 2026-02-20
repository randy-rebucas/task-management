import { PageHeader } from "@/components/shared/page-header";
import { VisitLogTable } from "@/components/visit-logs/visit-log-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function VisitLogsPage() {
  return (
    <div>
      <PageHeader
        title="Visit Logs"
        description="Submit and review your visit logs"
        action={
          <Button asChild>
            <Link href="/visit-logs/new">
              <Plus className="mr-2 h-4 w-4" /> New Visit Log
            </Link>
          </Button>
        }
      />
      <div className="mt-6">
        <VisitLogTable />
      </div>
    </div>
  );
}

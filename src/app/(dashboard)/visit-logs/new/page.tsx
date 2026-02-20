import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisitLogForm } from "@/components/visit-logs/visit-log-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NewVisitLogPage() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <PageHeader
        title="New Visit Log"
        description="Record a new visit log entry."
        action={
          <Button asChild variant="outline">
            <Link href="/visit-logs"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
          </Button>
        }
      />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Visit Log Details</CardTitle>
        </CardHeader>
        <CardContent>
          <VisitLogForm />
        </CardContent>
      </Card>
    </div>
  );
}

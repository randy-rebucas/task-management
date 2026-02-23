"use client";
import { use } from "react";
import useSWR from "swr";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";

export default function VisitLogDetailPage({ params }: { params: Promise<{ visitId: string }> }) {
  const { visitId } = use(params);
  const { data, isLoading, error } = useSWR(`/api/visit-logs/${visitId}`, (url) => fetch(url).then(r => r.json()));
  const log = data?.data;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <PageHeader
        title="Visit Log Details"
        description={log ? `Visit to ${log.placesVisited}` : "View details of this visit log."}
        action={
          <Button asChild variant="outline">
            <Link href="/visit-logs"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
          </Button>
        }
      />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{log?.placesVisited || "Visit Log"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-destructive">Error loading visit log.</div>
          ) : !log ? (
            <div className="text-muted-foreground">Visit log not found.</div>
          ) : (
            <>
              <div><b>Date:</b> {log.createdAt && new Date(log.createdAt).toLocaleString()}</div>
              <div><b>People met:</b> {log.peopleMet}</div>
              <div><b>Purpose:</b> {log.purpose}</div>
              <div><b>Outcome:</b> {log.outcome}</div>
              <div><b>Next action:</b> {log.nextAction}</div>
              {log.photos && log.photos.length > 0 && (
                <div>
                  <b>Photos:</b>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {log.photos.map((url: string, idx: number) => (
                      <Image key={url+idx} src={url} alt="Visit photo" width={120} height={90} className="rounded border" />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

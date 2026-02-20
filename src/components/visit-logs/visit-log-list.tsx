"use client";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

export function VisitLogList() {
  const { data, isLoading, error } = useSWR("/api/visit-logs", (url) => fetch(url).then(r => r.json()));
  if (isLoading) return <div>Loading visit logs...</div>;
  if (error) return <div>Error loading visit logs.</div>;
  if (!data || !Array.isArray(data.data) || data.data.length === 0) return <div>No visit logs found.</div>;

  return (
    <div className="space-y-6 mt-8">
      {data.data.map((log: any) => (
        <Card key={log._id}>
          <CardHeader>
            <CardTitle className="text-lg">{log.placesVisited}</CardTitle>
            <div className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><b>People met:</b> {log.peopleMet}</div>
            <div><b>Purpose:</b> {log.purpose}</div>
            <div><b>Outcome:</b> {log.outcome}</div>
            <div><b>Next action:</b> {log.nextAction}</div>
            {log.photos && log.photos.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {log.photos.map((url: string, idx: number) => (
                  <Image key={url+idx} src={url} alt="Visit photo" width={120} height={90} className="rounded border" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

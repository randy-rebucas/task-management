"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, FileText, CheckCircle2, XCircle, Download } from "lucide-react";
import { toast } from "sonner";

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; email: string; error: string }[];
}

export default function StaffImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string[][]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    setFile(selected);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());
      const parsed = lines.slice(0, 6).map((line) =>
        line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
      );
      setPreview(parsed);
    };
    reader.readAsText(selected);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/users/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Import failed");
      }

      const data: ImportResult = await res.json();
      setResult(data);

      if (data.success > 0) {
        toast.success(`Successfully imported ${data.success} staff member(s)`);
      }
      if (data.failed > 0) {
        toast.error(`${data.failed} row(s) failed to import`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setUploading(false);
    }
  }

  function downloadTemplate() {
    const headers = "email,password,firstName,lastName,phone,jobTitle,department,roles";
    const example = "john@example.com,Password123,John,Doe,555-0100,Manager,Engineering,admin";
    const csv = `${headers}\n${example}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "staff-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Import Staff"
        description="Import staff members from a CSV file"
      />

      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>CSV Template</CardTitle>
            <CardDescription>
              Download the template to see the expected format for importing staff members.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" /> Download Template
            </Button>
            <div className="mt-4 text-sm text-muted-foreground">
              <p className="font-medium mb-1">Required columns:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>email - Staff email address</li>
                <li>password - Initial password (min 8 characters)</li>
                <li>firstName - First name</li>
                <li>lastName - Last name</li>
              </ul>
              <p className="font-medium mt-3 mb-1">Optional columns:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>phone - Phone number</li>
                <li>jobTitle - Job title</li>
                <li>department - Department name</li>
                <li>roles - Comma-separated role names</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <>
                  <FileText className="h-10 w-10 text-primary mb-2" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="font-medium">Click to select a CSV file</p>
                  <p className="text-sm text-muted-foreground">or drag and drop</p>
                </>
              )}
            </div>

            {preview.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Preview (first 5 rows):</p>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {preview[0]?.map((header, i) => (
                          <TableHead key={i} className="text-xs whitespace-nowrap">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.slice(1).map((row, i) => (
                        <TableRow key={i}>
                          {row.map((cell, j) => (
                            <TableCell key={j} className="text-xs whitespace-nowrap">
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? "Importing..." : "Import Staff"}
              </Button>
              <Button variant="outline" onClick={() => router.push("/staff")}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Import Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                {result.success > 0 && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      {result.success} staff member(s) imported successfully
                    </AlertDescription>
                  </Alert>
                )}
                {result.failed > 0 && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      {result.failed} row(s) failed to import
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {result.errors?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Errors:</p>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.errors.map((err, i) => (
                          <TableRow key={i}>
                            <TableCell>{err.row}</TableCell>
                            <TableCell>{err.email}</TableCell>
                            <TableCell className="text-destructive">{err.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

import { NextResponse } from "next/server";
import { withPermission, apiError } from "@/lib/api-helpers";
import { exportReportSchema } from "@/lib/validators";
import Task from "@/models/Task";
import ExcelJS from "exceljs";

export const POST = withPermission("reports:export", async (req) => {
  const body = await req.json();
  const parsed = exportReportSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const { format } = parsed.data;

  // Fetch data based on report type
  const tasks = await Task.find({ isArchived: false })
    .populate("status", "name")
    .populate("assignees", "firstName lastName email")
    .populate("createdBy", "firstName lastName")
    .populate("department", "name")
    .sort({ createdAt: -1 })
    .lean();

  const rows = tasks.map((t) => ({
    "Task #": t.taskNumber,
    Title: t.title,
    Status: (t.status as { name?: string })?.name || "",
    Priority: t.priority,
    Assignees: Array.isArray(t.assignees)
      ? (t.assignees as any[])
        .map((a) =>
          a && typeof a === "object" && "firstName" in a && "lastName" in a
            ? `${a.firstName} ${a.lastName}`
            : ""
        )
        .filter(Boolean)
        .join(", ")
      : "",
    "Created By":
      t.createdBy && typeof t.createdBy === "object" && "firstName" in t.createdBy && "lastName" in t.createdBy
        ? `${(t.createdBy as any).firstName} ${(t.createdBy as any).lastName}`
        : "",
    Department: (t.department as { name?: string })?.name || "",
    "Due Date": t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "",
    "Created At": new Date(t.createdAt).toLocaleDateString(),
  }));

  if (format === "csv") {
    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => `"${String((r as Record<string, string>)[h]).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=report.csv",
      },
    });
  }

  if (format === "excel") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Report");

    if (rows.length > 0) {
      sheet.columns = Object.keys(rows[0]).map((key) => ({
        header: key,
        key,
        width: 20,
      }));
      rows.forEach((r) => sheet.addRow(r));

      // Style header row
      sheet.getRow(1).font = { bold: true };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=report.xlsx",
      },
    });
  }

  // PDF - simple table
  if (format === "pdf") {
    // Using a simple approach with pdfmake
    const pdfMake = await import("pdfmake/build/pdfmake");
    const pdfFonts = await import("pdfmake/build/vfs_fonts");
    (pdfMake as unknown as { vfs: unknown }).vfs = (pdfFonts as unknown as { pdfMake: { vfs: unknown } }).pdfMake.vfs;

    const headers = Object.keys(rows[0] || {});
    const tableBody = [
      headers.map((h) => ({ text: h, bold: true })),
      ...rows.map((r) => headers.map((h) => String((r as Record<string, string>)[h]))),
    ];

    const docDefinition = {
      pageOrientation: "landscape" as const,
      content: [
        { text: "Task Report", style: "header" },
        {
          table: {
            headerRows: 1,
            body: tableBody,
          },
          layout: "lightHorizontalLines",
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] as [number, number, number, number] },
      },
    };

    return new Promise<NextResponse>((resolve) => {
      const pdfDoc = (pdfMake as unknown as { createPdf: (def: unknown) => { getBuffer: (cb: (buffer: Buffer) => void) => void } }).createPdf(docDefinition);
      pdfDoc.getBuffer((buffer: Buffer) => {
        // Convert Node.js Buffer to Buffer for NextResponse compatibility
        const nodeBuffer = Buffer.from(buffer);
        resolve(
          new NextResponse(nodeBuffer, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": "attachment; filename=report.pdf",
            },
          })
        );
      });
    });
  }

  return apiError("Unsupported format");
});

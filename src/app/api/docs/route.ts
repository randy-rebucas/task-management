import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";

const DOCS_ROOT = path.join(process.cwd(), "docs");

// Allowed base folders and root-level files to prevent path traversal
const ALLOWED_FOLDERS = ["knowledgebase", "workflows"];
const ALLOWED_ROOT_FILES = ["ui-style-guide", "README"];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const filePath = url.searchParams.get("path");

  // Return directory listing when no file path is given
  if (!filePath) {
    const structure: Record<string, string[]> = {};
    for (const folder of ALLOWED_FOLDERS) {
      const folderPath = path.join(DOCS_ROOT, folder);
      if (fs.existsSync(folderPath)) {
        structure[folder] = fs
          .readdirSync(folderPath)
          .filter((f) => f.endsWith(".md"))
          .map((f) => f.replace(".md", ""));
      }
    }
    return NextResponse.json({ structure });
  }

  // Validate path to prevent traversal
  const normalized = path.normalize(filePath).replace(/\\/g, "/");
  const parts = normalized.split("/");
  const isFolder = ALLOWED_FOLDERS.includes(parts[0]);
  const isRootFile = parts.length === 1 && ALLOWED_ROOT_FILES.includes(parts[0]);
  if ((!isFolder && !isRootFile) || normalized.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const fullPath = path.join(DOCS_ROOT, `${normalized}.md`);
  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  return NextResponse.json({ content, path: normalized });
}

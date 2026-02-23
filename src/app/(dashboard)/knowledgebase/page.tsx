"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BookOpen, FileText, Search, ChevronRight, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocStructure {
  structure: Record<string, string[]>;
}

const FOLDER_LABELS: Record<string, string> = {
  knowledgebase: "Knowledgebase",
  workflows: "Workflows",
};

const FILE_LABELS: Record<string, string> = {
  README: "Knowledgebase Overview",
  "ui-style-guide": "UI Style Guide",
  "organization-overview": "Organization Overview",
  "roles-and-responsibilities": "Roles & Responsibilities",
  "system-guide": "System Guide",
  "permissions-and-access": "Permissions & Access",
  "onboarding-guide": "Onboarding Guide",
  "escalation-policy": "Escalation Policy",
  glossary: "Glossary",
  faqs: "FAQs",
  "business-operations": "Business Operations",
  "customer-success": "Customer Success",
  "finance-legal": "Finance & Legal",
  "marketing-growth": "Marketing & Growth",
  "sales-partnerships": "Sales & Partnerships",
  "service-provider-onboarding-quality-control": "SP Onboarding & QC",
  "tech-product": "Tech & Product",
  "tech-product-user-journey": "Tech & Product – User Journey",
  "academy-training-division": "Academy / Training Division",
  "daily-operations": "Daily Operations & Routine",
  "user-journey": "User Journey",
};

/**
 * Resolve a relative markdown link against the current document path.
 * e.g. currentPath="knowledgebase/README", href="./organization-overview.md"
 *   → "knowledgebase/organization-overview"
 * e.g. currentPath="knowledgebase/README", href="../workflows/business-operations.md"
 *   → "workflows/business-operations"
 */
function resolveDocLink(currentPath: string, href: string): string | null {
  if (!href || href.startsWith("http") || href.startsWith("#")) return null;
  if (!href.endsWith(".md")) return null;

  // Build base directory from current path
  const parts = currentPath.split("/");
  parts.pop(); // remove filename, keep directory
  const base = parts; // e.g. ["knowledgebase"]

  // Split the href and resolve . and ..
  const hrefParts = href.replace(/\.md$/, "").split("/");
  const resolved = [...base];
  for (const part of hrefParts) {
    if (part === ".") continue;
    if (part === "..") resolved.pop();
    else resolved.push(part);
  }
  return resolved.join("/");
}

function formatLabel(slug: string): string {
  return (
    FILE_LABELS[slug] ||
    slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

export default function KnowledgebasePage() {
  const [structure, setStructure] = useState<Record<string, string[]>>({});
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [treeLoading, setTreeLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    knowledgebase: true,
    workflows: false,
  });

  useEffect(() => {
    fetch("/api/docs")
      .then((r) => r.json())
      .then((data: DocStructure) => {
        setStructure(data.structure || {});
        // Auto-open knowledgebase README
        const defaultPath = "knowledgebase/README";
        loadDoc(defaultPath);
        setSelectedPath(defaultPath);
      })
      .finally(() => setTreeLoading(false));
  }, []);

  function loadDoc(docPath: string) {
    setLoading(true);
    setContent("");
    fetch(`/api/docs?path=${encodeURIComponent(docPath)}`)
      .then((r) => r.json())
      .then((data) => {
        setContent(data.content || "_Document not found._");
      })
      .catch(() => setContent("_Failed to load document._"))
      .finally(() => setLoading(false));
  }

  function handleSelect(folder: string, file: string) {
    const p = `${folder}/${file}`;
    setSelectedPath(p);
    loadDoc(p);
  }

  function toggleFolder(folder: string) {
    setOpenFolders((prev) => ({ ...prev, [folder]: !prev[folder] }));
  }

  const handleInternalLink = useCallback(
    (href: string) => {
      if (!selectedPath) return;
      const resolved = resolveDocLink(selectedPath, href);
      if (!resolved) return;
      // Auto-expand the target folder in sidebar
      const folder = resolved.split("/")[0];
      setOpenFolders((prev) => ({ ...prev, [folder]: true }));
      setSelectedPath(resolved);
      loadDoc(resolved);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPath]
  );

  const filteredStructure = Object.entries(structure).reduce(
    (acc, [folder, files]) => {
      const filtered = files.filter((f) =>
        formatLabel(f).toLowerCase().includes(search.toLowerCase())
      );
      if (filtered.length > 0 || folder.toLowerCase().includes(search.toLowerCase())) {
        acc[folder] = search ? filtered : files;
      }
      return acc;
    },
    {} as Record<string, string[]>
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      <PageHeader
        title="Knowledgebase"
        description="Browse internal documentation, workflows, and guides."
      />

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Sidebar */}
        <Card className="w-64 shrink-0 flex flex-col overflow-hidden">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search docs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
          <ScrollArea className="h-0 flex-1">
            <div className="p-2">
              {treeLoading ? (
                <div className="space-y-2 p-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-6 rounded bg-muted animate-pulse" />
                  ))}
                </div>
              ) : (
                Object.entries(filteredStructure).map(([folder, files]) => (
                  <div key={folder} className="mb-1">
                    <button
                      onClick={() => toggleFolder(folder)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm font-medium hover:bg-muted transition-colors"
                    >
                      <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 text-left">{FOLDER_LABELS[folder] || folder}</span>
                      <ChevronRight
                        className={cn(
                          "h-3 w-3 text-muted-foreground transition-transform",
                          openFolders[folder] && "rotate-90"
                        )}
                      />
                    </button>
                    {openFolders[folder] && (
                      <div className="ml-4 mt-0.5 space-y-0.5">
                        {files.map((file) => {
                          const p = `${folder}/${file}`;
                          const isActive = selectedPath === p;
                          return (
                            <button
                              key={file}
                              onClick={() => handleSelect(folder, file)}
                              className={cn(
                                "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors text-left",
                                isActive && "bg-primary/10 text-primary font-medium"
                              )}
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <span className="truncate">{formatLabel(file)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Content */}
        <Card className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <ScrollArea className="h-0 flex-1">
            <CardContent className="p-6">
              {loading ? (
                <div className="space-y-4">
                  <div className="h-8 w-1/2 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-full rounded bg-muted animate-pulse" />
                  <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-4/6 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-full rounded bg-muted animate-pulse" />
                  <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                </div>
              ) : content ? (
                <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-table:text-sm">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-2xl font-bold mb-4 border-b pb-2">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-xl font-semibold mt-8 mb-3">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-lg font-semibold mt-6 mb-2">{children}</h3>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-4">
                          <table className="min-w-full border border-border rounded-md text-sm">{children}</table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="px-3 py-2 bg-muted font-medium text-left border-b border-border">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="px-3 py-2 border-b border-border">{children}</td>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-muted p-4 rounded-md text-sm font-mono overflow-x-auto my-4">
                          {children}
                        </pre>
                      ),
                      code: ({ children, ...props }: { children?: React.ReactNode; className?: string }) => (
                        <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...props}>
                          {children}
                        </code>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground my-4">
                          {children}
                        </blockquote>
                      ),
                      a: ({ href, children }) => {
                        const isExternal = href?.startsWith("http");
                        const isDocLink = href?.endsWith(".md");
                        if (isDocLink) {
                          return (
                            <button
                              onClick={() => href && handleInternalLink(href)}
                              className="text-primary underline underline-offset-2 hover:opacity-80 text-left"
                            >
                              {children}
                            </button>
                          );
                        }
                        return (
                          <a
                            href={href}
                            className="text-primary underline underline-offset-2 hover:opacity-80"
                            target={isExternal ? "_blank" : undefined}
                            rel={isExternal ? "noopener noreferrer" : undefined}
                          >
                            {children}
                          </a>
                        );
                      },
                      ul: ({ children }) => <ul className="list-disc pl-6 space-y-1 my-3">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-6 space-y-1 my-3">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      hr: () => <hr className="border-border my-6" />,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </article>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
                  <BookOpen className="h-12 w-12 opacity-30" />
                  <p className="text-sm">Select a document from the sidebar to read it here.</p>
                </div>
              )}
            </CardContent>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}

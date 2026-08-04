"use client";

/* ── Canvas Explorations landing ──
   The home for canvas projects, à la Miro — and the SAME page experience as
   Media Plans / Audiences / Reports: title + count, New button, status chips,
   row cards with the universal overflow actions (Duplicate / Rename / Share /
   Archive / Delete), chat input at the bottom. Rows open the project. */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Clock, Check, X, LayoutGrid, ArchiveRestore, Trash2 } from "lucide-react";
import {
  loadCanvasProjects, persistCanvasProjects, copyCanvasProjectData, deleteCanvasProjectData,
  canvasProjectStats, type CanvasProjectMeta,
} from "@/lib/storage";
import { CardOverflowMenu, getDefaultActions, type OverflowAction } from "@/components/patterns/card-overflow-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageChatInput } from "@/components/ai-companion/page-chat-input";
import { useCampaign } from "@/contexts/campaign-context";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

const FILTERS = ["All", "Active", "Archived"] as const;
type Filter = (typeof FILTERS)[number];

export default function CanvasLandingPage() {
  const router = useRouter();
  const { showToast } = useCampaign();
  const [projects, setProjects] = useState<CanvasProjectMeta[]>([]);
  const [stats, setStats] = useState<Record<string, { frames: number; flows: number; notes: number }>>({});
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<Filter>("All");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadCanvasProjects();
    setProjects(loaded);
    setStats(Object.fromEntries(loaded.map((p) => [p.id, canvasProjectStats(p.id)])));
    setReady(true);
  }, []);

  const update = useCallback((next: CanvasProjectMeta[]) => {
    setProjects(next);
    persistCanvasProjects(next);
  }, []);

  // "New canvas" asks for a name first — canvases are named things you show
  // people, not untitled scratch space. Default suggestion stays editable.
  const [naming, setNaming] = useState(false);
  const [newName, setNewName] = useState("");

  const openNaming = useCallback(() => {
    const taken = new Set(projects.map((p) => p.name));
    let suggestion = "Untitled canvas", n = 2;
    while (taken.has(suggestion)) suggestion = `Untitled canvas ${n++}`;
    setNewName(suggestion);
    setNaming(true);
  }, [projects]);

  const createCanvas = useCallback(() => {
    const name = newName.trim();
    if (!name) return;
    const now = new Date().toISOString();
    const project: CanvasProjectMeta = { id: `cnv-${Date.now().toString(36)}`, name, status: "active", createdAt: now, lastModifiedAt: now };
    update([...projects, project]);
    setNaming(false);
    router.push(`/canvas/${project.id}`);
  }, [newName, projects, update, router]);

  const onAction = useCallback((project: CanvasProjectMeta, actionId: string) => {
    if (actionId === "duplicate") {
      const now = new Date().toISOString();
      const copy: CanvasProjectMeta = { ...project, id: `cnv-${Date.now().toString(36)}`, name: `${project.name} (copy)`, createdAt: now, lastModifiedAt: now };
      copyCanvasProjectData(project.id, copy.id);
      update([...projects, copy]);
      setStats((prev) => ({ ...prev, [copy.id]: canvasProjectStats(copy.id) }));
      showToast("Canvas duplicated");
    } else if (actionId === "rename") {
      setRenamingId(project.id);
      setRenameValue(project.name);
    } else if (actionId === "share") {
      showToast("Share link copied — sharing is simulated in this prototype");
    } else if (actionId === "archive") {
      update(projects.map((p) => (p.id === project.id ? { ...p, status: "archived" as const } : p)));
      showToast("Canvas archived");
    } else if (actionId === "restore") {
      update(projects.map((p) => (p.id === project.id ? { ...p, status: "active" as const } : p)));
      showToast("Canvas restored");
    } else if (actionId === "delete") {
      setDeletingId(project.id);
    }
  }, [projects, update, showToast]);

  const submitRename = useCallback(() => {
    const name = renameValue.trim();
    if (name && renamingId) update(projects.map((p) => (p.id === renamingId ? { ...p, name } : p)));
    setRenamingId(null);
  }, [renameValue, renamingId, projects, update]);

  const visible = projects
    .filter((p) => (filter === "All" ? true : filter === "Active" ? p.status === "active" : p.status === "archived"))
    .sort((a, b) => new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime());
  const isEmpty = ready && projects.length === 0;

  const row = (p: CanvasProjectMeta) => {
    const s = stats[p.id] ?? { frames: 0, flows: 0, notes: 0 };
    const isRenaming = renamingId === p.id;
    const restoreActions: OverflowAction[] = [
      { id: "restore", label: "Restore", icon: <ArchiveRestore className="h-3.5 w-3.5" />, onClick: () => onAction(p, "restore") },
      { id: "delete", label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, destructive: true, onClick: () => onAction(p, "delete") },
    ];
    return (
      <div
        key={p.id}
        onClick={isRenaming ? undefined : () => router.push(`/canvas/${p.id}`)}
        className={cn(
          "group flex w-full items-center gap-4 rounded-xl border border-border bg-white px-4 py-3.5 text-left transition-all hover:shadow-sm",
          isRenaming ? "ring-1 ring-[#7C5CFC]" : "cursor-pointer",
          p.status === "archived" && "opacity-70"
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3F0FF]">
          <LayoutGrid className="h-4 w-4 text-[#7C5CFC]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isRenaming ? (
              <div className="flex min-w-0 flex-1 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  autoFocus
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitRename();
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  className="min-w-0 flex-1 rounded-md border border-border px-2 py-0.5 text-[13px] font-semibold text-foreground outline-none focus:border-ring"
                />
                <button onClick={submitRename} className="flex h-6 w-6 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setRenamingId(null)} className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <span className="truncate text-[13px] font-semibold text-foreground">{p.name}</span>
                {p.status === "archived" && (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Archived</span>
                )}
              </>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground">
            <span>{s.frames} {s.frames === 1 ? "artifact" : "artifacts"}</span>
            <span>·</span>
            <span>{s.flows} {s.flows === 1 ? "flow" : "flows"}</span>
            {s.notes > 0 && (
              <>
                <span>·</span>
                <span>{s.notes} {s.notes === 1 ? "note" : "notes"}</span>
              </>
            )}
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo(p.lastModifiedAt)}
            </span>
          </div>
        </div>
        {!isRenaming && (
          <CardOverflowMenu actions={p.status === "archived" ? restoreActions : getDefaultActions((id) => onAction(p, id))} />
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="mx-auto my-auto w-full max-w-3xl px-4 sm:px-8 py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Canvas Explorations</h1>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {isEmpty
                  ? "Your canvases will live here"
                  : `${projects.length} ${projects.length === 1 ? "canvas" : "canvases"}`}
              </p>
            </div>
            {!isEmpty && (
              <button
                type="button"
                onClick={openNaming}
                className="flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-foreground/90"
              >
                <Plus className="h-4 w-4" />
                New canvas
              </button>
            )}
          </div>

          {/* Status filter tabs — same chips as the other list pages */}
          {!isEmpty && (
            <div className="mt-4 flex items-center gap-1 overflow-x-auto">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                    filter === f ? "bg-foreground text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          {isEmpty ? (
            <div className="mt-10 flex flex-col items-center rounded-xl bg-white px-8 py-10 text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3F0FF]">
                <LayoutGrid className="h-6 w-6 text-[#7C5CFC]" strokeWidth={1.5} />
              </div>
              <h2 className="text-base font-semibold text-foreground">Start your first canvas</h2>
              <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                An infinite space for plans, flows, audiences, and what-ifs — everything you build in chat lands on it as an editable artifact.
              </p>
              <button
                type="button"
                onClick={openNaming}
                className="mt-5 inline-flex items-center rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                Get started
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {visible.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-muted-foreground">No canvases match this filter.</p>
              ) : (
                visible.map(row)
              )}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 pb-6 pt-2">
        <PageChatInput placeholder="Ask to build — plans, audiences, and workflows land on a canvas..." />
      </div>

      {naming && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-foreground/20" onClick={() => setNaming(false)}>
          <div className="w-80 rounded-xl border border-border bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[14px] font-semibold text-foreground">Name your canvas</h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">You can rename it anytime from the list or the canvas header.</p>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createCanvas();
                if (e.key === "Escape") setNaming(false);
              }}
              onFocus={(e) => e.target.select()}
              className="mt-3 w-full rounded-lg border border-border px-2.5 py-1.5 text-[13px] outline-none focus:border-foreground/40"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNaming(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createCanvas}
                disabled={!newName.trim()}
                className="rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background hover:bg-foreground/90 disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deletingId !== null}
        title="Delete this canvas?"
        description="The canvas layout, its flows, notes, and boards will be permanently removed. Saved artifacts (plans, audiences, reports) are not deleted — they stay available in the nav."
        confirmLabel="Delete canvas"
        destructive
        onConfirm={() => {
          if (deletingId) {
            deleteCanvasProjectData(deletingId);
            update(projects.filter((p) => p.id !== deletingId));
            showToast("Canvas deleted");
          }
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}

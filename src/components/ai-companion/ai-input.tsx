"use client";

import { useState, useRef, useCallback, useEffect, type FormEvent, type DragEvent, type KeyboardEvent } from "react";
import { ArrowUp, Paperclip, Mic, X, FileText, SlidersHorizontal, Check, Zap, ListChecks, Lightbulb, Search, Plus, Upload, Plug, Wand2, Bot, Database, SquareDashedMousePointer } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { useCampaign } from "@/contexts/campaign-context";
import type { ChatMode } from "@/types/campaign";

interface AttachedFile {
  name: string;
  type: string;
  size: number;
  /** Data URL preview for images */
  preview?: string;
}

interface AIInputProps {
  onSend: (message: string, files?: AttachedFile[]) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_ROWS = 6;
const LINE_HEIGHT = 20; // px per line

const MODE_OPTIONS: { id: ChatMode; label: string; description: string; icon: React.ReactNode }[] = [
  { id: "express", label: "Express", description: "Build it fast with smart defaults", icon: <Zap className="h-3.5 w-3.5" /> },
  { id: "plan", label: "Plan", description: "Walk through targeting, budget, and creative", icon: <ListChecks className="h-3.5 w-3.5" /> },
  { id: "advise", label: "Advise", description: "Recommendations backed by evidence", icon: <Lightbulb className="h-3.5 w-3.5" /> },
  { id: "research", label: "Research", description: "Pull data and surface performance insights", icon: <Search className="h-3.5 w-3.5" /> },
];

const TOOL_OPTIONS = [
  { id: "sources", label: "Sources", description: "Connect data sources", icon: <Database className="h-3.5 w-3.5" /> },
  { id: "upload", label: "Upload", description: "Attach files and assets", icon: <Upload className="h-3.5 w-3.5" /> },
  { id: "plugins", label: "Plugins", description: "Third-party integrations", icon: <Plug className="h-3.5 w-3.5" /> },
  { id: "skills", label: "Skills", description: "Specialized AI capabilities", icon: <Wand2 className="h-3.5 w-3.5" /> },
  { id: "agents", label: "Agents", description: "Autonomous task runners", icon: <Bot className="h-3.5 w-3.5" /> },
];

function ToolsPopover({ onAttachFile }: { onAttachFile?: () => void }) {
  const router = useRouter();
  const { showToast } = useCampaign();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Real action or honest "coming soon" — never a silent no-op. Sources/Plugins
  // open Connectors (/settings, MCP-style); Upload attaches a file; Skills/Agents
  // aren't built yet.
  function handleTool(id: string, label: string) {
    setOpen(false);
    if (id === "sources" || id === "plugins") { router.push("/settings"); return; }
    if (id === "upload") { onAttachFile?.(); return; }
    showToast(`${label} — coming soon`);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Tools"
      >
        <Plus className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1.5 w-56 rounded-xl border bg-background shadow-lg">
          <div className="px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Tools
          </div>
          {/* One attach affordance — the "Upload" tool below routes to onAttachFile
              (matches the canvas/page popovers; no duplicate standalone button). */}
          {TOOL_OPTIONS.map((tool) => {
            const soon = tool.id === "skills" || tool.id === "agents";
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleTool(tool.id, tool.label)}
                className={cn("flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-accent", soon && "opacity-60")}
              >
                <span className="text-muted-foreground">{tool.icon}</span>
                <div className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-foreground">{tool.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{tool.description}</span>
                </div>
                {soon && <span className="text-[10px] text-muted-foreground">Soon</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ModePopover() {
  const { chatMode, setChatMode } = useAICompanion();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const current = MODE_OPTIONS.find((m) => m.id === chatMode) || MODE_OPTIONS[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-md px-1.5 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="AI mode"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="text-[12px] font-medium">{current.label}</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1.5 w-56 rounded-xl border bg-background shadow-lg">
          <div className="px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Mode
          </div>
          {MODE_OPTIONS.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => { setChatMode(mode.id); setOpen(false); }}
              className={cn(
                "flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-accent",
                chatMode === mode.id && "bg-accent"
              )}
            >
              <span className="text-muted-foreground">{mode.icon}</span>
              <div className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-foreground">{mode.label}</span>
                <span className="block text-[11px] text-muted-foreground">{mode.description}</span>
              </div>
              {chatMode === mode.id && (
                <Check className="h-3.5 w-3.5 shrink-0 text-[#2C9FDD]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AIInput({
  onSend,
  placeholder = "Ask anything...",
  autoFocus = false,
}: AIInputProps) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isListening, hasSpeechAPI, toggleVoice } = useVoiceInput(value, setValue);
  const { pendingContext, setPendingContext, selectMode, setSelectMode } = useAICompanion();

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const maxHeight = LINE_HEIGHT * MAX_ROWS;
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
    ta.style.overflowY = ta.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value]);

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed && files.length === 0 && !pendingContext) return;

    const base = trimmed || (files.length > 0 ? `[Attached ${files.length} file${files.length > 1 ? "s" : ""}]` : "");
    // Contextual edit: prepend the selected element so the AI acts on it.
    const message = pendingContext
      ? `Re: ${pendingContext.label} (${pendingContext.detail})${base ? `\n\n${base}` : " — tell me about this."}`
      : base;
    onSend(message, files.length > 0 ? files : undefined);
    setValue("");
    setFiles([]);
    if (pendingContext) setPendingContext(null);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const processFiles = useCallback((fileList: FileList) => {
    Array.from(fileList).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const attached: AttachedFile = {
            name: file.name,
            type: file.type,
            size: file.size,
            preview: e.target?.result as string,
          };
          setFiles((prev) => [...prev, attached]);
        };
        reader.readAsDataURL(file);
      } else {
        setFiles((prev) => [...prev, { name: file.name, type: file.type, size: file.size }]);
      }
    });
  }, []);

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = "";
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const hasContent = value.trim() || files.length > 0 || !!pendingContext;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative rounded-xl transition-all duration-200",
        isDragging && "ring-2 ring-[#2C9FDD] ring-offset-1 bg-[#F5FAFF]"
      )}
    >
      {/* Drag overlay — expands to a generous drop target */}
      {isDragging && (
        <div className="flex min-h-[120px] items-center justify-center rounded-xl bg-[#F5FAFF] border-2 border-dashed border-[#2C9FDD] mb-2">
          <div className="flex flex-col items-center gap-1">
            <Paperclip className="h-5 w-5 text-[#2C9FDD]" />
            <span className="text-[13px] font-medium text-[#2C9FDD]">Drop files here</span>
          </div>
        </div>
      )}

      {/* Attached files preview */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2">
          {files.map((file, i) => (
            <div key={i} className="relative group">
              {file.preview ? (
                <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-accent px-2 py-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="max-w-[120px] truncate text-[11px] text-foreground">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Contextual-edit chip — the canvas element attached via select mode */}
      {pendingContext && (
        <div className="flex items-center pb-2">
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-[#7C5CFC]/40 bg-[#F3F0FF] px-2 py-1 text-[11px] font-medium text-[#5B43D6]">
            <SquareDashedMousePointer className="h-3 w-3 shrink-0" />
            <span className="truncate">{pendingContext.label}</span>
            <button type="button" onClick={() => setPendingContext(null)} className="ml-0.5 shrink-0 rounded text-[#5B43D6]/60 transition-colors hover:text-[#5B43D6]" aria-label="Remove context">
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInput}
          accept="image/*,.pdf,.csv,.xlsx,.doc,.docx,.txt"
        />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          rows={1}
          className="w-full resize-none bg-transparent text-sm leading-5 outline-none placeholder:text-muted-foreground"
          style={{ minHeight: "20px", maxHeight: `${LINE_HEIGHT * MAX_ROWS}px` }}
        />
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center">
            <ToolsPopover onAttachFile={() => fileInputRef.current?.click()} />
            <ModePopover />
            <button
              type="button"
              onClick={() => setSelectMode(!selectMode)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                selectMode ? "bg-[#F3F0FF] text-[#5B43D6]" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              title={selectMode ? "Selecting — click an element on the canvas" : "Select an element to discuss"}
              aria-pressed={selectMode}
            >
              <SquareDashedMousePointer className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-0.5">
            {hasSpeechAPI && (
              <button
                type="button"
                onClick={toggleVoice}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
                  isListening
                    ? "bg-red-50 text-red-500 hover:bg-red-100"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                <Mic className="h-4 w-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={!hasContent}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
                hasContent
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export type { AttachedFile };

"use client";

import { useState, useRef, useCallback, useEffect, type FormEvent, type DragEvent, type KeyboardEvent } from "react";
import { ArrowUp, Paperclip, Mic, X, FileText, SlidersHorizontal, Check, MessageSquare, LayoutList, Plus, Upload, Plug, Wand2, Bot, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { useAICompanion } from "@/contexts/ai-companion-context";
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
  { id: "conversational", label: "Guided", description: "AI walks you through step by step", icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { id: "assisted", label: "Direct", description: "Jump straight to forms and cards", icon: <LayoutList className="h-3.5 w-3.5" /> },
];

const TOOL_OPTIONS = [
  { id: "sources", label: "Sources", description: "Connect data sources", icon: <Database className="h-3.5 w-3.5" /> },
  { id: "upload", label: "Upload", description: "Attach files and assets", icon: <Upload className="h-3.5 w-3.5" /> },
  { id: "plugins", label: "Plugins", description: "Third-party integrations", icon: <Plug className="h-3.5 w-3.5" /> },
  { id: "skills", label: "Skills", description: "Specialized AI capabilities", icon: <Wand2 className="h-3.5 w-3.5" /> },
  { id: "agents", label: "Agents", description: "Autonomous task runners", icon: <Bot className="h-3.5 w-3.5" /> },
];

function ToolsPopover({ onAttachFile }: { onAttachFile?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

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
          <div className="px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-[#8492A6]">
            Tools
          </div>
          {onAttachFile && (
            <button
              type="button"
              onClick={() => { onAttachFile(); setOpen(false); }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-[#F7F9FB]"
            >
              <span className="text-muted-foreground"><Paperclip className="h-3.5 w-3.5" /></span>
              <div className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-[#394859]">Attach file</span>
                <span className="block text-[11px] text-[#8492A6]">Upload images, PDFs, docs</span>
              </div>
            </button>
          )}
          {TOOL_OPTIONS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-[#F7F9FB]"
            >
              <span className="text-muted-foreground">{tool.icon}</span>
              <div className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-[#394859]">{tool.label}</span>
                <span className="block text-[11px] text-[#8492A6]">{tool.description}</span>
              </div>
              <span className="text-[10px] text-[#8492A6]">Soon</span>
            </button>
          ))}
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="AI mode"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1.5 w-56 rounded-xl border bg-background shadow-lg">
          <div className="px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-[#8492A6]">
            Mode
          </div>
          {MODE_OPTIONS.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => { setChatMode(mode.id); setOpen(false); }}
              className={cn(
                "flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-[#F7F9FB]",
                chatMode === mode.id && "bg-[#F7F9FB]"
              )}
            >
              <span className="text-muted-foreground">{mode.icon}</span>
              <div className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-[#394859]">{mode.label}</span>
                <span className="block text-[11px] text-[#8492A6]">{mode.description}</span>
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

function ModeLabel() {
  const { chatMode } = useAICompanion();
  const current = MODE_OPTIONS.find((m) => m.id === chatMode) || MODE_OPTIONS[0];
  return (
    <span className="text-[12px] font-medium text-muted-foreground px-1.5">
      {current.label}
    </span>
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
    if (!trimmed && files.length === 0) return;

    const message = trimmed || (files.length > 0 ? `[Attached ${files.length} file${files.length > 1 ? "s" : ""}]` : "");
    onSend(message, files.length > 0 ? files : undefined);
    setValue("");
    setFiles([]);
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

  const hasContent = value.trim() || files.length > 0;

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
                <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-[#E0E8F2]">
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#394859] text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-lg border border-[#E0E8F2] bg-[#F7F9FB] px-2 py-1.5">
                  <FileText className="h-3.5 w-3.5 text-[#8492A6]" />
                  <span className="max-w-[120px] truncate text-[11px] text-[#394859]">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-[#8492A6]">
                    {formatFileSize(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-[#8492A6] transition-colors hover:bg-[#E0E8F2] hover:text-[#394859]"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
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
          </div>
          <div className="flex items-center gap-0.5">
            <ModeLabel />
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

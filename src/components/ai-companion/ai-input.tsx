"use client";

import { useState, useRef, useCallback, useEffect, type FormEvent, type DragEvent, type KeyboardEvent } from "react";
import { ArrowUp, Paperclip, Mic, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRecognitionAny = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

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

export function AIInput({
  onSend,
  placeholder = "Ask anything...",
  autoFocus = false,
}: AIInputProps) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionAny | null>(null);
  const voiceBaseRef = useRef("");

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

  function getSpeechAPI(): SpeechRecognitionAny | undefined {
    if (typeof window === "undefined") return undefined;
    const w = window as unknown as Record<string, unknown>;
    return (w.SpeechRecognition || w.webkitSpeechRecognition) as SpeechRecognitionAny | undefined;
  }

  function toggleVoice() {
    const SpeechRecognitionCtor = getSpeechAPI();
    if (!SpeechRecognitionCtor) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionAny) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      const base = voiceBaseRef.current;
      const combined = finalText + interimText;
      setValue(base ? `${base} ${combined}` : combined);
    };

    recognition.onend = () => {
      // Snapshot current value as the new base so consecutive presses don't overwrite
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    // Snapshot whatever text is already in the input so we append after it
    voiceBaseRef.current = value.trim();
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  const hasContent = value.trim() || files.length > 0;
  const hasSpeechAPI = !!getSpeechAPI();

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

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground mb-0.5"
          title="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </button>
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
          className="flex-1 resize-none bg-transparent text-sm leading-5 outline-none placeholder:text-muted-foreground"
          style={{ minHeight: "20px", maxHeight: `${LINE_HEIGHT * MAX_ROWS}px` }}
        />
        {hasSpeechAPI && (
          <button
            type="button"
            onClick={toggleVoice}
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors mb-0.5",
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
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors mb-0.5",
            hasContent
              ? "bg-foreground text-background hover:bg-foreground/90"
              : "bg-muted text-muted-foreground"
          )}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

export type { AttachedFile };

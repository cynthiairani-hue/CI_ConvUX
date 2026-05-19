"use client";

import { useState, useRef, useCallback, type FormEvent, type DragEvent } from "react";
import { ArrowUp, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function AIInput({
  onSend,
  placeholder = "Ask anything...",
  autoFocus = false,
}: AIInputProps) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed && files.length === 0) return;

    const message = trimmed || (files.length > 0 ? `[Attached ${files.length} file${files.length > 1 ? "s" : ""}]` : "");
    onSend(message, files.length > 0 ? files : undefined);
    setValue("");
    setFiles([]);
  }

  const processFiles = useCallback((fileList: FileList) => {
    const newFiles: AttachedFile[] = [];
    Array.from(fileList).forEach((file) => {
      const attached: AttachedFile = {
        name: file.name,
        type: file.type,
        size: file.size,
      };

      // Generate preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.name === file.name ? { ...f, preview: e.target?.result as string } : f
            )
          );
        };
        reader.readAsDataURL(file);
      }

      newFiles.push(attached);
    });
    setFiles((prev) => [...prev, ...newFiles]);
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
        "relative rounded-xl transition-colors",
        isDragging && "ring-2 ring-[#2C9FDD] ring-offset-1 bg-[#F5FAFF]"
      )}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[#F5FAFF]/80 border-2 border-dashed border-[#2C9FDD]">
          <span className="text-[13px] font-medium text-[#2C9FDD]">Drop files here</span>
        </div>
      )}

      {/* Attached files preview */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-lg border border-[#E0E8F2] bg-[#F7F9FB] px-2 py-1"
            >
              {file.preview ? (
                <img
                  src={file.preview}
                  alt=""
                  className="h-5 w-5 rounded object-cover"
                />
              ) : file.type.startsWith("image/") ? (
                <ImageIcon className="h-3.5 w-3.5 text-[#8492A6]" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-[#8492A6]" />
              )}
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
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
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
      </form>
    </div>
  );
}

export type { AttachedFile };

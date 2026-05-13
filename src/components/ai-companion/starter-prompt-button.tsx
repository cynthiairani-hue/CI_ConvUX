"use client";

interface StarterPromptButtonProps {
  label: string;
  onClick: () => void;
}

export function StarterPromptButton({
  label,
  onClick,
}: StarterPromptButtonProps) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
    >
      {label}
    </button>
  );
}

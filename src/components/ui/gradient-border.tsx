import { cn } from "@/lib/utils";

interface GradientBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GradientBorder({
  children,
  className,
  ...props
}: GradientBorderProps) {
  return (
    <div className={cn("ai-gradient-border", className)} {...props}>
      {children}
    </div>
  );
}

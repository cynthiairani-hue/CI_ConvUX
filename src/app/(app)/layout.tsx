import { PersonaProvider } from "@/contexts/persona-context";
import { LayoutProvider } from "@/contexts/layout-context";
import { AICompanionProvider } from "@/contexts/ai-companion-context";
import { AppShell } from "@/components/layout/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PersonaProvider>
      <LayoutProvider>
        <AICompanionProvider>
          <TooltipProvider delayDuration={0}>
            <AppShell>{children}</AppShell>
          </TooltipProvider>
        </AICompanionProvider>
      </LayoutProvider>
    </PersonaProvider>
  );
}

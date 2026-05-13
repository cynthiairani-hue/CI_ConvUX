import { PersonaProvider } from "@/contexts/persona-context";
import { LayoutProvider } from "@/contexts/layout-context";
import { AICompanionProvider } from "@/contexts/ai-companion-context";
import { CampaignProvider } from "@/contexts/campaign-context";
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
          <CampaignProvider>
            <TooltipProvider delayDuration={0}>
              <AppShell>{children}</AppShell>
            </TooltipProvider>
          </CampaignProvider>
        </AICompanionProvider>
      </LayoutProvider>
    </PersonaProvider>
  );
}

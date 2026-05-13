import { Persona, PersonaDashboard, PersonaId } from "@/types/persona";

export const personas: Persona[] = [
  {
    id: "sarah-chen",
    name: "Sarah Chen",
    role: "Performance Marketing Manager",
    initials: "SC",
    org: "Internal",
  },
  {
    id: "marcus-patel",
    name: "Marcus Patel",
    role: "VP of Marketing",
    initials: "MP",
    org: "Internal",
  },
  {
    id: "jordan-reyes",
    name: "Jordan Reyes",
    role: "Client, Lumen Organics",
    initials: "JR",
    org: "Lumen Organics",
  },
];

export const dashboards: Record<PersonaId, PersonaDashboard> = {
  "sarah-chen": {
    heading: "Campaign Performance",
    subheading: "Your active campaigns across all channels",
    metrics: [
      { label: "Impressions", value: "1.24M", change: "+12.3%", trend: "up" },
      { label: "Clicks", value: "48.2K", change: "+8.1%", trend: "up" },
      { label: "CTR", value: "3.89%", change: "-0.2%", trend: "down" },
      { label: "Spend", value: "$12,480", change: "+5.4%", trend: "neutral" },
    ],
  },
  "marcus-patel": {
    heading: "Marketing Overview",
    subheading: "Team performance and pipeline health",
    metrics: [
      {
        label: "Total Budget",
        value: "$84,200",
        change: "62% utilized",
        trend: "neutral",
      },
      {
        label: "Pipeline",
        value: "$342K",
        change: "+18.7%",
        trend: "up",
      },
      {
        label: "Team Velocity",
        value: "94%",
        change: "+3 pts",
        trend: "up",
      },
      { label: "Campaign ROI", value: "4.2x", change: "+0.3x", trend: "up" },
    ],
  },
  "jordan-reyes": {
    heading: "Lumen Organics",
    subheading: "Your campaign performance with AdRoll",
    metrics: [
      {
        label: "Active Campaigns",
        value: "6",
        change: "+2 this month",
        trend: "up",
      },
      { label: "Reach", value: "892K", change: "+22.1%", trend: "up" },
      {
        label: "Engagement Rate",
        value: "5.12%",
        change: "+1.1%",
        trend: "up",
      },
      {
        label: "Budget Remaining",
        value: "$8,320",
        change: "of $15,000",
        trend: "neutral",
      },
    ],
  },
};

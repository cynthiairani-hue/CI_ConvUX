export type PersonaId = "sarah-chen" | "marcus-patel" | "jordan-reyes";

export interface Persona {
  id: PersonaId;
  name: string;
  role: string;
  initials: string;
  org: string;
}

export interface DashboardMetric {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
}

export interface PersonaDashboard {
  heading: string;
  subheading: string;
  metrics: DashboardMetric[];
}

export type PersonaId = "cynthia-b2c" | "cynthia-b2b" | "cynthia-agency";

export type Vertical = "b2c" | "b2b" | "agency";

export interface Persona {
  id: PersonaId;
  name: string;
  vertical: Vertical;
  verticalLabel: string;
  initials: string;
}

export interface GettingStartedTask {
  id: string;
  title: string;
  description: string;
  cta: string;
  status: "not-started" | "in-progress" | "complete";
  priority: "essential" | "optional";
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

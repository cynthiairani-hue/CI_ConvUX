import {
  Home,
  Frame,
  Megaphone,
  Users,
  BarChart3,
  CheckSquare,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

export const navItems: NavItem[] = [
  { id: "home", label: "Home", href: "/home", icon: Home },
  { id: "canvas", label: "Canvas", href: "/canvas", icon: Frame },
  { id: "campaigns", label: "Campaigns", href: "/campaigns", icon: Megaphone },
  { id: "audiences", label: "Audiences", href: "/audiences", icon: Users },
  { id: "reports", label: "Reports", href: "/reports", icon: BarChart3 },
  {
    id: "approvals",
    label: "Approvals",
    href: "/approvals",
    icon: CheckSquare,
  },
  // Connectors hidden from nav — accessible via chat tools menu (MCP-style)
  // { id: "settings", label: "Connectors", href: "/settings", icon: Plug },
];

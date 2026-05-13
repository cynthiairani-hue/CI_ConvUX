import {
  LayoutDashboard,
  Megaphone,
  Users,
  BarChart3,
  CheckSquare,
  Settings,
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
  { id: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
  { id: "campaigns", label: "Campaigns", href: "/campaigns", icon: Megaphone },
  { id: "audiences", label: "Audiences", href: "/audiences", icon: Users },
  { id: "reports", label: "Reports", href: "/reports", icon: BarChart3 },
  {
    id: "approvals",
    label: "Approvals",
    href: "/approvals",
    icon: CheckSquare,
    badge: 3,
  },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
];

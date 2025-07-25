import {
  BookOpen,
  LayoutDashboard,
  Briefcase,
  Target,
  AlertTriangle,
  FileText,
  Users,
  Settings,
  type LucideIcon
} from 'lucide-react';

// Icon mapping for help sections
export const iconMap: Record<string, LucideIcon> = {
  BookOpen,
  LayoutDashboard,
  Briefcase,
  Target,
  AlertTriangle,
  FileText,
  Users,
  Settings,
};

// Helper function to get icon component from string name
export const getIconComponent = (iconName: string): LucideIcon => {
  return iconMap[iconName] || BookOpen; // Default to BookOpen if icon not found
};
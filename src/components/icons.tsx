// Re-export lucide icons used across the app + a couple of custom ones
// that lucide doesn't provide.
export {
  Sparkles,
  Camera,
  Trophy,
  Flame,
  Gift,
  TrendingDown,
  CalendarClock,
  Wallet,
  AlertTriangle,
  ChevronRight,
  Home,
  ListChecks,
  Lightbulb,
  Tag,
  Plus,
  LogOut,
  Moon,
  Sun,
  MoreVertical,
  ExternalLink,
  Trash2,
  Pencil,
  Search,
  SlidersHorizontal,
  ShieldCheck,
  Zap,
  Mail,
  Send,
  Loader2,
  Check,
  MailCheck,
  Layers,
  RefreshCw,
  Star,
  Lock,
  Award,
  Target,
  ArrowRight,
  X,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

// Custom "MailSync" icon (envelope with refresh arrows) — lucide has no exact match.
// Built as an SVG so it matches the LucideIcon signature.
export const MailSync: LucideIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3 7l9 6 9-6" />
    <rect x="2" y="4" width="20" height="14" rx="2" />
    <path d="M20 18a4 4 0 0 0 0-8 4 4 0 0 0-4 4" />
    <path d="M20 14l1.5-1.5L20 11" />
  </svg>
);

/**
 * Ícones do app (Lucide). Use sempre estes nomes semânticos — assim o mesmo tipo de ação
 * tem o mesmo ícone em toda a interface.
 *
 * Acessibilidade: o Lucide v1 já renderiza `aria-hidden="true"`; o ícone acompanha um texto
 * visível. Botão só com ícone precisa de `aria-label` (e de preferência um texto `sr-only`).
 */
import {
  Ban,
  CalendarDays,
  CalendarPlus,
  CalendarX2,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleHelp,
  CircleUserRound,
  ClipboardPaste,
  Clock,
  Copy,
  Crown,
  Download,
  ExternalLink,
  Layers,
  LayoutGrid,
  List,
  Medal,
  Settings,
  LayoutDashboard,
  Link2,
  ListFilter,
  LogIn,
  LogOut,
  MessageCircle,
  Pencil,
  Plus,
  Repeat,
  ArrowLeftRight,
  RefreshCw,
  RotateCcw,
  Save,
  Share2,
  ShieldCheck,
  ShieldMinus,
  Trash2,
  Trophy,
  Undo2,
  Upload,
  UserMinus,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

export type { LucideIcon };

export const Icons = {
  // Ações genéricas
  add: Plus,
  edit: Pencil,
  delete: Trash2,
  save: Save,
  undo: Undo2,
  copy: Copy,
  copied: Check,
  download: Download,
  upload: Upload,
  share: Share2,
  externalLink: ExternalLink,
  refresh: RefreshCw,
  settings: Settings,
  filter: ListFilter,
  close: X,
  // Navegação
  dashboard: LayoutDashboard,
  availability: Clock,
  events: CalendarDays,
  ranking: Trophy,
  decks: Layers,
  group: Users,
  profile: CircleUserRound,
  previous: ChevronLeft,
  next: ChevronRight,
  signIn: LogIn,
  signOut: LogOut,
  // Agenda
  once: CalendarDays,
  weekly: Repeat,
  createEvent: CalendarPlus,
  addToCalendar: CalendarPlus,
  skipDate: CalendarX2,
  finish: CircleCheck,
  cancel: Ban,
  reopen: RotateCcw,
  rsvpYes: Check,
  rsvpMaybe: CircleHelp,
  rsvpNo: X,
  winner: Medal,
  whatsapp: MessageCircle,
  // Grupo
  join: UserPlus,
  switchGroup: ArrowLeftRight,
  makeAdmin: ShieldCheck,
  removeAdmin: ShieldMinus,
  transfer: Crown,
  removeMember: UserMinus,
  leave: LogOut,
  // Decks
  fromUrl: Link2,
  fromText: ClipboardPaste,
  gallery: LayoutGrid,
  list: List,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof Icons;

/** Ícone decorativo no tamanho padrão de botões (16px), herdando a cor do texto. */
export function Icon({
  name,
  className = 'size-4 shrink-0',
}: {
  name: IconName;
  className?: string;
}) {
  const Component = Icons[name];
  return <Component className={className} aria-hidden="true" focusable="false" strokeWidth={2} />;
}

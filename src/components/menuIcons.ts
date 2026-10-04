import {
  AlignLeftIcon,
  ArrowRightIcon,
  ArrowUpDownIcon,
  CalendarDaysIcon,
  DumbbellIcon,
  FilePlus2Icon,
  FolderPlusIcon,
  HistoryIcon,
  LayersIcon,
  type LucideIcon,
  PaletteIcon,
  PencilIcon,
  RepeatIcon,
  RulerIcon,
  SaveIcon,
  StickyNoteIcon,
  TimerIcon,
  Trash2Icon,
} from 'lucide-react';
import type { Tint } from './RowIcon';

/** Icon + tile tint for each menu option kind (design "Create" / "Add to workout" sheets). */
export const MENU_ICONS = {
  folderPlus: [FolderPlusIcon, 'blue'],
  filePlus: [FilePlus2Icon, 'blue'],
  dumbbell: [DumbbellIcon, 'blue'],
  layers: [LayersIcon, 'purple'],
  timer: [TimerIcon, 'amber'],
  pencil: [PencilIcon, 'blue'],
  palette: [PaletteIcon, 'pink'],
  trash: [Trash2Icon, 'red'],
  history: [HistoryIcon, 'purple'],
  replace: [RepeatIcon, 'teal'],
  reorder: [ArrowUpDownIcon, 'gray'],
  note: [StickyNoteIcon, 'amber'],
  open: [ArrowRightIcon, 'blue'],
  save: [SaveIcon, 'teal'],
  calendar: [CalendarDaysIcon, 'blue'],
  ungroup: [AlignLeftIcon, 'gray'],
  ruler: [RulerIcon, 'teal'],
} satisfies Record<string, [LucideIcon, Tint]>;

export type MenuIcon = keyof typeof MENU_ICONS;

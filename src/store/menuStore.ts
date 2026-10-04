import { create } from 'zustand';
import type { MenuIcon } from '@/components/menuIcons';
import type { Tint } from '@/components/RowIcon';

export interface MenuOption {
  text: string;
  value: string;
  role?: 'destructive' | 'cancel';
  subtitle?: string;
  icon?: MenuIcon;
  tint?: Tint;
}

export interface OpenMenu {
  header?: string;
  options: MenuOption[];
  resolve: (value: string | null) => void;
}

/** The one bottom menu shown at a time (rendered by ActionMenuHost). */
export const useMenuStore = create<{ menu: OpenMenu | null }>(() => ({ menu: null }));

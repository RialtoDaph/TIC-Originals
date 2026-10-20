'use client';

import { createContext, useContext } from 'react';
import type { OwnerDict } from '@/i18n/owner';
import type { Lang } from '@/lib/types';
import type { OwnerData, Tab } from '@/lib/owner/types';
import type { Result } from '@/app/owner/actions';

export type ModalState =
  | { kind: 'code'; draft: { code: string; pct: boolean; value: string; min: string; until: string; limit: string; first: boolean } }
  | { kind: 'product'; draft: { id?: string; name: string; category: string; price: string; low: string; stock: Record<string, string> } }
  | { kind: 'bundle'; draft: { name: string; summary: string; normal: string; price: string } };

export interface OwnerCtx {
  data: OwnerData;
  t: OwnerDict;
  lang: Lang;
  now: Date;
  tab: Tab;
  go: (tab: Tab, extra?: Partial<UiState>) => void;
  ui: UiState;
  setUi: (patch: Partial<UiState> | ((s: UiState) => Partial<UiState>)) => void;
  toast: (msg: string) => void;
  /** Runs a server action, shows a toast (or the error) and lets the server refresh the data. */
  run: (fn: () => Promise<Result>, ok: string | ((r: Extract<Result, { ok: true }>) => string)) => Promise<boolean>;
  busy: boolean;
  eur: (cents: number) => string;
  eur0: (cents: number) => string;
}

export interface UiState {
  search: string;
  view: 'board' | 'list';
  lf: 'all' | 'ship' | 'way' | 'done' | 'issue';
  orderId: string | null;
  modal: ModalState | null;
  modalErr: string;
  packing: boolean;
  palette: boolean;
  aRange: 7 | 30;
}

export const Ctx = createContext<OwnerCtx | null>(null);

export function useOwner() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useOwner outside OwnerApp');
  return c;
}

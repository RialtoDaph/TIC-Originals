'use server';

// Finanzen mutations (expenses + receipts). Same rules as the other owner actions: every call re-checks
// the owner role (requireOwner) and runs with the owner's session, so row level security applies too.
// Nothing here deletes anything: expenses are voided (deleted_at) and receipts are append-only (GoBD).

import { refresh } from 'next/cache';
import { requireOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseEuroCents } from '@/lib/owner/derive';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/lib/owner/types';
import type { Result } from './actions';

const BUCKET = 'receipts';
const MAX_BYTES = 10 * 1024 * 1024;
const EXT: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const PATH_RE = /^\d{4}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function fail(e: unknown): Result {
  console.error('[finance action]', e);
  return { ok: false, error: e instanceof Error ? e.message : 'failed' };
}

/** Like the other owner actions but without busting the storefront cache: expenses never show on the shop. */
async function wrap(fn: () => Promise<Result>): Promise<Result> {
  try {
    const r = await fn();
    refresh();
    return r;
  } catch (e) {
    return fail(e);
  }
}

/**
 * Step 1 of attaching a receipt: hands out a signed upload URL for a path the SERVER chooses.
 * The browser then uploads the file straight to storage (server actions and Vercel functions cap the
 * request body at a few MB, receipts can be 10 MB). The extension comes from an allowlisted MIME type,
 * never from the user's filename.
 */
export async function createReceiptUpload(input: { mime: string; size: number }): Promise<Result> {
  return wrap(async () => {
    await requireOwner();
    const ext = EXT[input.mime];
    if (!ext) return { ok: false, error: 'type' };
    if (!Number.isFinite(input.size) || input.size <= 0 || input.size > MAX_BYTES) return { ok: false, error: 'size' };
    const path = `${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw error;
    return { ok: true, data: { path, token: data.token } };
  });
}

export interface ExpenseInput {
  /** Set to edit an existing expense. */
  id?: string;
  paidOn: string;
  category: string;
  vendor: string;
  invoiceNo: string;
  description: string;
  /** As typed: "1.234,56". Negative for a credit note. */
  amount: string;
  /** A file uploaded with createReceiptUpload, to attach as a new receipt. */
  receipt?: { path: string; mime: string; name: string };
}

export async function saveExpense(input: ExpenseInput): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await requireOwner();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paidOn) || Number.isNaN(new Date(input.paidOn + 'T00:00:00Z').getTime())) return { ok: false, error: 'date' };
    if (!EXPENSE_CATEGORIES.includes(input.category as ExpenseCategory)) return { ok: false, error: 'category' };
    const amountCents = parseEuroCents(input.amount);
    if (amountCents === null) return { ok: false, error: 'amount' };
    const row = {
      paid_on: input.paidOn,
      category: input.category,
      vendor: input.vendor.trim().slice(0, 120),
      vendor_invoice_no: input.invoiceNo.trim().slice(0, 80),
      description: input.description.trim().slice(0, 500),
      amount_cents: amountCents,
    };

    let expenseId = input.id;
    if (expenseId) {
      if (!UUID_RE.test(expenseId)) return { ok: false, error: 'id' };
      const { error } = await supabase.from('expenses').update(row).eq('id', expenseId).is('deleted_at', null);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from('expenses').insert(row).select('id').single();
      if (error) throw error;
      expenseId = data.id as string;
    }

    if (input.receipt) {
      const { path, mime, name } = input.receipt;
      if (!PATH_RE.test(path) || EXT[mime] !== path.split('.').pop()) return { ok: false, error: 'receipt' };
      // The browser uploaded the file itself: make sure it is really there and within the limit.
      const [folder, file] = path.split('/');
      const { data: found, error: listErr } = await createAdminClient().storage.from(BUCKET).list(folder, { search: file, limit: 5 });
      if (listErr) throw listErr;
      const obj = found?.find((f) => f.name === file);
      const size = Number((obj?.metadata as { size?: number } | null)?.size ?? 0);
      if (!obj || size <= 0 || size > MAX_BYTES) return { ok: false, error: 'receipt' };
      const { error } = await supabase.from('expense_receipts').insert({
        expense_id: expenseId,
        path,
        mime,
        size_bytes: size,
        original_name: name.replace(/[\u0000-\u001f"\\/]/g, '').trim().slice(0, 160),
      });
      if (error) throw error;
    }

    const cents = (amountCents / 100).toFixed(2);
    await supabase.from('activity_log').insert({ actor: user.id, text: `${input.id ? 'Edited' : 'Added'} expense ${row.vendor || row.category} ${cents} EUR`, task_key: null, undo: null });
    return { ok: true };
  });
}

/** Voids an expense. The row and its receipts are kept (and the old version is copied to expense_history). */
export async function voidExpense(id: string): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await requireOwner();
    if (!UUID_RE.test(id)) return { ok: false, error: 'id' };
    const { data, error } = await supabase.from('expenses').update({ deleted_at: new Date().toISOString() }).eq('id', id).is('deleted_at', null).select('vendor, amount_cents');
    if (error) throw error;
    await supabase.from('activity_log').insert({ actor: user.id, text: `Voided expense ${data?.[0]?.vendor ?? ''}`, task_key: null, undo: null });
    return { ok: true };
  });
}

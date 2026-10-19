'use server';

import { refresh } from 'next/cache';
import { getSessionUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { COUNTRY_CODES } from '@/lib/countries';

export interface AddressForm {
  first_name: string;
  last_name: string;
  street: string;
  extra: string;
  zip: string;
  city: string;
  country: string;
  phone: string;
}

export async function saveAddress(input: AddressForm, id?: string): Promise<{ ok: boolean }> {
  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false };
  const a = Object.fromEntries(Object.entries(input).map(([k, v]) => [k, String(v ?? '').trim().slice(0, 200)])) as unknown as AddressForm;
  if (!a.first_name || !a.last_name || !a.street || !a.zip || !a.city || !COUNTRY_CODES.includes(a.country)) return { ok: false };
  if (a.country === 'DE' && !/^\d{5}$/.test(a.zip)) return { ok: false };
  if (id) {
    const { error } = await supabase.from('addresses').update(a).eq('id', id).eq('user_id', user.id);
    if (error) return { ok: false };
  } else {
    const { count } = await supabase.from('addresses').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
    const { error } = await supabase.from('addresses').insert({ ...a, user_id: user.id, is_default: !count });
    if (error) return { ok: false };
  }
  refresh();
  return { ok: true };
}

export async function makeDefaultAddress(id: string): Promise<{ ok: boolean }> {
  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false };
  await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
  const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', id).eq('user_id', user.id);
  refresh();
  return { ok: !error };
}

/** Deletes the login. Orders are kept (required for bookkeeping) but unlinked from the account. */
export async function deleteAccount(): Promise<{ ok: boolean }> {
  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role === 'owner') return { ok: false }; // Never lock the shop owner out by accident.
  const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (error) {
    console.error('delete account', error);
    return { ok: false };
  }
  await supabase.auth.signOut();
  return { ok: true };
}

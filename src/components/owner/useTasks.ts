'use client';

import type { Tone } from '@/lib/tokens';
import { awaiting, customerName, shortNo, dm, itemsText, kleinunternehmer, needsAtt, restockSuggestions, shortName, toShip } from '@/lib/owner/derive';
import { ackKleinunternehmer, refundOrder, remindPayment, sendCartReminders, setRestockOrdered, shipOrders } from '@/app/owner/actions';
import type { OwnerCtx } from './OwnerContext';

export const IC = {
  truck: 'M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  undo: 'M3 7v6h6M3 13a9 9 0 1 0 3-7.7L3 8',
  card: 'M2 6h20v12H2zM2 10h20',
  box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  cart: 'M3 3h2l2.4 12.2a2 2 0 0 0 2 1.8h8.2a2 2 0 0 0 2-1.6L21 8H6',
  tax: 'M4 4h16v16H4zM8 16l8-8M9 9h.01M15 15h.01',
};

export interface Task {
  id: string;
  tone: Tone;
  icon: string;
  title: string;
  sub: string;
  action: string;
  /** [productId for the thumbnail, line a, line b, amount] */
  rows: [string | null, string, string, string][];
  run: () => Promise<unknown>;
}

function ago(iso: string, now: Date) {
  const h = Math.max(1, Math.round((now.getTime() - new Date(iso).getTime()) / 36e5));
  return h < 24 ? `${h} h` : `${Math.round(h / 24)} d`;
}
export { ago };

export function useTasks(ctx: OwnerCtx): Task[] {
  const { data, t, now, run, eur, eur0 } = ctx;
  const tasks: Task[] = [];
  const shipList = data.orders.filter(toShip);
  if (shipList.length) {
    const oldest = shipList.reduce((a, o) => (o.placedAt < a ? o.placedAt : a), shipList[0].placedAt);
    tasks.push({
      id: 'ship',
      tone: 'blue',
      icon: IC.truck,
      title: t.task.shipTitle(shipList.length),
      sub: t.task.shipSub(shipList.reduce((a, o) => a + o.items.reduce((x, i) => x + i.qty, 0), 0), dm(oldest)),
      action: t.task.shipAction(shipList.length),
      rows: shipList.map((o) => [o.items[0]?.productId ?? null, `${shortNo(o.no)} · ${customerName(o)}`, itemsText(o), eur(o.totalCents)]),
      run: () => run(() => shipOrders(shipList.map((o) => o.id), 'ship'), t.toast.shipped(shipList.length)),
    });
  }
  for (const o of data.orders.filter(needsAtt)) {
    const amount = o.totalCents - o.refundedCents;
    tasks.push({
      id: 'ref' + o.id,
      tone: 'red',
      icon: IC.undo,
      title: t.task.refundTitle(customerName(o)),
      sub: t.task.refundSub(o.no),
      action: t.task.refundAction(eur(amount), (o.method || 'Stripe').split(' ')[0]),
      rows: o.items.map((i) => [i.productId, `${shortName(i.name)} — ${i.size}`, t.task.resellable, eur(i.unitCents * i.qty)]),
      run: () => run(() => refundOrder(o.id, 'ref' + o.id), t.toast.refund(eur(amount))),
    });
  }
  const rsNow = restockSuggestions(data.products, data.orders, now).filter((r) => r.now && !r.product.restockOrdered);
  if (rsNow.length) {
    tasks.push({
      id: 'restock',
      tone: 'red',
      icon: IC.box,
      title: t.task.restockTitle(rsNow.length),
      sub: rsNow.map((r) => shortName(r.product.name)).join(', '),
      action: t.task.restockAction,
      rows: rsNow.map((r) => [
        r.product.id,
        `${shortName(r.product.name)} · ${t.restockOrder(r.lines.map((l) => `${l.qty} × ${l.size}`).join(' + ')).toLowerCase()}`,
        r.lines.map((l) => (l.stock === 0 ? t.soldOutW(l.size, l.waiting) : t.runsOut(l.size, Math.round(l.days)))).join(' · '),
        '',
      ]),
      run: () => run(() => setRestockOrdered(rsNow.map((r) => r.product.id), true, 'restock'), t.toast.restockMarked),
    });
  }
  for (const o of data.orders.filter((x) => awaiting(x) && !x.remindedAt)) {
    tasks.push({
      id: 'pay' + o.id,
      tone: 'amber',
      icon: IC.card,
      title: t.task.payTitle(customerName(o)),
      sub: t.task.paySub(o.no, dm(o.placedAt)),
      action: t.task.payAction,
      rows: o.items.map((i) => [i.productId, `${shortName(i.name)} — ${i.size}`, t.task.reserved, eur(o.totalCents)]),
      run: () => run(() => remindPayment(o.id, 'pay' + o.id), t.toast.reminder),
    });
  }
  const unsent = data.carts.filter((c) => !c.reminded);
  if (unsent.length) {
    tasks.push({
      id: 'carts',
      tone: 'grey',
      icon: IC.cart,
      title: t.task.cartsTitle(unsent.length),
      sub: t.task.cartsSub(eur(unsent.reduce((a, c) => a + c.valueCents, 0))),
      action: t.task.cartsAction(unsent.length),
      rows: unsent.map((c) => [c.items[0]?.productId ?? null, `${c.name} · ${t.task.ago(ago(c.createdAt, now))}`, c.items.map((i) => `${shortName(i.name)} · ${i.size}`).join(' + '), eur(c.valueCents)]),
      run: () => run(() => sendCartReminders(unsent.map((c) => c.id), 'carts'), t.toast.carts(unsent.length)),
    });
  }
  const ku = kleinunternehmer(data.orders, now);
  if (ku.projPct >= 0.9 && !data.kuAcked) {
    tasks.push({
      id: 'ku',
      tone: ku.projPct >= 1 ? 'red' : 'amber',
      icon: IC.tax,
      title: t.task.kuTitle,
      sub: t.task.kuSub(eur0(ku.proj), eur0(ku.limit)),
      action: t.task.kuAction,
      rows: [],
      run: () => run(() => ackKleinunternehmer(), t.task.kuDone),
    });
  }
  return tasks;
}

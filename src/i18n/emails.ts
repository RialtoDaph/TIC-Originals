// Transactional email copy (not part of the design handoff — please review).
import type { Lang } from '@/lib/types';
import { fmtCents } from '@/lib/format';
import { countryName } from '@/lib/countries';

export interface EmailOrder {
  order_no: string;
  first_name: string;
  last_name: string;
  street: string;
  extra: string;
  zip: string;
  city: string;
  country: string;
  subtotal_cents: number;
  discount_code: string | null;
  discount_cents: number;
  shipping_cents: number;
  total_cents: number;
  carrier?: string;
  tracking?: string;
}

export interface EmailItem {
  product_name: string;
  size: string;
  qty: number;
  unit_cents: number;
}

export interface Email {
  subject: string;
  text: string;
}

const site = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
const sig = 'TIC Originals · TILL I COLLAPSE ORIGINALS\nAn der Oberen Au 4 · 85072 Eichstätt · company@ticoriginals.com';

function lines(items: EmailItem[], o: EmailOrder, lang: Lang) {
  const m = (c: number) => fmtCents(c, lang);
  const de = lang === 'de';
  return [
    ...items.map((i) => `${i.qty} × ${i.product_name} · ${i.size} — ${m(i.unit_cents * i.qty)}`),
    '',
    `${de ? 'Zwischensumme' : 'Subtotal'}: ${m(o.subtotal_cents)}`,
    ...(o.discount_cents ? [`${de ? 'Rabatt' : 'Discount'} (${o.discount_code}): −${m(o.discount_cents)}`] : []),
    `${de ? 'Versand' : 'Shipping'}: ${o.shipping_cents ? m(o.shipping_cents) : de ? 'Kostenlos' : 'Free'}`,
    `${de ? 'Gesamt' : 'Total'}: ${m(o.total_cents)}`,
    de ? 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.' : 'No VAT charged under § 19 UStG.',
  ].join('\n');
}

function address(o: EmailOrder, lang: Lang) {
  return [`${o.first_name} ${o.last_name}`, o.street, o.extra, `${o.zip} ${o.city}`, countryName(o.country, lang)].filter(Boolean).join('\n');
}

export function orderConfirmation(o: EmailOrder, items: EmailItem[], lang: Lang, paymentPending: boolean): Email {
  if (lang === 'de') {
    return {
      subject: `Bestellbestätigung ${o.order_no}`,
      text: [
        `Hey ${o.first_name},`,
        '',
        `danke für deine Bestellung ${o.order_no}. Hiermit bestätigen wir den Eingang und nehmen deine Bestellung an.`,
        paymentPending ? 'Deine Lastschrift wird noch von der Bank bestätigt. Wir versenden, sobald die Zahlung eingegangen ist.' : '',
        '',
        lines(items, o, lang),
        '',
        'Lieferadresse:',
        address(o, lang),
        '',
        `Bestellung verfolgen: ${site()}/policies/tracking`,
        `AGB: ${site()}/policies/agb`,
        `Widerrufsbelehrung und Muster-Widerrufsformular: ${site()}/policies/widerruf`,
        '',
        sig,
      ].join('\n'),
    };
  }
  return {
    subject: `Order confirmation ${o.order_no}`,
    text: [
      `Hey ${o.first_name},`,
      '',
      `thanks for your order ${o.order_no}. This email confirms we received and accepted your order.`,
      paymentPending ? "Your direct debit is still being confirmed by the bank. We'll ship as soon as the payment arrives." : '',
      '',
      lines(items, o, lang),
      '',
      'Shipping address:',
      address(o, lang),
      '',
      `Track your order: ${site()}/policies/tracking`,
      `Terms: ${site()}/policies/agb`,
      `Right of withdrawal and sample form: ${site()}/policies/widerruf`,
      '',
      sig,
    ].join('\n'),
  };
}

export function shippedEmail(o: EmailOrder, lang: Lang): Email {
  const tracking = o.tracking ? `${o.carrier}: ${o.tracking}` : o.carrier ?? '';
  return lang === 'de'
    ? {
        subject: `Deine Bestellung ${o.order_no} ist unterwegs`,
        text: [`Hey ${o.first_name},`, '', `deine Bestellung ${o.order_no} ist unterwegs.`, tracking ? `Sendungsnummer: ${tracking}` : '', `Status: ${site()}/policies/tracking`, '', sig].join('\n'),
      }
    : {
        subject: `Your order ${o.order_no} is on its way`,
        text: [`Hey ${o.first_name},`, '', `your order ${o.order_no} has shipped.`, tracking ? `Tracking number: ${tracking}` : '', `Status: ${site()}/policies/tracking`, '', sig].join('\n'),
      };
}

export function paymentFailedEmail(o: EmailOrder, lang: Lang): Email {
  return lang === 'de'
    ? {
        subject: `Zahlung fehlgeschlagen · ${o.order_no}`,
        text: [`Hey ${o.first_name},`, '', `die Zahlung für deine Bestellung ${o.order_no} ist leider fehlgeschlagen. Die Bestellung wurde storniert.`, `Du kannst jederzeit neu bestellen: ${site()}/shop`, '', sig].join('\n'),
      }
    : {
        subject: `Payment failed · ${o.order_no}`,
        text: [`Hey ${o.first_name},`, '', `unfortunately the payment for your order ${o.order_no} failed, so the order was cancelled.`, `You can order again any time: ${site()}/shop`, '', sig].join('\n'),
      };
}

export function refundEmail(o: EmailOrder, amountCents: number, lang: Lang): Email {
  return lang === 'de'
    ? {
        subject: `Erstattung für ${o.order_no}`,
        text: [`Hey ${o.first_name},`, '', `wir haben ${fmtCents(amountCents, lang)} für deine Bestellung ${o.order_no} erstattet. Je nach Zahlungsart dauert die Gutschrift 5 bis 10 Werktage.`, '', sig].join('\n'),
      }
    : {
        subject: `Refund for ${o.order_no}`,
        text: [`Hey ${o.first_name},`, '', `we refunded ${fmtCents(amountCents, lang)} for your order ${o.order_no}. Depending on the payment method it takes 5 to 10 business days to arrive.`, '', sig].join('\n'),
      };
}

export function cartReminderEmail(firstName: string, items: { name: string; size: string; qty: number }[], lang: Lang): Email {
  const list = items.map((i) => `${i.qty} × ${i.name} · ${i.size}`).join('\n');
  return lang === 'de'
    ? {
        subject: 'Dein Warenkorb wartet noch',
        text: [`Hey ${firstName},`, '', 'du hast noch etwas im Warenkorb:', list, '', `Hier geht's weiter: ${site()}/checkout`, '', sig].join('\n'),
      }
    : {
        subject: 'Your cart is still waiting',
        text: [`Hey ${firstName},`, '', 'you left something in your cart:', list, '', `Pick up where you left off: ${site()}/checkout`, '', sig].join('\n'),
      };
}

export function vipEmail(firstName: string, code: string, pct: number, lang: Lang): Email {
  return lang === 'de'
    ? {
        subject: `Danke, dass du dabei bist: ${pct}% für dich`,
        text: [`Hey ${firstName},`, '', `danke für deine Treue. Mit dem Code ${code} bekommst du ${pct}% auf deine nächste Bestellung.`, `${site()}/shop`, '', sig].join('\n'),
      }
    : {
        subject: `Thanks for being here: ${pct}% for you`,
        text: [`Hey ${firstName},`, '', `thanks for your loyalty. Use code ${code} for ${pct}% off your next order.`, `${site()}/shop`, '', sig].join('\n'),
      };
}

export function invoiceEmail(o: EmailOrder, invoiceNo: string, lang: Lang): Email {
  return lang === 'de'
    ? {
        subject: `Rechnung ${invoiceNo} zu deiner Bestellung ${o.order_no}`,
        text: [`Hey ${o.first_name},`, '', `anbei findest du die Rechnung ${invoiceNo} zu deiner Bestellung ${o.order_no}.`, '', sig].join('\n'),
      }
    : {
        subject: `Invoice ${invoiceNo} for your order ${o.order_no}`,
        text: [`Hey ${o.first_name},`, '', `please find attached invoice ${invoiceNo} for your order ${o.order_no}.`, '', sig].join('\n'),
      };
}

import 'server-only';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { BUSINESS } from '@/config/business';
import { countryName } from './countries';
import type { OOrder } from './owner/types';

const eur = (c: number) => (c / 100).toFixed(2).replace('.', ',') + ' €';
// Standard PDF fonts use WinAnsi; replace characters outside it.
const safe = (s: string) => s.replace(/[—–]/g, '-').replace(/[^\x20-\x7E -ÿ€•…‚„“”‘’]/g, '?');

/**
 * Invoice for a Kleinunternehmer (§ 19 UStG): no VAT shown, with the required note.
 * Contains the mandatory details of § 14 Abs. 4 UStG except the VAT figures.
 */
export async function invoicePdf(order: OOrder, invoiceNo: string, issued: Date): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.07, 0.07, 0.07);
  const grey = rgb(0.43, 0.43, 0.43);
  let y = 790;
  const text = (s: string, x: number, size = 10, f = font, color = ink) => page.drawText(safe(s), { x, y, size, font: f, color });
  const right = (s: string, xRight: number, size = 10, f = font) => page.drawText(safe(s), { x: xRight - f.widthOfTextAtSize(safe(s), size), y, size, font: f, color: ink });

  text(BUSINESS.brand, 50, 20, bold);
  y -= 16;
  text(`${BUSINESS.name} · ${BUSINESS.street} · ${BUSINESS.zipCity}`, 50, 8, font, grey);
  y -= 40;
  for (const line of [`${order.firstName} ${order.lastName}`, order.street, order.extra, `${order.zip} ${order.city}`, countryName(order.country, 'de')].filter(Boolean)) {
    text(line, 50, 10);
    y -= 14;
  }
  y = 690;
  const date = issued.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' });
  const delivered = new Date(order.shippedAt ?? order.paidAt ?? order.placedAt).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' });
  for (const [k, v] of [
    ['Rechnungsnummer', invoiceNo],
    ['Rechnungsdatum', date],
    ['Leistungsdatum', delivered],
    ['Bestellnummer', order.no],
  ]) {
    text(k, 360, 9, font, grey);
    right(v, 545, 9);
    y -= 14;
  }
  y -= 30;
  text('Rechnung', 50, 18, bold);
  y -= 30;
  text('Artikel', 50, 9, bold);
  text('Größe', 330, 9, bold);
  right('Menge', 420, 9, bold);
  right('Einzelpreis', 480, 9, bold);
  right('Gesamt', 545, 9, bold);
  y -= 8;
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.6, color: ink });
  y -= 16;
  for (const i of order.items) {
    text(i.name, 50, 10);
    text(i.size, 330, 10);
    right(String(i.qty), 420, 10);
    right(eur(i.unitCents), 480, 10);
    right(eur(i.unitCents * i.qty), 545, 10);
    y -= 16;
  }
  y -= 6;
  page.drawLine({ start: { x: 330, y }, end: { x: 545, y }, thickness: 0.4, color: grey });
  y -= 16;
  const sum = (k: string, v: string, f = font) => {
    text(k, 330, 10, f);
    right(v, 545, 10, f);
    y -= 16;
  };
  sum('Zwischensumme', eur(order.subtotalCents));
  if (order.discountCents) sum(`Rabatt (${order.discountCode ?? ''})`, '-' + eur(order.discountCents));
  sum('Versand', order.shippingCents ? eur(order.shippingCents) : '0,00 €');
  sum('Gesamtbetrag', eur(order.totalCents), bold);
  if (order.refundedCents) sum('Erstattet', '-' + eur(order.refundedCents));
  y -= 20;
  text('Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.', 50, 10);
  y -= 14;
  text(`Bezahlt am ${new Date(order.paidAt ?? order.placedAt).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' })} per ${order.method || 'Online-Zahlung'}.`, 50, 10);

  y = 70;
  page.drawLine({ start: { x: 50, y: y + 14 }, end: { x: 545, y: y + 14 }, thickness: 0.4, color: grey });
  text(`${BUSINESS.name} · ${BUSINESS.street} · ${BUSINESS.zipCity} · ${BUSINESS.email} · ${BUSINESS.phone}`, 50, 7, font, grey);
  y -= 11;
  text(`Inhaber: ${BUSINESS.owner} · Steuernummer: ${BUSINESS.taxNumber}`, 50, 7, font, grey);

  return pdf.save();
}

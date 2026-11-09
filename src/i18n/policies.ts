// Policies / service / legal page content (verbatim from Policies.dc.html).
// Shipping amounts are injected from the shop settings so legal texts match checkout.
import type { Lang } from '@/lib/types';

export type Block =
  | { type: 'text'; h?: string; p: string }
  | { type: 'note'; p: string }
  | { type: 'table'; h?: string; rows: [string, string][] }
  | { type: 'list'; h?: string; items: string[]; bad?: boolean }
  | { type: 'steps'; h?: string; steps: [string, string][] }
  | { type: 'faq' }
  | { type: 'form'; h: string }
  | { type: 'track'; h: string }
  | { type: 'contact' }
  | { type: 'image'; src: string; alt: string; width: number; height: number };

export interface PolicyPage {
  eyebrow: string;
  title: string;
  intro?: string;
  legal?: boolean;
  blocks: Block[];
}

export interface ShipAmounts {
  de: string;
  intl: string;
  free: string;
}

export const POLICY_KEYS = ['shipping', 'returns', 'faq', 'tracking', 'contact', 'impressum', 'datenschutz', 'agb', 'widerruf', 'gewaehrleistung'] as const;
export type PolicyKey = (typeof POLICY_KEYS)[number];

export const GROUPS: ['service' | 'legal', PolicyKey[]][] = [
  ['service', ['shipping', 'returns', 'faq', 'tracking', 'contact']],
  ['legal', ['impressum', 'datenschutz', 'agb', 'widerruf', 'gewaehrleistung']],
];

const ADDR = 'John Rasch\nTILL I COLLAPSE ORIGINALS\nAn der Oberen Au 4\n85072 Eichstätt\nDeutschland';
export const LEGAL_UPDATED = '06.11.2026';

export function policyPage(key: PolicyKey, lang: Lang, s: ShipAmounts): PolicyPage {
  const pages: Record<PolicyKey, Record<Lang, PolicyPage>> = {
    shipping: {
      de: {
        eyebrow: 'Service / Versand',
        title: 'Versand & Zahlung',
        intro: 'Bestellungen bis 14 Uhr verlassen unser Lager am selben Werktag. Versand mit DHL und Hermes.',
        blocks: [
          { type: 'table', h: 'Versandkosten', rows: [['Deutschland (2 bis 5 Werktage)', s.de], ['International', s.intl], [`Ab ${s.free} Bestellwert`, 'Kostenlos']] },
          { type: 'text', h: 'Kostenloser Versand', p: `Die ${s.free.replace(/\s/g, '-')}-Grenze gilt für den Warenwert nach Abzug von Rabattcodes.` },
          { type: 'list', h: 'Zahlungsarten', items: ['Visa, Mastercard, American Express (über Stripe)', 'PayPal'] },
          { type: 'text', h: 'Preise', p: 'Alle Preise sind Endpreise in Euro zuzüglich Versandkosten. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).' },
          { type: 'text', h: 'Sendungsverfolgung', p: 'Nach dem Versand erhältst du deine Sendungsnummer per E-Mail. Du kannst deine Bestellung jederzeit unter Track Order verfolgen.' },
        ],
      },
      en: {
        eyebrow: 'Service / Shipping',
        title: 'Shipping & Payment',
        intro: 'Orders placed before 2 pm leave our warehouse the same business day. Shipped with DHL and Hermes.',
        blocks: [
          { type: 'table', h: 'Shipping rates', rows: [['Germany (2 to 5 business days)', s.de], ['International', s.intl], [`Orders over ${s.free}`, 'Free']] },
          { type: 'text', h: 'Free shipping', p: `The ${s.free} threshold applies to the order value after discount codes.` },
          { type: 'list', h: 'Payment methods', items: ['Visa, Mastercard, American Express (via Stripe)', 'PayPal'] },
          { type: 'text', h: 'Prices', p: 'All prices are final prices in euros, plus shipping. No VAT is charged under § 19 UStG (German small business regulation).' },
          { type: 'text', h: 'Tracking', p: 'Once your order ships you receive a tracking number by email. Track it any time under Track Order.' },
        ],
      },
    },
    returns: {
      de: {
        eyebrow: 'Service / Rückgabe',
        title: 'Einfache Rückgabe',
        intro: 'Passt nicht? Kein Problem. Du hast 14 Tage nach Erhalt Zeit, ungetragene Ware zurückzuschicken und dein Geld zurückzubekommen.',
        blocks: [
          { type: 'steps', h: 'So funktioniert es', steps: [['Kontakt aufnehmen', 'Schreibe innerhalb von 14 Tagen an company@ticoriginals.com mit deiner Bestellnummer.'], ['Ware verpacken', 'Artikel im Originalzustand (ungetragen, ungewaschen, Etiketten dran) sicher verpacken.'], ['Zurückschicken', 'Sende das Paket an die Rücksendeadresse, die wir dir mitteilen. Versicherter Versand empfohlen.'], ['Rückerstattung', 'Nach Erhalt und Prüfung erstatten wir den Betrag innerhalb von 5 bis 10 Werktagen auf dein Zahlungsmittel.']] },
          { type: 'list', h: 'Rückgabebedingungen', items: ['Rückgabe innerhalb von 14 Tagen nach Erhalt', 'Ungetragen, ungewaschen, im Originalzustand', 'Original-Etiketten und -Verpackung vorhanden', 'Kaufnachweis (Bestellnummer oder Beleg)'] },
          { type: 'list', bad: true, h: 'Wir akzeptieren nicht', items: ['Getragene, gewaschene oder beschädigte Artikel', 'Artikel ohne Original-Etiketten', 'Unterwäsche und Boxer (aus Hygienegründen)', 'Als Endverkauf markierte Sale-Artikel'] },
          { type: 'text', h: 'Kosten der Rücksendung', p: 'Die Rücksendekosten trägt der Kunde, außer bei fehlerhafter oder falsch gelieferter Ware. In diesen Fällen übernehmen wir die vollen Rücksendekosten.' },
          { type: 'text', h: 'Umtausch', p: 'Wir bieten keinen direkten Umtausch an. Für Größen- oder Farbwechsel schicke den Artikel zur Erstattung zurück und bestelle neu.' },
          { type: 'note', p: 'Als Verbraucher in der EU hast du ein gesetzliches Widerrufsrecht von 14 Tagen ohne Angabe von Gründen. Details siehe Widerrufsbelehrung.' },
        ],
      },
      en: {
        eyebrow: 'Service / Returns',
        title: 'Easy Returns',
        intro: 'Not the right fit? No worries. You have 14 days from delivery to return unworn items for a full refund.',
        blocks: [
          { type: 'steps', h: 'How it works', steps: [['Contact us', 'Email company@ticoriginals.com with your order number within 14 days of delivery.'], ['Pack your item', 'Original condition (unworn, unwashed, tags attached) in secure packaging.'], ['Ship it back', 'Send the parcel to the return address we provide. Tracked shipping recommended.'], ['Get refunded', 'Once received and inspected, we refund your original payment method within 5 to 10 business days.']] },
          { type: 'list', h: 'Return conditions', items: ['Returned within 14 days of delivery', 'Unworn, unwashed and in original condition', 'Original tags and packaging attached', 'Proof of purchase (order number or receipt)'] },
          { type: 'list', bad: true, h: 'We cannot accept', items: ['Worn, washed or damaged items', 'Items without original tags', 'Underwear and boxers (hygiene reasons)', 'Sale items marked as final sale'] },
          { type: 'text', h: 'Return shipping costs', p: 'Return shipping is paid by the customer, except when the item is faulty or we shipped the wrong product. In those cases we cover the full return cost.' },
          { type: 'text', h: 'Exchanges', p: 'We do not offer direct exchanges. To change size or color, return the item for a refund and place a new order.' },
          { type: 'note', p: 'As an EU consumer you have a statutory 14-day right of withdrawal without giving reasons. See Right of Withdrawal for details.' },
        ],
      },
    },
    faq: {
      de: { eyebrow: 'Service / Help Desk', title: 'F.A.Q.', intro: 'Antworten auf die häufigsten Fragen. Nicht dabei? Schreib uns.', blocks: [{ type: 'faq' }] },
      en: { eyebrow: 'Service / Help Desk', title: 'F.A.Q.', intro: 'Answers to what everyone asks. Not here? Ask us.', blocks: [{ type: 'faq' }] },
    },
    tracking: {
      de: { eyebrow: 'Service / Sendungsverfolgung', title: 'Wo ist meine Ware?', blocks: [{ type: 'track', h: 'Bestellnummer eingeben' }] },
      en: { eyebrow: 'Service / Tracking', title: 'Where is my order?', blocks: [{ type: 'track', h: 'Enter your order number' }] },
    },
    contact: {
      de: { eyebrow: 'Service / Kontakt', title: 'Sag Hi.', intro: 'Fragen, Ideen, Kollabs? Wir hören zu. Schreib uns und wir melden uns.', blocks: [{ type: 'contact' }] },
      en: { eyebrow: 'Service / Contact', title: 'Say Hi.', intro: "Questions, ideas, collabs? We listen. Drop us a line and we'll be in touch.", blocks: [{ type: 'contact' }] },
    },
    impressum: {
      de: {
        eyebrow: 'Rechtliches',
        title: 'Impressum',
        legal: true,
        blocks: [
          { type: 'text', h: 'Angaben gemäß § 5 DDG', p: ADDR },
          { type: 'text', h: 'Kontakt', p: 'E-Mail: company@ticoriginals.com\nTelefon: +49 152 07889847' },
          { type: 'text', h: 'Umsatzsteuer', p: 'Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: DE462943223\nKleinunternehmer gemäß § 19 UStG, daher kein Ausweis der Umsatzsteuer.' },
          { type: 'text', h: 'Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV', p: ADDR },
          { type: 'text', h: 'EU-Streitschlichtung', p: 'Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.' },
        ],
      },
      en: {
        eyebrow: 'Legal',
        title: 'Imprint',
        legal: true,
        blocks: [
          { type: 'text', h: 'Information pursuant to § 5 DDG', p: ADDR },
          { type: 'text', h: 'Contact', p: 'Email: company@ticoriginals.com\nPhone: +49 152 07889847' },
          { type: 'text', h: 'VAT', p: 'VAT ID under § 27a UStG: DE462943223\nSmall business under § 19 UStG, no VAT is shown.' },
          { type: 'text', h: 'Responsible for content under § 18(2) MStV', p: ADDR },
          { type: 'text', h: 'EU dispute resolution', p: 'We are neither willing nor obliged to participate in dispute resolution proceedings before a consumer arbitration board.' },
        ],
      },
    },
    gewaehrleistung: {
      de: {
        eyebrow: 'Rechtliches',
        title: 'Gesetzliche Gewährleistung',
        legal: true,
        blocks: [
          { type: 'image', src: '/img/legal/gewaehrleistung-de.webp', width: 1169, height: 1600, alt: 'Gesetzliche Gewährleistung. Mindestens zwei Jahre gesetzliche Gewährleistung der Vertragsmäßigkeit für Waren, die in der Europäischen Union verkauft werden. Verbraucherinnen und Verbraucher können ihre Rechte im Rahmen des gesetzlichen Gewährleistungsrechts geltend machen, z. B. wenn die Waren nicht der Beschreibung entsprechen oder nicht bestimmungsgemäß funktionieren. Verkäufer haften für jede Vertragswidrigkeit, die zum Zeitpunkt der Lieferung der Waren bestand und innerhalb des Zeitraums der gesetzlichen Gewährleistung erkennbar wird. Verkäufer müssen in solchen Fällen eine kostenlose Nachbesserung oder kostenlose Ersatzlieferung anbieten, in bestimmten Fällen eine Preisminderung oder eine vollständige Erstattung des Kaufpreises. Was ist zu tun, wenn Sie vertragswidrige Waren erhalten? Melden Sie dem Verkäufer das Problem so bald wie möglich und legen Sie einen Kaufnachweis vor, z. B. die Quittung, Rechnung oder einen Kontoauszug.' },
          { type: 'text', p: 'Weitere Informationen: https://europa.eu/youreurope/garantien' },
        ],
      },
      en: {
        eyebrow: 'Legal',
        title: 'Legal Guarantee',
        legal: true,
        blocks: [
          { type: 'image', src: '/img/legal/gewaehrleistung-en.webp', width: 1132, height: 1600, alt: 'Legal guarantee. Minimum two-year legal guarantee protection for goods sold in the European Union. Consumers can claim their rights under the legal guarantee of conformity, for example if goods do not match the description or do not function as intended. Sellers are liable for any lack of conformity which existed when the goods were delivered, and which becomes apparent within the legal guarantee period. Sellers in such a situation are required to offer free repair or free replacement, in some cases a price reduction or full reimbursement. What to do if you receive non-conforming goods: contact the seller as soon as possible to report the issue and provide proof of purchase, such as a receipt, invoice, or bank statement.' },
          { type: 'text', p: 'More information: https://europa.eu/youreurope/guarantees' },
        ],
      },
    },
    datenschutz: {
      de: {
        eyebrow: 'Rechtliches',
        title: 'Datenschutz',
        legal: true,
        blocks: [
          { type: 'text', h: '1. Verantwortlicher', p: ADDR + '\ncompany@ticoriginals.com' },
          { type: 'text', h: '2. Bestellabwicklung', p: 'Zur Abwicklung deiner Bestellung verarbeiten wir Name, Anschrift, E-Mail, Telefonnummer und Bestelldaten (Art. 6 Abs. 1 lit. b DSGVO). Versanddaten geben wir an den beauftragten Versanddienstleister (DHL, Hermes) weiter.' },
          { type: 'text', h: '3. Zahlungsdienstleister', p: 'Kartenzahlungen werden über Stripe Payments Europe Ltd. abgewickelt, PayPal-Zahlungen über PayPal (Europe) S.à r.l. et Cie, S.C.A. Wir speichern keine vollständigen Kartendaten.' },
          { type: 'text', h: '4. Kundenkonto', p: 'Wenn du ein Konto anlegst, speichern wir E-Mail-Adresse, Passwort (nur als Hash), Lieferadressen und deine Bestellhistorie (Art. 6 Abs. 1 lit. b DSGVO). Das Konto kannst du jederzeit löschen lassen, schreib uns dazu an company@ticoriginals.com.' },
          { type: 'text', h: '5. Kontaktformular und E-Mail', p: 'Wenn du uns über das Kontaktformular oder per E-Mail schreibst, speichern wir Name, E-Mail-Adresse und deine Nachricht, um die Anfrage zu beantworten (Art. 6 Abs. 1 lit. b und f DSGVO).' },
          { type: 'text', h: '6. Newsletter', p: 'Für den Newsletter speichern wir deine E-Mail-Adresse auf Grundlage deiner Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Wir nutzen das Double-Opt-in-Verfahren: Du erhältst zuerst eine E-Mail mit Bestätigungslink und wirst erst danach in den Verteiler aufgenommen. Abmeldung jederzeit über den Link in jeder E-Mail.' },
          { type: 'text', h: '7. Hosting und technische Dienstleister', p: 'Unsere Website läuft bei Vercel Inc. (USA). Die Datenbank mit Konten und Bestellungen betreibt Supabase (Rechenzentrum in der EU, Irland). E-Mails (Bestellbestätigung, Versandmail, Newsletter) versenden wir über Resend. Dabei werden technisch bedingt Server-Logdaten wie IP-Adresse, Zeitpunkt und aufgerufene Seite verarbeitet (Art. 6 Abs. 1 lit. f DSGVO). Soweit Daten in die USA übermittelt werden, geschieht das auf Grundlage des EU-US Data Privacy Framework oder von Standardvertragsklauseln.' },
          { type: 'text', h: '8. Missbrauchsschutz', p: 'Zum Schutz vor Missbrauch (z. B. automatisierte Bestellungen oder Formularspam) speichern wir einen gekürzten, nicht rückrechenbaren Hash deiner IP-Adresse für kurze Zeit (Art. 6 Abs. 1 lit. f DSGVO).' },
          { type: 'text', h: '9. Speicherdauer', p: 'Bestell- und Rechnungsdaten bewahren wir wegen steuer- und handelsrechtlicher Pflichten bis zu zehn Jahre auf. Alle übrigen Daten löschen wir, sobald der Zweck entfällt oder du deine Einwilligung widerrufst.' },
          { type: 'text', h: '10. Cookies', p: 'Wir verwenden nur technisch notwendige Cookies bzw. lokale Speicherung (z. B. Warenkorb, Spracheinstellung, Login). Analyse- oder Marketing-Cookies setzen wir nicht ein, daher ist keine Einwilligung nötig.' },
          { type: 'text', h: '11. Deine Rechte', p: 'Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch sowie das Recht auf Beschwerde bei einer Aufsichtsbehörde, zum Beispiel beim Bayerischen Landesamt für Datenschutzaufsicht (BayLDA).' },
        ],
      },
      en: {
        eyebrow: 'Legal',
        title: 'Privacy Policy',
        legal: true,
        blocks: [
          { type: 'text', h: '1. Controller', p: ADDR + '\ncompany@ticoriginals.com' },
          { type: 'text', h: '2. Order processing', p: 'To process your order we handle name, address, email, phone number and order data (Art. 6(1)(b) GDPR). Shipping data is shared with the carrier (DHL, Hermes).' },
          { type: 'text', h: '3. Payment providers', p: 'Card payments are processed by Stripe Payments Europe Ltd., PayPal payments by PayPal (Europe) S.à r.l. et Cie, S.C.A. We never store full card details.' },
          { type: 'text', h: '4. Customer account', p: 'If you create an account we store your email address, password (as a hash only), delivery addresses and order history (Art. 6(1)(b) GDPR). You can have your account deleted at any time by writing to company@ticoriginals.com.' },
          { type: 'text', h: '5. Contact form and email', p: 'If you write to us via the contact form or email we store your name, email address and message to answer your request (Art. 6(1)(b) and (f) GDPR).' },
          { type: 'text', h: '6. Newsletter', p: 'For the newsletter we store your email address based on your consent (Art. 6(1)(a) GDPR). We use double opt-in: you first receive an email with a confirmation link and are only added to the list after confirming. Unsubscribe any time via the link in every email.' },
          { type: 'text', h: '7. Hosting and technical providers', p: 'Our website runs on Vercel Inc. (USA). The database with accounts and orders is operated by Supabase (data centre in the EU, Ireland). We send emails (order confirmation, shipping, newsletter) through Resend. Technically this involves server log data such as IP address, time and page requested (Art. 6(1)(f) GDPR). Where data is transferred to the USA this is based on the EU-US Data Privacy Framework or standard contractual clauses.' },
          { type: 'text', h: '8. Abuse protection', p: 'To protect against abuse (e.g. automated orders or form spam) we store a shortened, non-reversible hash of your IP address for a short time (Art. 6(1)(f) GDPR).' },
          { type: 'text', h: '9. Retention', p: 'We keep order and invoice data for up to ten years because of tax and commercial law obligations. All other data is deleted once the purpose no longer applies or you withdraw consent.' },
          { type: 'text', h: '10. Cookies', p: 'We only use technically necessary cookies and local storage (e.g. cart, language, login). We do not use analytics or marketing cookies, so no consent is required.' },
          { type: 'text', h: '11. Your rights', p: 'You have the right to access, rectification, erasure, restriction of processing, data portability and objection, and the right to lodge a complaint with a supervisory authority, for example the Bavarian State Office for Data Protection Supervision (BayLDA).' },
        ],
      },
    },
    agb: {
      de: {
        eyebrow: 'Rechtliches',
        title: 'AGB',
        legal: true,
        blocks: [
          { type: 'text', h: '§ 1 Geltungsbereich', p: 'Diese AGB gelten für alle Bestellungen über ticoriginals.com zwischen TILL I COLLAPSE ORIGINALS und Verbrauchern.' },
          { type: 'text', h: '§ 2 Vertragsschluss', p: 'Die Darstellung der Produkte im Shop ist kein bindendes Angebot. Mit dem Klick auf „Zahlungspflichtig bestellen“ gibst du ein verbindliches Angebot ab. Der Vertrag kommt mit unserer Bestellbestätigung per E-Mail zustande.' },
          { type: 'text', h: '§ 3 Preise und Versand', p: `Alle Preise sind Endpreise; gemäß § 19 UStG wird keine Umsatzsteuer berechnet. Versandkosten: Deutschland ${s.de}, International ${s.intl}, ab ${s.free} Bestellwert kostenlos.` },
          { type: 'text', h: '§ 4 Zahlung', p: 'Zahlung per Kreditkarte (Visa, Mastercard, AMEX über Stripe) oder PayPal. Die Zahlung ist sofort fällig.' },
          { type: 'text', h: '§ 5 Eigentumsvorbehalt', p: 'Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.' },
          { type: 'text', h: '§ 6 Widerrufsrecht', p: 'Verbrauchern steht ein gesetzliches Widerrufsrecht zu. Einzelheiten siehe Widerrufsbelehrung.' },
          { type: 'text', h: '§ 7 Gewährleistung', p: 'Es gelten die gesetzlichen Mängelhaftungsrechte.' },
        ],
      },
      en: {
        eyebrow: 'Legal',
        title: 'Terms & Conditions',
        legal: true,
        blocks: [
          { type: 'text', h: '§ 1 Scope', p: 'These terms apply to all orders placed via ticoriginals.com between TILL I COLLAPSE ORIGINALS and consumers.' },
          { type: 'text', h: '§ 2 Contract', p: 'Product listings are not a binding offer. By clicking "Place order" you submit a binding offer. The contract is concluded with our order confirmation email.' },
          { type: 'text', h: '§ 3 Prices and shipping', p: `All prices are final prices; no VAT is charged under § 19 UStG. Shipping: Germany ${s.de}, international ${s.intl}, free over ${s.free}.` },
          { type: 'text', h: '§ 4 Payment', p: 'Payment by card (Visa, Mastercard, AMEX via Stripe) or PayPal. Payment is due immediately.' },
          { type: 'text', h: '§ 5 Retention of title', p: 'Goods remain our property until paid in full.' },
          { type: 'text', h: '§ 6 Right of withdrawal', p: 'Consumers have a statutory right of withdrawal. See Right of Withdrawal for details.' },
          { type: 'text', h: '§ 7 Warranty', p: 'Statutory warranty rights apply.' },
        ],
      },
    },
    widerruf: {
      de: {
        eyebrow: 'Rechtliches',
        title: 'Widerrufsbelehrung',
        legal: true,
        blocks: [
          { type: 'text', h: 'Widerrufsrecht', p: 'Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem du oder ein von dir benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen hast.\n\nUm dein Widerrufsrecht auszuüben, musst du uns (' + ADDR.replace(/\n/g, ', ') + ', company@ticoriginals.com) mittels einer eindeutigen Erklärung (z. B. Brief oder E-Mail) über deinen Entschluss informieren. Du kannst dafür das Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.' },
          { type: 'text', h: 'Folgen des Widerrufs', p: 'Wenn du diesen Vertrag widerrufst, zahlen wir dir alle Zahlungen, die wir von dir erhalten haben, einschließlich der Lieferkosten (mit Ausnahme zusätzlicher Kosten für eine andere als die günstigste Standardlieferung), unverzüglich und spätestens binnen vierzehn Tagen zurück. Wir verwenden dasselbe Zahlungsmittel, das du bei der ursprünglichen Transaktion eingesetzt hast. Wir können die Rückzahlung verweigern, bis wir die Waren zurückerhalten haben.\n\nDu trägst die unmittelbaren Kosten der Rücksendung der Waren.' },
          { type: 'form', h: 'Muster-Widerrufsformular' },
        ],
      },
      en: {
        eyebrow: 'Legal',
        title: 'Right of Withdrawal',
        legal: true,
        blocks: [
          { type: 'text', h: 'Right of withdrawal', p: 'You have the right to withdraw from this contract within fourteen days without giving any reason. The withdrawal period is fourteen days from the day on which you, or a third party named by you who is not the carrier, take possession of the goods.\n\nTo exercise your right, inform us (' + ADDR.replace(/\n/g, ', ') + ', company@ticoriginals.com) by a clear statement (e.g. letter or email). You may use the sample withdrawal form, but it is not mandatory.' },
          { type: 'text', h: 'Effects of withdrawal', p: 'If you withdraw, we refund all payments received from you, including delivery costs (except extra costs for a delivery type other than the cheapest standard delivery), without undue delay and no later than fourteen days. We use the same payment method as the original transaction. We may withhold the refund until we have received the goods back.\n\nYou bear the direct cost of returning the goods.' },
          { type: 'form', h: 'Sample withdrawal form' },
        ],
      },
    },
  };
  return pages[key][lang];
}

export function faq(lang: Lang, s: ShipAmounts): [string, string][] {
  return lang === 'de'
    ? [
        ['Wie lange dauert der Versand?', 'Bestellungen bis 14 Uhr gehen am selben Werktag raus. Innerhalb Deutschlands dauert die Zustellung 2 bis 5 Werktage mit DHL oder Hermes.'],
        ['Was kostet der Versand?', `Deutschland ${s.de}, international ${s.intl}. Ab ${s.free} Bestellwert ist der Versand kostenlos.`],
        ['Kann ich meine Bestellung zurückgeben?', 'Ja, du hast 14 Tage Widerrufsrecht. Schreib uns an company@ticoriginals.com.'],
        ['Welche Zahlungsmethoden akzeptiert ihr?', 'Visa, Mastercard und AMEX über Stripe sowie PayPal.'],
        ['Liefert ihr ins Ausland?', `Ja, international für ${s.intl} Versand.`],
        ['Wie verfolge ich meine Bestellung?', 'Du bekommst nach dem Versand eine Sendungsnummer per E-Mail. Oder nutze Track Order mit deiner Bestellnummer.'],
        ['Welche Größen gibt es?', 'Die meisten Styles gibt es in XS bis 2XL. Die genaue Verfügbarkeit siehst du auf jeder Produktseite.'],
        ['Wird Mehrwertsteuer berechnet?', 'Nein. Als Kleinunternehmer gemäß § 19 UStG berechnen wir keine Umsatzsteuer. Die angezeigten Preise sind Endpreise.'],
      ]
    : [
        ['How long does shipping take?', 'Orders before 2 pm ship the same business day. Delivery within Germany takes 2 to 5 business days via DHL or Hermes.'],
        ['How much is shipping?', `Germany ${s.de}, international ${s.intl}. Free on orders over ${s.free}.`],
        ['Can I return my order?', 'Yes, you have a 14-day right of withdrawal. Email company@ticoriginals.com.'],
        ['Which payment methods do you accept?', 'Visa, Mastercard and AMEX via Stripe, plus PayPal.'],
        ['Do you ship internationally?', `Yes, international shipping is ${s.intl}.`],
        ['How do I track my order?', "You'll get a tracking number by email once it ships. Or use Track Order with your order number."],
        ['What sizes do you offer?', 'Most styles come in XS to 2XL. Exact availability is shown on each product page.'],
        ['Is VAT charged?', 'No. As a small business under § 19 UStG we do not charge VAT. Displayed prices are final prices.'],
      ];
}

export const POLICY_T = {
  de: {
    service: 'Service',
    legal: 'Rechtliches',
    track: 'Suchen',
    notFound: 'Bestellung nicht gefunden. Prüfe deine Bestellnummer.',
    orderNo: 'Bestellnummer',
    total: 'Gesamt',
    subject: 'Betreff',
    message: 'Nachricht',
    send: 'Nachricht senden',
    sent: 'Gesendet ✓',
    sending: 'Wird gesendet …',
    sendFailed: 'Senden fehlgeschlagen. Bitte versuche es erneut oder schreib uns per E-Mail.',
    phone: 'Telefon',
    address: 'Adresse',
    replyTime: 'Wir antworten an Werktagen innerhalb von 24 Stunden.',
    updated: 'Zuletzt aktualisiert:',
    showForm: 'Widerrufsformular anzeigen',
    hideForm: 'Widerrufsformular ausblenden',
    labels: { shipping: 'Versand & Zahlung', returns: 'Rückgabe', faq: 'FAQ', tracking: 'Track Order', contact: 'Kontakt', impressum: 'Impressum', datenschutz: 'Datenschutz', agb: 'AGB', widerruf: 'Widerrufsrecht', gewaehrleistung: 'Gewährleistung' } as Record<PolicyKey, string>,
    formText: 'An:\nTILL I COLLAPSE ORIGINALS, An der Oberen Au 4, 85072 Eichstätt, company@ticoriginals.com\n\nHiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*):\n______________________________________\n\nBestellt am (*) / erhalten am (*): ____________\nName des/der Verbraucher(s): ____________\nAnschrift des/der Verbraucher(s): ____________\nUnterschrift (nur bei Mitteilung auf Papier): ____________\nDatum: ____________\n\n(*) Unzutreffendes streichen.',
  },
  en: {
    service: 'Service',
    legal: 'Legal',
    track: 'Track',
    notFound: 'Order not found. Check your order number.',
    orderNo: 'Order number',
    total: 'Total',
    subject: 'Subject',
    message: 'Message',
    send: 'Send message',
    sent: 'Sent ✓',
    sending: 'Sending …',
    sendFailed: 'Sending failed. Please try again or email us.',
    phone: 'Phone',
    address: 'Address',
    replyTime: 'We reply within 24 hours on business days.',
    updated: 'Last updated:',
    showForm: 'Show withdrawal form',
    hideForm: 'Hide withdrawal form',
    labels: { shipping: 'Shipping & Payment', returns: 'Returns', faq: 'FAQ', tracking: 'Track Order', contact: 'Contact', impressum: 'Imprint', datenschutz: 'Privacy Policy', agb: 'Terms (AGB)', widerruf: 'Right of Withdrawal', gewaehrleistung: 'Legal Guarantee' } as Record<PolicyKey, string>,
    formText: 'To:\nTILL I COLLAPSE ORIGINALS, An der Oberen Au 4, 85072 Eichstätt, company@ticoriginals.com\n\nI/We (*) hereby withdraw from the contract concluded by me/us (*) for the purchase of the following goods (*):\n______________________________________\n\nOrdered on (*) / received on (*): ____________\nName of consumer(s): ____________\nAddress of consumer(s): ____________\nSignature (only if notifying on paper): ____________\nDate: ____________\n\n(*) Delete as applicable.',
  },
};

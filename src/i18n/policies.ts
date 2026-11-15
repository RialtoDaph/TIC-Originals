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
export const LEGAL_UPDATED = '15.11.2026';

const WITHDRAWAL_CONTACT = {
  de: `${ADDR.replace(/\n/g, ', ')}, Telefon: +49 152 07889847, E-Mail: company@ticoriginals.com`,
  en: `${ADDR.replace(/\n/g, ', ')}, phone: +49 152 07889847, email: company@ticoriginals.com`,
};

/**
 * Widerrufsbelehrung following the official template (Anlage 1 zu Art. 246a § 1 Abs. 2 S. 2 EGBGB),
 * addressed with "du". Shared by the policy page and the order confirmation email (§ 312f BGB).
 * The Muster-Widerrufsformular is POLICY_T[lang].formText.
 */
export function withdrawalSections(lang: Lang): [string, string][] {
  return lang === 'de'
    ? [
        [
          'Widerrufsrecht',
          'Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.\n\n' +
            'Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem du oder ein von dir benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen hast bzw. hat.\n\n' +
            `Um dein Widerrufsrecht auszuüben, musst du uns (${WITHDRAWAL_CONTACT.de}) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder E-Mail) über deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist. Du kannst den Widerruf auch über die Widerrufsfunktion auf unserer Website erklären (Schaltfläche „Vertrag widerrufen“, www.ticoriginals.com/vertrag-widerrufen); wir bestätigen dir den Eingang dann unverzüglich per E-Mail.\n\n` +
            'Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.',
        ],
        [
          'Folgen des Widerrufs',
          'Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass du eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt hast), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über deinen Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der ursprünglichen Transaktion eingesetzt hast, es sei denn, mit dir wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden dir wegen dieser Rückzahlung Entgelte berechnet.\n\n' +
            'Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder bis du den Nachweis erbracht hast, dass du die Waren zurückgesandt hast, je nachdem, welches der frühere Zeitpunkt ist.\n\n' +
            'Du hast die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem du uns über den Widerruf dieses Vertrags unterrichtest, an uns zurückzusenden oder zu übergeben. Die Frist ist gewahrt, wenn du die Waren vor Ablauf der Frist von vierzehn Tagen absendest.\n\n' +
            'Du trägst die unmittelbaren Kosten der Rücksendung der Waren.\n\n' +
            'Du musst für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser Wertverlust auf einen zur Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise der Waren nicht notwendigen Umgang mit ihnen zurückzuführen ist.',
        ],
      ]
    : [
        [
          'Right of withdrawal',
          'You have the right to withdraw from this contract within fourteen days without giving any reason.\n\n' +
            'The withdrawal period will expire after fourteen days from the day on which you acquire, or a third party other than the carrier and indicated by you acquires, physical possession of the goods.\n\n' +
            `To exercise the right of withdrawal, you must inform us (${WITHDRAWAL_CONTACT.en}) of your decision to withdraw from this contract by an unequivocal statement (e.g. a letter sent by post or email). You may use the attached sample withdrawal form, but it is not obligatory. You can also declare your withdrawal through the withdrawal function on our website (button "Withdraw from contract", www.ticoriginals.com/vertrag-widerrufen); we will then confirm receipt by email without delay.\n\n` +
            'To meet the withdrawal deadline, it is sufficient for you to send your communication concerning your exercise of the right of withdrawal before the withdrawal period has expired.',
        ],
        [
          'Effects of withdrawal',
          'If you withdraw from this contract, we shall reimburse to you all payments received from you, including the costs of delivery (with the exception of the supplementary costs resulting from your choice of a type of delivery other than the least expensive type of standard delivery offered by us), without undue delay and in any event not later than fourteen days from the day on which we are informed about your decision to withdraw from this contract. We will carry out such reimbursement using the same means of payment as you used for the initial transaction, unless you have expressly agreed otherwise; in any event, you will not incur any fees as a result of such reimbursement.\n\n' +
            'We may withhold reimbursement until we have received the goods back or you have supplied evidence of having sent back the goods, whichever is the earliest.\n\n' +
            'You shall send back the goods or hand them over to us without undue delay and in any event not later than fourteen days from the day on which you communicate your withdrawal from this contract to us. The deadline is met if you send back the goods before the period of fourteen days has expired.\n\n' +
            'You will have to bear the direct cost of returning the goods.\n\n' +
            'You are only liable for any diminished value of the goods resulting from the handling other than what is necessary to establish the nature, characteristics and functioning of the goods.',
        ],
      ];
}

const PAYMENT_TEXT = {
  de: 'Kreditkarte (Visa, Mastercard, AMEX), PayPal, Klarna sowie ggf. weitere im Checkout angezeigte Zahlungsarten (z. B. Apple Pay, Google Pay, SEPA-Lastschrift), abgewickelt über Stripe',
  en: 'Credit card (Visa, Mastercard, AMEX), PayPal, Klarna and, where shown at checkout, other payment methods (e.g. Apple Pay, Google Pay, SEPA Direct Debit), processed by Stripe',
};

export function policyPage(key: PolicyKey, lang: Lang, s: ShipAmounts): PolicyPage {
  const pages: Record<PolicyKey, Record<Lang, PolicyPage>> = {
    shipping: {
      de: {
        eyebrow: 'Service / Versand',
        title: 'Versand & Zahlung',
        intro: 'Lagerware verschicken wir innerhalb von 1–3 Werktagen mit DHL. Vorbestellungen ab dem beim Artikel angegebenen Versandtermin.',
        blocks: [
          { type: 'table', h: 'Versandkosten', rows: [['Deutschland (1 bis 4 Werktage)', s.de], ['EU-Länder', s.intl], [`Deutschland ab ${s.free} Bestellwert`, 'Kostenlos']] },
          { type: 'text', h: 'Kostenloser Versand', p: `Die ${s.free.replace(/\s/g, '-')}-Grenze gilt für Lieferungen innerhalb Deutschlands und für den Warenwert nach Abzug von Rabattcodes. Wir liefern derzeit nur innerhalb der EU.` },
          { type: 'list', h: 'Zahlungsarten', items: ['Kreditkarte (Visa, Mastercard, AMEX)', 'PayPal', 'Klarna', 'Ggf. weitere im Checkout angezeigte Zahlungsarten (z. B. Apple Pay, Google Pay, SEPA-Lastschrift)', 'Alle Zahlungen werden über Stripe abgewickelt.'] },
          { type: 'text', h: 'Preise', p: 'Alle Preise sind Endpreise in Euro zuzüglich Versandkosten. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).' },
          { type: 'text', h: 'Sendungsverfolgung', p: 'Nach dem Versand erhältst du deine Sendungsnummer per E-Mail. Du kannst deine Bestellung jederzeit unter Track Order verfolgen.' },
        ],
      },
      en: {
        eyebrow: 'Service / Shipping',
        title: 'Shipping & Payment',
        intro: 'In-stock items ship within 1–3 business days via DHL. Pre-orders ship from the date shown with the item.',
        blocks: [
          { type: 'table', h: 'Shipping rates', rows: [['Germany (1 to 4 business days)', s.de], ['EU countries', s.intl], [`Germany, orders over ${s.free}`, 'Free']] },
          { type: 'text', h: 'Free shipping', p: `The ${s.free} threshold applies to deliveries within Germany and to the order value after discount codes. We currently ship within the EU only.` },
          { type: 'list', h: 'Payment methods', items: ['Credit card (Visa, Mastercard, AMEX)', 'PayPal', 'Klarna', 'Other payment methods where shown at checkout (e.g. Apple Pay, Google Pay, SEPA Direct Debit)', 'All payments are processed by Stripe.'] },
          { type: 'text', h: 'Prices', p: 'All prices are final prices in euros, plus shipping. No VAT is charged under § 19 UStG (German small business regulation).' },
          { type: 'text', h: 'Tracking', p: 'Once your order ships you receive a tracking number by email. Track it any time under Track Order.' },
        ],
      },
    },
    returns: {
      de: {
        eyebrow: 'Service / Rückgabe',
        title: 'Einfache Rückgabe',
        intro: 'Passt nicht? Kein Problem. Du kannst deine Bestellung innerhalb von 14 Tagen nach Erhalt ohne Angabe von Gründen widerrufen und bekommst dein Geld zurück.',
        blocks: [
          { type: 'steps', h: 'So funktioniert es', steps: [['Widerruf erklären', 'Schreib uns innerhalb von 14 Tagen nach Erhalt eine kurze Nachricht an company@ticoriginals.com, gerne mit Bestellnummer. Du kannst auch das Muster-Widerrufsformular nutzen, musst aber nicht.'], ['Ware verpacken', 'Pack die Artikel sicher ein, am besten in der Originalverpackung.'], ['Zurückschicken', 'Schick das Paket spätestens 14 Tage nach deinem Widerruf an die Adresse, die wir dir mitteilen. Versand mit Sendungsnummer empfohlen.'], ['Rückerstattung', 'Wir erstatten dir den Kaufpreis inklusive der ursprünglichen Standard-Versandkosten spätestens 14 Tage nach Eingang deines Widerrufs über dein ursprüngliches Zahlungsmittel. Wir dürfen die Erstattung zurückhalten, bis die Ware bei uns ist oder du die Rücksendung nachgewiesen hast.']] },
          { type: 'list', h: 'Gut zu wissen', items: ['Das gesetzliche Widerrufsrecht gilt für alle Artikel, auch für reduzierte Sale-Artikel und Vorbestellungen.', 'Anprobieren wie im Laden ist völlig okay. Bitte trag die Sachen nicht, wasch sie nicht und lass die Etiketten dran.', 'Ein Kaufnachweis ist nicht nötig. Die Bestellnummer hilft uns aber, deine Rücksendung schnell zuzuordnen.'] },
          { type: 'text', h: 'Wertersatz', p: 'Verliert die Ware an Wert, weil du sie über das Prüfen von Beschaffenheit, Eigenschaften und Funktionsweise hinaus benutzt hast (z. B. getragen, gewaschen oder Etiketten entfernt), kannst du trotzdem widerrufen. Wir können dann aber Ersatz für den Wertverlust verlangen.' },
          { type: 'text', h: 'Kosten der Rücksendung', p: 'Die unmittelbaren Kosten der Rücksendung trägst du. Ist die Ware mangelhaft oder haben wir dir den falschen Artikel geschickt, übernehmen wir die Rücksendekosten.' },
          { type: 'text', h: 'Umtausch', p: 'Wir bieten keinen direkten Umtausch an. Für Größen- oder Farbwechsel schicke den Artikel zur Erstattung zurück und bestelle neu.' },
          { type: 'note', p: 'Diese Seite fasst dein gesetzliches Widerrufsrecht kurz zusammen. Maßgeblich ist die Widerrufsbelehrung.' },
        ],
      },
      en: {
        eyebrow: 'Service / Returns',
        title: 'Easy Returns',
        intro: 'Not the right fit? No worries. You can withdraw from your order within 14 days of delivery without giving a reason and get your money back.',
        blocks: [
          { type: 'steps', h: 'How it works', steps: [['Tell us', 'Send a short message to company@ticoriginals.com within 14 days of delivery, ideally with your order number. You can use the sample withdrawal form, but you do not have to.'], ['Pack your item', 'Pack the items securely, ideally in the original packaging.'], ['Ship it back', 'Send the parcel to the address we give you no later than 14 days after your withdrawal. Tracked shipping recommended.'], ['Get refunded', 'We refund the purchase price including the original standard shipping cost no later than 14 days after receiving your withdrawal, using your original payment method. We may withhold the refund until the goods are back with us or you have shown that you sent them.']] },
          { type: 'list', h: 'Good to know', items: ['The statutory right of withdrawal applies to all items, including sale items and pre-orders.', 'Trying things on like in a store is totally fine. Please do not wear or wash them and keep the tags on.', 'No proof of purchase needed. Your order number helps us match your return quickly, though.'] },
          { type: 'text', h: 'Loss of value', p: 'If the goods lose value because you handled them beyond what is needed to check their nature, characteristics and functioning (e.g. worn, washed or tags removed), you can still withdraw. We may then ask you to compensate for the loss in value.' },
          { type: 'text', h: 'Return shipping costs', p: 'You bear the direct cost of returning the goods. If the item is faulty or we shipped the wrong product, we cover the return cost.' },
          { type: 'text', h: 'Exchanges', p: 'We do not offer direct exchanges. To change size or color, return the item for a refund and place a new order.' },
          { type: 'note', p: 'This page is a short summary of your statutory right of withdrawal. The Right of Withdrawal page is authoritative.' },
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
          { type: 'text', h: '2. Bestellabwicklung', p: 'Zur Abwicklung deiner Bestellung verarbeiten wir Name, Anschrift, E-Mail, Telefonnummer und Bestelldaten (Art. 6 Abs. 1 lit. b DSGVO). Versanddaten geben wir an den beauftragten Versanddienstleister (DHL) weiter.' },
          { type: 'text', h: '3. Zahlungsdienstleister', p: 'Alle Zahlungen werden über Stripe Payments Europe Ltd. (Irland) abgewickelt (Art. 6 Abs. 1 lit. b DSGVO). Je nach gewählter Zahlungsart gibt Stripe die für die Zahlung nötigen Daten an den jeweiligen Anbieter weiter, zum Beispiel an PayPal (Europe) S.à r.l. et Cie, S.C.A. (Luxemburg), an Klarna Bank AB (publ) (Schweden) oder bei Apple Pay bzw. Google Pay an Apple bzw. Google. Wir speichern keine vollständigen Kartendaten.' },
          { type: 'text', h: '4. Kundenkonto', p: 'Wenn du ein Konto anlegst, speichern wir E-Mail-Adresse, Passwort (nur als Hash), Lieferadressen und deine Bestellhistorie (Art. 6 Abs. 1 lit. b DSGVO). Du kannst dein Konto jederzeit selbst auf der Kontoseite löschen oder uns an company@ticoriginals.com schreiben. Bestellungen, die wir aus steuer- und handelsrechtlichen Gründen aufbewahren müssen, bleiben dabei erhalten, werden aber von deinem Konto getrennt.' },
          { type: 'text', h: '5. Anmeldung mit Google', p: 'Wenn du dich für „Weiter mit Google“ entscheidest, wirst du zu Google weitergeleitet (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland). Nach deiner Anmeldung übermittelt uns Google deinen Namen, deine E-Mail-Adresse und ggf. dein Profilbild, damit wir dein Kundenkonto anlegen bzw. dich anmelden können (Art. 6 Abs. 1 lit. b DSGVO). Dabei können Daten an Google LLC in den USA übermittelt werden; das geschieht auf Grundlage des EU-US Data Privacy Framework. Die Anmeldung mit Google ist freiwillig, du kannst dich auch mit E-Mail und Passwort registrieren.' },
          { type: 'text', h: '6. Kontaktformular und E-Mail', p: 'Wenn du uns über das Kontaktformular oder per E-Mail schreibst, speichern wir Name, E-Mail-Adresse und deine Nachricht, um die Anfrage zu beantworten (Art. 6 Abs. 1 lit. b und f DSGVO).' },
          { type: 'text', h: '7. Newsletter', p: 'Für den Newsletter speichern wir deine E-Mail-Adresse auf Grundlage deiner Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Wir nutzen das Double-Opt-in-Verfahren: Du erhältst zuerst eine E-Mail mit Bestätigungslink und wirst erst danach in den Verteiler aufgenommen. Abmeldung jederzeit über den Link in jeder E-Mail.' },
          { type: 'text', h: '8. Hosting und technische Dienstleister', p: 'Unsere Website läuft bei Vercel Inc. (USA). Die Datenbank mit Konten und Bestellungen betreibt Supabase (Rechenzentrum in der EU, Irland). E-Mails (Bestellbestätigung, Versandmail, Newsletter) versenden wir über Resend. Dabei werden technisch bedingt Server-Logdaten wie IP-Adresse, Zeitpunkt und aufgerufene Seite verarbeitet (Art. 6 Abs. 1 lit. f DSGVO). Soweit Daten in die USA übermittelt werden, geschieht das auf Grundlage des EU-US Data Privacy Framework oder von Standardvertragsklauseln.' },
          { type: 'text', h: '9. Benachrichtigung über neue Bestellungen', p: 'Damit wir neue Bestellungen schnell bearbeiten können, erhält der Shopinhaber eine Benachrichtigung über den Messenger Telegram (Telegram Messenger Inc. bzw. Telegram FZ-LLC, Dubai, Vereinigte Arabische Emirate). Dabei werden Bestellnummer, dein Vor- und Nachname, die Anzahl der Artikel und der Bestellbetrag an den Telegram-Chat des Shopinhabers übermittelt (Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse ist eine zügige Bearbeitung deiner Bestellung). Telegram verarbeitet Daten auch außerhalb der EU, in Ländern, für die kein Angemessenheitsbeschluss der EU-Kommission besteht. Dort ist ein dem EU-Recht gleichwertiges Datenschutzniveau nicht garantiert.' },
          { type: 'text', h: '10. Missbrauchsschutz', p: 'Zum Schutz vor Missbrauch (z. B. automatisierte Bestellungen oder Formularspam) zählen wir Anfragen pro Absender. Dafür speichern wir deine IP-Adresse nicht im Klartext, sondern nur als Hashwert zusammen mit einem Zähler. Der Eintrag läuft nach spätestens einer Stunde ab und wird danach automatisch gelöscht (Art. 6 Abs. 1 lit. f DSGVO).' },
          { type: 'text', h: '11. Speicherdauer', p: 'Bestell- und Rechnungsdaten bewahren wir wegen steuer- und handelsrechtlicher Pflichten bis zu zehn Jahre auf. Alle übrigen Daten löschen wir, sobald der Zweck entfällt oder du deine Einwilligung widerrufst.' },
          { type: 'text', h: '12. Cookies', p: 'Wir verwenden nur technisch notwendige Cookies bzw. lokale Speicherung (z. B. Warenkorb, Spracheinstellung, Login). Analyse- oder Marketing-Cookies setzen wir nicht ein, daher ist keine Einwilligung nötig.' },
          { type: 'text', h: '13. Deine Rechte', p: 'Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch sowie das Recht auf Beschwerde bei einer Aufsichtsbehörde, zum Beispiel beim Bayerischen Landesamt für Datenschutzaufsicht (BayLDA).' },
        ],
      },
      en: {
        eyebrow: 'Legal',
        title: 'Privacy Policy',
        legal: true,
        blocks: [
          { type: 'text', h: '1. Controller', p: ADDR + '\ncompany@ticoriginals.com' },
          { type: 'text', h: '2. Order processing', p: 'To process your order we handle name, address, email, phone number and order data (Art. 6(1)(b) GDPR). Shipping data is shared with the carrier (DHL).' },
          { type: 'text', h: '3. Payment providers', p: 'All payments are processed by Stripe Payments Europe Ltd. (Ireland) (Art. 6(1)(b) GDPR). Depending on the payment method you choose, Stripe passes the data needed for the payment to the respective provider, for example PayPal (Europe) S.à r.l. et Cie, S.C.A. (Luxembourg), Klarna Bank AB (publ) (Sweden), or Apple or Google for Apple Pay or Google Pay. We never store full card details.' },
          { type: 'text', h: '4. Customer account', p: 'If you create an account we store your email address, password (as a hash only), delivery addresses and order history (Art. 6(1)(b) GDPR). You can delete your account yourself at any time on the account page, or write to company@ticoriginals.com. Orders we must keep for tax and commercial law reasons are retained but unlinked from your account.' },
          { type: 'text', h: '5. Sign in with Google', p: 'If you choose "Continue with Google" you are redirected to Google (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland). After you sign in, Google sends us your name, email address and, if available, your profile picture so we can create your account or sign you in (Art. 6(1)(b) GDPR). Data may be transferred to Google LLC in the USA; this is based on the EU-US Data Privacy Framework. Signing in with Google is optional; you can also register with email and password.' },
          { type: 'text', h: '6. Contact form and email', p: 'If you write to us via the contact form or email we store your name, email address and message to answer your request (Art. 6(1)(b) and (f) GDPR).' },
          { type: 'text', h: '7. Newsletter', p: 'For the newsletter we store your email address based on your consent (Art. 6(1)(a) GDPR). We use double opt-in: you first receive an email with a confirmation link and are only added to the list after confirming. Unsubscribe any time via the link in every email.' },
          { type: 'text', h: '8. Hosting and technical providers', p: 'Our website runs on Vercel Inc. (USA). The database with accounts and orders is operated by Supabase (data centre in the EU, Ireland). We send emails (order confirmation, shipping, newsletter) through Resend. Technically this involves server log data such as IP address, time and page requested (Art. 6(1)(f) GDPR). Where data is transferred to the USA this is based on the EU-US Data Privacy Framework or standard contractual clauses.' },
          { type: 'text', h: '9. New order notifications', p: 'So we can process new orders quickly, the shop owner receives a notification via the Telegram messenger (Telegram Messenger Inc. or Telegram FZ-LLC, Dubai, United Arab Emirates). The order number, your first and last name, the number of items and the order amount are sent to the shop owner\'s Telegram chat (Art. 6(1)(f) GDPR; our legitimate interest is processing your order quickly). Telegram also processes data outside the EU, in countries without an adequacy decision of the European Commission, where a level of data protection equivalent to EU law is not guaranteed.' },
          { type: 'text', h: '10. Abuse protection', p: 'To protect against abuse (e.g. automated orders or form spam) we count requests per sender. For this we do not store your IP address in plain text, only as a hash value together with a counter. The entry expires after one hour at most and is then deleted automatically (Art. 6(1)(f) GDPR).' },
          { type: 'text', h: '11. Retention', p: 'We keep order and invoice data for up to ten years because of tax and commercial law obligations. All other data is deleted once the purpose no longer applies or you withdraw consent.' },
          { type: 'text', h: '12. Cookies', p: 'We only use technically necessary cookies and local storage (e.g. cart, language, login). We do not use analytics or marketing cookies, so no consent is required.' },
          { type: 'text', h: '13. Your rights', p: 'You have the right to access, rectification, erasure, restriction of processing, data portability and objection, and the right to lodge a complaint with a supervisory authority, for example the Bavarian State Office for Data Protection Supervision (BayLDA).' },
        ],
      },
    },
    agb: {
      de: {
        eyebrow: 'Rechtliches',
        title: 'AGB',
        legal: true,
        blocks: [
          { type: 'text', h: '§ 1 Geltungsbereich', p: 'Diese AGB gelten für alle Bestellungen über ticoriginals.com zwischen TILL I COLLAPSE ORIGINALS (Inhaber John Rasch, An der Oberen Au 4, 85072 Eichstätt) und Verbrauchern.' },
          { type: 'text', h: '§ 2 Vertragsschluss', p: 'Die Darstellung der Produkte im Shop ist kein bindendes Angebot. Mit dem Klick auf „Zahlungspflichtig bestellen“ gibst du ein verbindliches Angebot ab. Der Vertrag kommt mit unserer Bestellbestätigung per E-Mail zustande.' },
          { type: 'text', h: '§ 3 Korrektur von Eingabefehlern', p: 'Bis zum Klick auf „Zahlungspflichtig bestellen“ kannst du deine Eingaben jederzeit prüfen und korrigieren: Artikel, Größen und Mengen im Warenkorb, deine Angaben in den Formularfeldern des Checkouts sowie die Bestellübersicht. Du kannst den Bestellvorgang auch jederzeit abbrechen, indem du das Browserfenster schließt.' },
          { type: 'text', h: '§ 4 Vertragssprache und Speicherung des Vertragstexts', p: 'Vertragssprache ist Deutsch oder Englisch, je nach der im Shop gewählten Sprache. Wir speichern den Vertragstext (deine Bestelldaten). Nach der Bestellung erhältst du eine Bestellbestätigung per E-Mail mit den Bestelldaten, der Widerrufsbelehrung und dem Muster-Widerrufsformular. Diese AGB kannst du jederzeit auf dieser Seite abrufen, speichern und ausdrucken. Wenn du ein Kundenkonto hast, findest du deine Bestellungen auch dort.' },
          { type: 'text', h: '§ 5 Preise und Versand', p: `Alle Preise sind Endpreise; gemäß § 19 UStG wird keine Umsatzsteuer berechnet. Wir liefern innerhalb der EU. Versandkosten: Deutschland ${s.de} (ab ${s.free} Bestellwert kostenlos), übrige EU-Länder ${s.intl}.` },
          { type: 'text', h: '§ 6 Vorbestellungen', p: 'Artikel, die als „Vorbestellung“ gekennzeichnet sind, sind noch nicht auf Lager. Den voraussichtlichen Versandtermin („Versand voraussichtlich ab …“) siehst du beim Artikel im Shop, im Warenkorb und im Checkout; steht dort noch kein Termin, teilen wir ihn dir per E-Mail mit. Vorbestellartikel versenden wir ab dem angegebenen Termin. Enthält deine Bestellung Vorbestellartikel und sofort lieferbare Artikel, versenden wir die gesamte Bestellung zusammen, sobald alle Artikel da sind.' },
          { type: 'text', h: '§ 7 Zahlung', p: `Zahlung per ${PAYMENT_TEXT.de}. Die Zahlung ist mit der Bestellung sofort fällig, auch bei Vorbestellungen.` },
          { type: 'text', h: '§ 8 Eigentumsvorbehalt', p: 'Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.' },
          { type: 'text', h: '§ 9 Widerrufsrecht', p: 'Verbrauchern steht ein gesetzliches Widerrufsrecht zu. Die unmittelbaren Kosten der Rücksendung trägst du. Einzelheiten siehe Widerrufsbelehrung.' },
          { type: 'text', h: '§ 10 Gewährleistung', p: 'Es gelten die gesetzlichen Mängelhaftungsrechte.' },
          { type: 'text', h: '§ 11 Streitbeilegung', p: 'Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.' },
        ],
      },
      en: {
        eyebrow: 'Legal',
        title: 'Terms & Conditions',
        legal: true,
        blocks: [
          { type: 'text', h: '§ 1 Scope', p: 'These terms apply to all orders placed via ticoriginals.com between TILL I COLLAPSE ORIGINALS (owner John Rasch, An der Oberen Au 4, 85072 Eichstätt, Germany) and consumers.' },
          { type: 'text', h: '§ 2 Contract', p: 'Product listings are not a binding offer. By clicking "Place order" you submit a binding offer. The contract is concluded with our order confirmation email.' },
          { type: 'text', h: '§ 3 Correcting input errors', p: 'Until you click "Place order" you can check and correct your entries at any time: items, sizes and quantities in the cart, your details in the checkout form fields and the order summary. You can also cancel the order process at any time by closing the browser window.' },
          { type: 'text', h: '§ 4 Contract language and storage of the contract text', p: 'The contract language is German or English, depending on the language selected in the shop. We store the contract text (your order data). After ordering you receive an order confirmation email containing the order details, the withdrawal information and the sample withdrawal form. You can view, save and print these terms on this page at any time. If you have a customer account, your orders are also listed there.' },
          { type: 'text', h: '§ 5 Prices and shipping', p: `All prices are final prices; no VAT is charged under § 19 UStG. We deliver within the EU. Shipping: Germany ${s.de} (free over ${s.free}), other EU countries ${s.intl}.` },
          { type: 'text', h: '§ 6 Pre-orders', p: 'Items marked "Pre-order" are not yet in stock. The expected shipping date ("expected to ship from …") is shown with the item in the shop, in the cart and at checkout; if no date is shown yet, we will email it to you. Pre-order items ship from the stated date. If your order contains both pre-order and in-stock items, we ship the whole order together once everything is in stock.' },
          { type: 'text', h: '§ 7 Payment', p: `Payment by ${PAYMENT_TEXT.en.charAt(0).toLowerCase() + PAYMENT_TEXT.en.slice(1)}. Payment is due immediately when you order, including for pre-orders.` },
          { type: 'text', h: '§ 8 Retention of title', p: 'Goods remain our property until paid in full.' },
          { type: 'text', h: '§ 9 Right of withdrawal', p: 'Consumers have a statutory right of withdrawal. You bear the direct cost of returning the goods. See Right of Withdrawal for details.' },
          { type: 'text', h: '§ 10 Warranty', p: 'Statutory warranty rights apply.' },
          { type: 'text', h: '§ 11 Dispute resolution', p: 'We are neither willing nor obliged to participate in dispute resolution proceedings before a consumer arbitration board.' },
        ],
      },
    },
    widerruf: {
      de: {
        eyebrow: 'Rechtliches',
        title: 'Widerrufsbelehrung',
        legal: true,
        blocks: [
          ...withdrawalSections('de').map(([h, p]): Block => ({ type: 'text', h, p })),
          { type: 'form', h: 'Muster-Widerrufsformular' },
        ],
      },
      en: {
        eyebrow: 'Legal',
        title: 'Right of Withdrawal',
        legal: true,
        blocks: [
          ...withdrawalSections('en').map(([h, p]): Block => ({ type: 'text', h, p })),
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
        ['Wie lange dauert der Versand?', 'Lagerware verschicken wir innerhalb von 1–3 Werktagen. Innerhalb Deutschlands dauert die Zustellung danach 1 bis 4 Werktage mit DHL. Vorbestellungen versenden wir ab dem angegebenen Versandtermin.'],
        ['Was kostet der Versand?', `Deutschland ${s.de}, ab ${s.free} Bestellwert kostenlos. Übrige EU-Länder ${s.intl}.`],
        ['Kann ich meine Bestellung zurückgeben?', 'Ja, du hast ab Erhalt der Ware 14 Tage gesetzliches Widerrufsrecht, auch für Sale-Artikel und Vorbestellungen. Schreib uns an company@ticoriginals.com. Die Kosten der Rücksendung trägst du.'],
        ['Welche Zahlungsmethoden akzeptiert ihr?', `${PAYMENT_TEXT.de}.`],
        ['Liefert ihr ins Ausland?', `Ja, in alle EU-Länder für ${s.intl} Versand. Lieferungen außerhalb der EU folgen später.`],
        ['Wie verfolge ich meine Bestellung?', 'Du bekommst nach dem Versand eine Sendungsnummer per E-Mail. Oder nutze Track Order mit deiner Bestellnummer.'],
        ['Welche Größen gibt es?', 'Die meisten Styles gibt es in XS bis 2XL. Die genaue Verfügbarkeit siehst du auf jeder Produktseite.'],
        ['Wird Mehrwertsteuer berechnet?', 'Nein. Als Kleinunternehmer gemäß § 19 UStG berechnen wir keine Umsatzsteuer. Die angezeigten Preise sind Endpreise.'],
      ]
    : [
        ['How long does shipping take?', 'In-stock items ship within 1–3 business days. Delivery within Germany then takes 1 to 4 business days via DHL. Pre-orders ship from the stated date.'],
        ['How much is shipping?', `Germany ${s.de}, free on orders over ${s.free}. Other EU countries ${s.intl}.`],
        ['Can I return my order?', 'Yes, you have a statutory 14-day right of withdrawal from delivery, including sale items and pre-orders. Email company@ticoriginals.com. You pay the return shipping.'],
        ['Which payment methods do you accept?', `${PAYMENT_TEXT.en}.`],
        ['Do you ship internationally?', `Yes, to all EU countries for ${s.intl}. Shipping outside the EU will follow later.`],
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

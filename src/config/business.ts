// Business details used in invoices, emails and social links.
export const BUSINESS = {
  name: 'TILL I COLLAPSE ORIGINALS',
  brand: 'TIC Originals',
  street: 'An der Oberen Au 4',
  zipCity: '85072 Eichstätt',
  country: 'Deutschland',
  email: 'company@ticoriginals.com',
  phone: '+49 152 07889847',
  owner: 'John Rasch',
  vatId: 'DE462943223',
};

export const SOCIAL = {
  instagram: 'https://www.instagram.com/tillicollapseoriginals/',
  tiktok: 'https://www.tiktok.com/@tillicollapseoriginals',
};

/**
 * GPSR (EU 2023/988): manufacturer shown on every product page. Fill in once the client sends
 * Fajar's postal address and email. If the manufacturer is outside the EU, also set `euResponsible`
 * (the importer, i.e. the shop itself). The block is hidden while this is null.
 */
export const MANUFACTURER: { name: string; address: string; email: string; euResponsible?: string } | null = {
  name: 'Fast Creative Production (Inh. Fajar)',
  address: 'Jl. Moh Toha Curug Candung No. 35B, RT 04/RW 05, Kel. Mekarwangi, Kec. Bojongloa Kidul, Bandung, Indonesia',
  email: 'fadityaa33@gmail.com',
  // Manufacturer outside the EU: the shop is the importer / responsible person.
  euResponsible: `${BUSINESS.name}, ${BUSINESS.owner}, ${BUSINESS.street}, ${BUSINESS.zipCity}, ${BUSINESS.country}, ${BUSINESS.email}`,
};

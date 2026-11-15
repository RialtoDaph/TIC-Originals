// Garment measurements in cm, measured flat (half width for chest, waist, thigh, leg opening).
// Keyed by product model (see lib/models.ts) so every colour of a model shares one chart.

export type Measure = { de: string; en: string; howDe: string; howEn: string; cm: number[] };
export interface SizeChart {
  sizes: string[];
  rows: Measure[];
}

const SIZES = ['S', 'M', 'L', 'XL'];

export const SIZE_CHARTS: Record<string, SizeChart> = {
  'Chosen1 Crewneck': {
    sizes: SIZES,
    rows: [
      { de: 'Brustbreite', en: 'Chest width', howDe: 'Flach gemessen, von Achsel zu Achsel', howEn: 'Measured flat, armpit to armpit', cm: [44, 46, 48, 50] },
      { de: 'Länge', en: 'Length', howDe: 'Vom höchsten Schulterpunkt bis zum Saum', howEn: 'From the highest shoulder point to the hem', cm: [58, 60, 62, 64] },
      { de: 'Ärmellänge', en: 'Sleeve length', howDe: 'Von der Schulternaht bis zum Bündchen', howEn: 'From the shoulder seam to the cuff', cm: [59, 60, 61, 62] },
    ],
  },
  'Chosen1 Pants': {
    sizes: SIZES,
    rows: [
      { de: 'Bundweite', en: 'Waist', howDe: 'Flach gemessen, ungedehnt', howEn: 'Measured flat, unstretched', cm: [34, 36, 38, 40] },
      { de: 'Länge', en: 'Length', howDe: 'Vom Bund bis zum Beinabschluss', howEn: 'From the waistband to the leg opening', cm: [98, 100, 102, 104] },
      { de: 'Oberschenkel', en: 'Thigh', howDe: 'Flach gemessen, direkt unter dem Schritt', howEn: 'Measured flat, just below the crotch', cm: [30, 32, 34, 36] },
      { de: 'Beinabschluss', en: 'Leg opening', howDe: 'Flach gemessen, am Saum', howEn: 'Measured flat, at the hem', cm: [20, 22, 24, 26] },
    ],
  },
};

// Slim tee, XS–L. Values are standard slim-fit measurements: confirm with the manufacturer before launch.
SIZE_CHARTS['I Love My Choppa Slim Tee'] = {
  sizes: ['XS', 'S', 'M', 'L'],
  rows: [
    { de: 'Brustbreite', en: 'Chest width', howDe: 'Flach gemessen, von Achsel zu Achsel', howEn: 'Measured flat, armpit to armpit', cm: [44, 46, 48, 50] },
    { de: 'Länge', en: 'Length', howDe: 'Vom höchsten Schulterpunkt bis zum Saum', howEn: 'From the highest shoulder point to the hem', cm: [62, 64, 66, 68] },
    { de: 'Schulterbreite', en: 'Shoulder width', howDe: 'Flach gemessen, von Naht zu Naht', howEn: 'Measured flat, seam to seam', cm: [39, 41, 43, 45] },
  ],
};

export const sizeChartFor = (model: string) => SIZE_CHARTS[model] ?? null;

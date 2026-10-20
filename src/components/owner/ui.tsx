'use client';

import { img } from '@/lib/images';
import { TONE, type Tone } from '@/lib/tokens';
import { useOwner } from './OwnerContext';
import { sx } from './sx';

/** Product thumbnail on a white tile (as in the design). */
export function Thumb({ productId, size, radius }: { productId: string | null; size: number; radius: number }) {
  const { data } = useOwner();
  const p = productId ? data.products.find((x) => x.id === productId) : undefined;
  return (
    <span style={{ ...sx('overflow:hidden;background:#fff;flex-shrink:0;display:block'), width: size, height: size, borderRadius: radius }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img(p?.images[0])} alt="" style={sx('width:100%;height:100%;object-fit:cover;display:block')} loading="lazy" />
    </span>
  );
}

export function Toggle({ on, onClick, label, disabled }: { on: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
      disabled={disabled}
      style={{ ...sx('width:40px;height:22px;border:0;border-radius:11px;position:relative;cursor:pointer;padding:0;flex-shrink:0'), background: on ? '#7C9CFF' : '#3A3F49' }}
    >
      <span style={{ ...sx('position:absolute;top:3px;width:16px;height:16px;border-radius:50%;background:#ECEEF1;transition:left .15s'), left: on ? 21 : 3 }} />
    </button>
  );
}

/** Track only (used inside a labelled button, as in the design). */
export function ToggleTrack({ on }: { on: boolean }) {
  return (
    <span style={{ ...sx('width:40px;height:22px;border-radius:11px;position:relative;flex-shrink:0'), background: on ? '#7C9CFF' : '#3A3F49' }}>
      <span style={{ ...sx('position:absolute;top:3px;width:16px;height:16px;border-radius:50%;background:#ECEEF1;transition:left .15s'), left: on ? 21 : 3 }} />
    </span>
  );
}

export function Pill({ tone, children, style }: { tone: Tone; children: React.ReactNode; style?: React.CSSProperties }) {
  return <span style={{ ...sx('font-size:12px;font-weight:600;padding:3px 9px;border-radius:20px;white-space:nowrap'), background: TONE[tone][0], color: TONE[tone][1], ...style }}>{children}</span>;
}

export const S = {
  card: sx('background:#1C1F25;border-radius:16px'),
  h1: sx('margin:0;font-size:26px;font-weight:600;letter-spacing:-.01em;margin-right:auto'),
  neutralBtn: sx('height:38px;padding:0 14px;border:0;border-radius:10px;background:#2A2E36;color:#ECEEF1;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap'),
  primaryBtn: sx('height:38px;padding:0 16px;border:0;border-radius:10px;background:#7C9CFF;color:#0E1220;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap'),
  linkBtn: sx('border:0;background:transparent;color:#A9BCFF;font-size:13px;cursor:pointer'),
  input: sx('height:40px;padding:0 12px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:#14161A;color:#ECEEF1;font-size:14px;outline:none;box-sizing:border-box;min-width:0'),
  label: sx('display:flex;flex-direction:column;gap:6px'),
  labelText: sx('font-size:12px;color:#9AA1AC'),
  mono: sx("font-family:'DM Mono',monospace"),
};

export function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div style={sx('display:flex;padding:3px;border-radius:11px;background:#1C1F25')} role="tablist">
      {options.map(([v, l]) => (
        <button
          key={String(v)}
          role="tab"
          aria-selected={v === value}
          onClick={() => onChange(v)}
          style={{ ...sx('height:32px;padding:0 14px;border:0;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap'), background: v === value ? '#2A2E36' : 'transparent', color: v === value ? '#ECEEF1' : '#9AA1AC' }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

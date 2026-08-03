// Pure color math for team theming — no dependencies. Colors are stored as
// hex and converted to CSS custom properties at render time.

export type Rgb = { r: number; g: number; b: number };
export type Hsl = { h: number; s: number; l: number };

const HEX_RE = /^#?([0-9a-fA-F]{6})$/;

export function isValidHex(hex: string): boolean {
  return HEX_RE.test(hex.trim());
}

export function normalizeHex(hex: string): string {
  const m = hex.trim().match(HEX_RE);
  if (!m) return "#000000";
  return `#${m[1].toLowerCase()}`;
}

export function hexToRgb(hex: string): Rgb {
  const clean = normalizeHex(hex).slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    switch (max) {
      case rn: h = ((gn - bn) / d) % 6; break;
      case gn: h = (bn - rn) / d + 2; break;
      default: h = (rn - gn) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

// Relative luminance per WCAG, used to pick readable text color.
function relativeLuminance({ r, g, b }: Rgb): number {
  const toLinear = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

// Black or white — whichever gives the higher WCAG contrast ratio against
// this background. (The crossover is NOT at 0.5 luminance: relative
// luminance is gamma-corrected, so contrast-ratio-vs-black overtakes
// contrast-ratio-vs-white around L≈0.18, not the halfway point.)
export function contrastText(hex: string): "#ffffff" | "#0f172a" {
  const l = relativeLuminance(hexToRgb(hex));
  const contrastWithBlack = (l + 0.05) / 0.05;
  const contrastWithWhite = 1.05 / (l + 0.05);
  return contrastWithBlack >= contrastWithWhite ? "#0f172a" : "#ffffff";
}

// A touch darker, for hover states on filled buttons.
export function darken(hex: string, amount = 0.08): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ ...hsl, l: Math.max(0, hsl.l - amount) }));
}

// Very light colors make poor button/link text on a white page — cap
// lightness so a chosen color always stays usable both as a background
// (with computed ink) and as link text on white.
export function clampForUse(hex: string, maxLight = 0.72): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  if (hsl.l <= maxLight) return normalizeHex(hex);
  return rgbToHex(hslToRgb({ ...hsl, l: maxLight }));
}

export type TeamTheme = {
  brand: string;
  brandHover: string;
  brandInk: string;
  secondary: string;
  secondaryInk: string;
};

export function buildTeamTheme(
  primaryColor: string | null | undefined,
  secondaryColor: string | null | undefined
): TeamTheme {
  const brand = isValidHex(primaryColor ?? "") ? normalizeHex(primaryColor!) : "#4f46e5";
  const secondary = isValidHex(secondaryColor ?? "") ? normalizeHex(secondaryColor!) : "#0f172a";
  return {
    brand,
    brandHover: darken(brand),
    brandInk: contrastText(brand),
    secondary,
    secondaryInk: contrastText(secondary),
  };
}

// CSS custom properties for a wrapping element's inline style.
export function themeStyleVars(theme: TeamTheme): Record<string, string> {
  return {
    "--brand": theme.brand,
    "--brand-hover": theme.brandHover,
    "--brand-ink": theme.brandInk,
    "--secondary": theme.secondary,
    "--secondary-ink": theme.secondaryInk,
  };
}

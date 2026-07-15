/**
 * Whitelisted font set for the certificate designer.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §6.4.
 *
 * Uses CSS font-family names directly (loaded via a <link> tag in the
 * designer wrapper) instead of next/font/google to avoid network timeouts
 * on environments that can't reach Google Fonts at build time.
 *
 * The PDF renderer ships the same TTF/OTF files in
 * `backend/src/modules/certificate/services/fonts/` and injects `@font-face`
 * rules pointing at `file://` URLs so the PDF uses identical glyphs.
 *
 * IMPORTANT: this list MUST stay in sync with `ALLOWED_FONTS` in
 * `../types/template.ts` (which is enforced by the Zod schema).
 */

/**
 * Google Fonts URL that loads all allowed certificate fonts.
 * Inject this as a <link rel="stylesheet"> in the designer wrapper.
 */
export const CERTIFICATE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@400;500;600;700;800;900&family=Roboto+Slab:wght@300;400;500;600;700;800;900&family=Lora:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600;700;800;900&family=Cormorant+Garamond:wght@300;400;500;600;700&display=swap';

/**
 * Combined className — no longer needed since we don't use next/font CSS
 * variables. Kept as empty string for backward compat with any component
 * that references it.
 */
export const certificateDesignerFontVariables = '';

/**
 * Map from font display name (as stored in `template.fields[].fontFamily`)
 * to the CSS family. The field inspector uses this for the font picker.
 */
export const FONT_PICKER_OPTIONS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Inter (sans)', value: 'Inter' },
  { label: 'Playfair Display (serif)', value: 'Playfair Display' },
  { label: 'Roboto Slab (slab)', value: 'Roboto Slab' },
  { label: 'Lora (serif)', value: 'Lora' },
  { label: 'Montserrat (sans)', value: 'Montserrat' },
  { label: 'Cormorant Garamond (serif)', value: 'Cormorant Garamond' },
];

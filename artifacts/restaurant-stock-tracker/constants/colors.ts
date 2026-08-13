/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#18342b',
    tint: '#1f6b52',

    // Core surfaces
    background: '#f6f3ed',
    foreground: '#18342b',

    // Cards / elevated surfaces
    card: '#fffdf8',
    cardForeground: '#18342b',

    // Primary action color (buttons, links, active states)
    primary: '#1f6b52',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#e8efe8',
    secondaryForeground: '#1f6b52',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#ece8df',
    mutedForeground: '#6d746e',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#f2d7bd',
    accentForeground: '#8a4e2c',

    // Destructive actions (delete, error states)
    destructive: '#c95b49',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#e0ddd5',
    input: '#d7d3c9',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;

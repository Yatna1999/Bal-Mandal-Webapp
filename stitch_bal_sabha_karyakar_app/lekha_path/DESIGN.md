---
name: Satsang Ledger
colors:
  surface: '#f9f9ff'
  surface-dim: '#d9d9e0'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fa'
  surface-container: '#ededf4'
  surface-container-high: '#e8e7ef'
  surface-container-highest: '#e2e2e9'
  on-surface: '#1a1b21'
  on-surface-variant: '#594140'
  inverse-surface: '#2e3036'
  inverse-on-surface: '#f0f0f7'
  outline: '#8d706f'
  outline-variant: '#e1bebd'
  surface-tint: '#b12936'
  primary: '#5c000f'
  on-primary: '#ffffff'
  primary-container: '#85001b'
  on-primary-container: '#ff898a'
  inverse-primary: '#ffb3b2'
  secondary: '#4059aa'
  on-secondary: '#ffffff'
  secondary-container: '#8fa7fe'
  on-secondary-container: '#1d3989'
  tertiary: '#491c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#6b2d00'
  on-tertiary-container: '#ff8c45'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad9'
  primary-fixed-dim: '#ffb3b2'
  on-primary-fixed: '#410008'
  on-primary-fixed-variant: '#8f0b21'
  secondary-fixed: '#dce1ff'
  secondary-fixed-dim: '#b6c4ff'
  on-secondary-fixed: '#00164e'
  on-secondary-fixed-variant: '#264191'
  tertiary-fixed: '#ffdbca'
  tertiary-fixed-dim: '#ffb68e'
  on-tertiary-fixed: '#331200'
  on-tertiary-fixed-variant: '#763300'
  background: '#f9f9ff'
  on-background: '#1a1b21'
  surface-variant: '#e2e2e9'
  ledger-bg: '#FDFCF9'
  ledger-line: '#DDD8CE'
  ledger-text-muted: '#949AA3'
  ledger-red-accent: '#A81E2E'
  status-warning: '#B45309'
  status-surface-warning: rgba(180, 83, 9, 0.05)
typography:
  wordmark:
    fontFamily: Shrikhand
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 32px
  header-section:
    fontFamily: IBM Plex Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
  body-gu-lg:
    fontFamily: Hind Vadodara
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-gu-md:
    fontFamily: Hind Vadodara
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  data-num-lg:
    fontFamily: IBM Plex Mono
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 32px
  data-num-sm:
    fontFamily: IBM Plex Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-secondary:
    fontFamily: Hind Vadodara
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  margin-edge: 16px
  gutter: 12px
  row-standard: 56px
  row-compact: 48px
  section-gap: 16px
  hairline: 1px
---

## Brand & Style

Satsang Ledger is designed with a "Digital Paper" or "Ledger" aesthetic, drawing inspiration from traditional record-keeping books used in community administration. The brand personality is organized, humble, and reliable, evoking a sense of community service and devotion.

The design style is **Modern Ledger**, a subset of minimalism that utilizes subtle textures, cream-toned backgrounds, and thin, structured lines to mimic physical ledger paper. It avoids heavy shadows and complex gradients in favor of flat, high-contrast typography and meaningful color accents that provide a clear hierarchy for administrative tasks.

## Colors

The palette is anchored by a warm, off-white "Paper" background (`#FDFCF9`) which reduces eye strain during long data-entry sessions. 

- **Primary Red:** A deep, traditional red used for the wordmark, primary actions, and critical notifications, symbolizing importance and heritage.
- **Ledger Lines:** A specific muted beige (`#DDD8CE`) is used for all horizontal dividers to simulate the ruled lines of a notebook.
- **Accents:** An ochre/orange (`#B45309`) serves as a secondary warning or "pending" indicator, while a muted blue-gray handles inactive navigation states.
- **Neutral:** Typography uses a soft charcoal (`#16181D`) rather than pure black to maintain the analog feel.

## Typography

The system uses a tri-font approach to balance personality with data clarity:

1.  **Display:** *Shrikhand* is used exclusively for the brand wordmark to provide a traditional, hand-painted feel.
2.  **UI & Content:** *Hind Vadodara* handles Gujarati and standard text, offering excellent legibility for regional scripts with a clean, modern humanist structure.
3.  **Data & Metrics:** *IBM Plex Mono* is utilized for all numbers, dates, and timestamps. This ensures that columns of numbers align vertically and feel like precise ledger entries.
4.  **Meta-Labels:** *IBM Plex Sans* is used for uppercase section headers and micro-copy to provide a structural contrast to the softer body text.

## Layout & Spacing

The layout follows a **Vertical Ledger** model. It does not use a complex grid but relies on strict horizontal containment and a consistent vertical rhythm.

- **Margins:** 16px safe area on all sides.
- **Dividers:** Every list item and section is separated by a 1px "hairline" divider.
- **Row Heights:** Standard interactive rows are 56px high. Informational or compact rows are 48px.
- **Information Density:** High. Content is packed efficiently to allow users to scan many records at once.
- **Adaptation:** On mobile, the system uses a fixed bottom navigation and fixed action bar. On tablet/desktop, these elements should transition to a side rail to preserve the vertical scanning pattern.

## Elevation & Depth

This system is purposefully **Flat**. Depth is communicated through color and linework rather than shadows or blurs.

- **Surface Tiers:** All content sits on the primary `ledger-bg`. 
- **Active State Depth:** Instead of elevation, active or "attention" states use background color shifts (e.g., a 5% opacity tint of the accent color) and left-edge "accent bars" (4px width).
- **Navigation:** The Top App Bar and Bottom Nav are separated from the main content by 1px borders rather than shadows, maintaining the two-dimensional paper aesthetic.

## Shapes

The shape language is primarily **Square and Sharp**, reflecting the edges of paper and cards. 

- **Containers:** Section containers have 0px border-radius, extending edge-to-edge.
- **Buttons:** Primary action buttons use a subtle `6px` radius (`rounded-btn`), providing a slight "pressable" look without breaking the overall geometric theme.
- **Badges/Chips:** Status indicators use fully rounded (pill) shapes to distinguish them as metadata rather than structural elements.
- **Selection Indicators:** Custom checkboxes for tasks are represented by `dashed-circle` shapes, mimicking a "fill-in-the-blank" notebook style.

## Components

- **Primary Button:** Spans the full width of the available content area. Uses the `ledger-red-accent` background with white text and an icon on the left.
- **Ledger List Item:** A row with a 1px bottom border. Can include a leading "dashed circle" for task states, a title/subtitle stack, and a trailing chevron or status pill.
- **Status Pills:** Small, high-contrast containers (e.g., Light Gray background with Dark Gray text) for categorization.
- **Statistic Box:** A 3-column layout where each column is separated by a vertical ledger line. Features a large `data-num-lg` value centered over a `label-secondary`.
- **Active Task Card:** Specifically highlighted with a 4px left border of `ledger-orange` and a very faint orange background tint to denote urgency or incompletion.
- **Fixed Action Bar:** A persistent container at the bottom of the screen that holds the primary "Add" or "Submit" button, ensuring the main action is always within reach.
---
name: Institutional Logistics
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#5c403d'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#916f6c'
  outline-variant: '#e5bdb9'
  surface-tint: '#be091c'
  primary: '#ab0015'
  on-primary: '#ffffff'
  primary-container: '#d21f27'
  on-primary-container: '#ffe9e6'
  inverse-primary: '#ffb3ad'
  secondary: '#495f82'
  on-secondary: '#ffffff'
  secondary-container: '#bfd5fe'
  on-secondary-container: '#465c7f'
  tertiary: '#515457'
  on-tertiary: '#ffffff'
  tertiary-container: '#696c6f'
  on-tertiary-container: '#eceef1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb3ad'
  on-primary-fixed: '#410003'
  on-primary-fixed-variant: '#930011'
  secondary-fixed: '#d5e3ff'
  secondary-fixed-dim: '#b1c7f0'
  on-secondary-fixed: '#001c3b'
  on-secondary-fixed-variant: '#314769'
  tertiary-fixed: '#e0e3e6'
  tertiary-fixed-dim: '#c4c7ca'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#44474a'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.4'
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2.5rem
  sidebar-width: 260px
  gutter: 1.25rem
  margin-edge: 2rem
---

## Brand & Style

This design system transitions the visual narrative from a nocturnal command center to a high-clarity, institutional environment. It is engineered for professional logistics management, prioritizing readability, trust, and structural precision. The aesthetic is **Corporate Modern**, leveraging a "Safe" visual identity that pairs ultra-clean functional elements with sophisticated editorial accents.

By utilizing high-contrast typography and a vast, light-filled workspace, the system minimizes cognitive load for operators managing complex global supply chains. The brand personality is dependable, established, and transparent, moving away from experimental aesthetics toward a polished, professional standard that suggests precision and institutional reliability.

## Colors

The color palette is anchored by a high-contrast relationship between a light, airy workspace and a dense, authoritative navigation structure.

- **Workspace Foundation:** The main background uses `#f5f7fa` to provide a soft, non-glare surface, while primary containers and cards use pure white.
- **Sidebar & Navigation:** To maintain structural continuity, the sidebar remains fixed in **Navy Blue (#0b2545)**. This provides a permanent visual anchor and a clear distinction between "Navigation" and "Action."
- **Action & Urgency:** **Red (#d21f27)** is the primary functional color. It is used for active state highlighters in the sidebar, primary action buttons, and critical status indicators.
- **Typography Contrast:** Text is rendered in deep Navy and Dark Grays to ensure AAA accessibility. Primary body text uses `#1e293b`, while secondary labels use muted variants.

## Typography

This system employs a classic Serif/Sans-Serif pairing to balance authority with utility, featuring **Playfair Display** for a more commanding editorial presence.

1. **Playfair Display (Headlines):** Used for page titles, section headers, and high-level branding. Its high-contrast strokes and elegant proportions convey the "established" nature of the logistics industry.
2. **Inter (UI & Body):** As a hyper-legible sans-serif, Inter handles all functional data, navigation, and body copy. It ensures that complex manifests and tracking IDs remain legible at small sizes.
3. **Hierarchy:** Large display sizes are reserved for dashboard summaries. For data-dense tables, use `label-md` for row content and `label-sm` (uppercase) for column headers.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy on desktop to maintain a consistent reading experience, transitioning to a fluid model on smaller viewports.

- **The Sidebar:** Remains at a fixed width of 260px. It uses a vertical layout with high-contrast active states.
- **Main Canvas:** Content is housed in a flexible container with a maximum width of 1440px to prevent excessive line lengths in data tables.
- **Density:** Spacing is modular (base unit of 2). Data tables use a "Compact" vertical rhythm (sm spacing) while landing pages and dashboard overviews use "Spacious" rhythm (lg spacing) to facilitate ease of scanning.
- **Breakpoints:**
  - **Desktop (1024px+):** Fixed sidebar, 12-column grid.
  - **Tablet (768px - 1023px):** Sidebar collapses to a 64px rail; margins reduce to 1.5rem.
  - **Mobile (<768px):** Sidebar moves to a bottom navigation or top-menu overlay; single-column content flow.

## Elevation & Depth

In the light theme, depth is achieved through **Tonal Layering** and **Subtle Shadows** rather than the high-contrast borders of previous iterations.

- **Level 0 (Canvas):** The base background layer (#f5f7fa).
- **Level 1 (Cards & Modules):** Pure white surfaces with a subtle 1px border OR a very soft ambient shadow (0px 2px 4px rgba(0,0,0,0.05)).
- **Level 2 (Dropdowns & Popovers):** Elevated with a medium shadow (0px 10px 15px rgba(0,0,0,0.1)) to indicate temporary interaction.
- **Level 3 (Modals):** High-diffusion shadow (0px 20px 25px rgba(0,0,0,0.15)) with a semi-transparent backdrop blur on the canvas below.

## Shapes

The design system adopts a **Rounded (Level 2)** profile to maintain a professional yet modern institutional feel. This curvature strikes a balance between efficiency and approachability without the extreme softness of a full pill-based system.

- **Base Radius (0.5rem):** Applied to checkboxes, input fields, and standard buttons.
- **Rounded-LG (1rem):** The standard for primary cards and modular navigation elements.
- **Rounded-XL (1.5rem):** Reserved for large modal containers or main layout panels.
- **Pill-Shape:** Used specifically for status indicators (e.g., "Active", "Pending") and notification bubbles to distinguish them from interactive action buttons.

## Components

- **Buttons:**
  - **Primary:** Solid Red (#d21f27) with White text and a 0.5rem (Base) corner radius.
  - **Secondary:** Solid Navy (#0b2545) or Outlined Red.
  - **Ghost:** Clear background with Navy text for low-priority actions.
- **Sidebar Items:** Background is transparent in default state. Active state features a 4px Red (#d21f27) vertical bar on the left edge and a subtle background tint (white at 10% opacity) against the Navy background.
- **Input Fields:** White background with a 1px border and 0.5rem corner radius. On focus, the border transitions to Navy (#0b2545).
- **Cards:** White surfaces with a subtle border and 1rem corner radius. For "Active" tracking cards, use a 4px Red top or left border to indicate priority.
- **Data Tables:** High-contrast Inter text. Row backgrounds are white; alternate rows may use a `#f5f7fa` tint for legibility in dense manifests.
- **Chips & Badges:** Low-saturation backgrounds with high-saturation text for standard statuses, featuring a full pill shape. Use Red only for "Alert" or "Critical" status.

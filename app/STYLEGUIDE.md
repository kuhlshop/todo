# Frontend Style Guide

This app uses a calm, Claude-inspired visual system: neutral surfaces, thin borders, moderate rounding, and low-contrast hierarchy.

## Core Principles

- Keep most surfaces white on a soft neutral page background.
- Prefer 1px borders over shadows for separation.
- Use `rounded-lg`/`rounded-xl` for all interactive surfaces.
- Keep text high-contrast but not pure black.
- Use accent colors sparingly (focus rings, active states, progress).

## Color System

- **Page background:** `stone-100` equivalent (`#f7f7f5`)
- **Primary surface:** `white`
- **Muted surface:** `stone-50` equivalent (`#fafaf9`)
- **Border:** `stone-200` equivalent (`#e7e5e4`)
- **Primary text:** `stone-800` equivalent (`#292524`)
- **Secondary text:** `stone-600` equivalent (`#57534e`)
- **Muted text:** `stone-400` equivalent (`#a8a29e`)
- **Accent:** blue (`#2563eb`) for selected/focus/primary action

## Typography

- Base font: Inter/system sans stack.
- Default body text: `text-sm`.
- Primary headings: `text-lg` + `font-semibold`.
- Secondary labels: `text-xs`/`text-sm` + medium weight.

## Borders, Radius, and Elevation

- Default border width: `border` (1px).
- Radius:
  - controls/chips: `rounded-lg`
  - cards/panels: `rounded-xl`
- Elevation: avoid heavy shadows; use subtle `shadow-sm` only when needed.

## Component Patterns

- **Buttons (secondary):** white background, thin border, muted text, slightly darker hover background.
- **Buttons (primary):** accent fill with white text, darker hover.
- **Inputs/Textareas:** white background, thin neutral border, accent focus border.
- **List items:** minimal chrome, light hover background.
- **Status indicators:** tiny dots/chips; avoid bold badges unless necessary.

## Spacing

- Page container: roomy vertical padding (`py-8`+).
- Section spacing: `mb-4` to `mb-8`.
- Compact control spacing: `gap-1` to `gap-3`.

## Interaction Rules

- Hover changes should be subtle (`stone-50`/`stone-100`).
- Focus styles should rely on border color and gentle ring.
- Disabled state should reduce contrast and remove strong hover affordances.

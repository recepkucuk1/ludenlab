# Poster primitives

Canonical home for neo-brutalist UI. Import everything from `@/components/poster`.

All tokens live in `src/app/globals.css` under `.poster-scope` (light) and `.poster-scope.dark` (deep kraft). Primitives reference CSS vars — never hardcode hex in new code.

## Tokens

| Var | Light | Dark |
|---|---|---|
| `--poster-bg` | `#fff8ec` | `#15100a` |
| `--poster-bg-2` | `#fde8c7` | `#1e1811` |
| `--poster-panel` | `#ffffff` | `#1e1811` |
| `--poster-ink` | `#0e1e26` | `#f5e8c7` |
| `--poster-accent` | `#fe703a` | `#fe703a` |
| `--poster-danger` | `#c53030` | `#ff7a7a` |

Categorical: `--poster-green`, `--poster-yellow`, `--poster-pink`, `--poster-blue` (identical in both modes — chips/badges stay recognizable).

Derived: `--poster-shadow-sm|md|lg` (2/4/6px hard drop), `--poster-border` (2px solid ink), `--poster-radius-sm|md|lg` (10/14/18px).

## Shape language

- **Border** 2px solid ink on every interactive surface. Outer chrome only; inside dense lists use 1-2px dashed `--poster-ink-faint` row hairlines.
- **Shadow** `0 Ypx 0 var(--poster-ink)` with Y = 2 (sm control) / 4 (button/card) / 6 (modal/table).
- **Press state** `translateY(Y)` + `boxShadow: 0 0 0`. Easing `cubic-bezier(.16,1,.3,1)`, duration 80ms.
- **Hover lift** `translateY(-2px)` with shadow +2px. Use on cards, not rows in dense lists.
- **Radius** pill 999 / control 12 / card 14-18 / modal 18.
- **Focus ring** ink 2px outline + 2px offset (global, defined in globals.css for `.poster-scope :focus-visible`).

## Poster-list recipe (validated by user on `/prototype/students`)

Use this for any data-heavy list. Recipe:

1. **Outer container** — `PTable` (2px ink border, 18px radius, `--poster-shadow-lg`, `overflow: hidden`).
2. **Header row** — `PTable.Header`, uppercase 11px 800-weight labels on `--poster-bg-2`.
3. **Row** — `PTable.Row` with CSS grid columns. Divider: `borderTop: 2px dashed var(--poster-ink-faint)` (first row skipped).
4. **Hover** — background flips to `--poster-bg-2`; no transform on rows (jitter on long lists).
5. **Avatar / identity chip** — 44px square, colored bg per category, 2px ink border, `0 2px 0 ink` shadow. First-letter mono-uppercase inside.
6. **Category badge** — `PBadge` with explicit `color` mapped to work area.
7. **Numeric cell** — big (22px 800-weight) value + small (10px uppercase) unit label.
8. **Progress** — `PProgress` with orange accent fill.
9. **Trailing chevron** — orange `→` 20px 800-weight right-aligned (optional).

Column widths for student/person list: `52px 1fr 180px 200px 40px` (avatar / name+meta / count / progress / chevron).

## Primitives

- **Layout**: `PCard`, `Blob`, `Squiggle`
- **Actions**: `PBtn` (variants: accent / green / dark / white; sizes: sm / md / lg)
- **Data**: `PTable` + `.Header` + `.Row`, `PProgress`, `PSkeleton`, `PBadge`
- **Forms**: `PInput`, `PTextarea`, `PSelect`, `PCheckbox`, `PSwitch`, `PLabel`, `PAlert`
- **Overlays**: `PModal` (wraps `ModalPortal` — keeps portal, adds ink panel + backdrop)
- **Navigation**: `PTabs` + `.List` + `.Trigger` + `.Panel` (arrow-key nav, `aria-selected`)
- **Notifications**: `PToaster` (poster-themed `sonner` — use `toast(...)` call sites unchanged)
- **Shell**: `PosterAuthShell` (auth pages)

## Non-negotiables for migrations

Porting a shadcn page to poster: swap primitive imports ONLY. Do NOT touch:

- `fetch` / SWR / server actions
- Form state, Zod schemas, `onSubmit` handlers
- Auth guards, role gates
- `toast(...)` call sites (theme handled by `PToaster` globally)
- `ModalPortal` internals (wrap with `PModal`, don't replace the portal)
- `aria-*` attributes, keyboard handlers

Verify with DevTools Network diff: request payloads must be byte-identical before/after.

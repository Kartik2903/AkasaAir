# UI system

Calm, precise, warm-neutral workbench with **one** indigo accent used for actions, the active nav item and the current approval stage. Manrope throughout. Dark mode via `data-theme="dark"`.

- Tokens: `client/src/styles/index.css` (`:root` colours, radius, shadow); Tailwind maps them (`bg-surface`, `text-muted`, `border-line`, `border-field`, `bg-accent`). Charts use `var(--...)` too, so dark mode needs no chart changes.
- Status is always a text label (`LeaveStatusBadge`); colour only reinforces it. Calendar distinguishes approved (solid) from pending (outlined).
- Reusable pieces: `components/ui` (Button, Input/Select, Dialog on Radix, Card, Badge, Skeleton), `components/shared` (DataTable, Pagination, SearchInput, FormField, StatCard, ConfirmDialog, EmptyState/ErrorState, CommandPalette), `features/leaves` (ApprovalTimeline, DocumentList, DecisionDialog, FilePicker), `features/notifications` (NotificationBell).
- Motion: transform/opacity only; `prefers-reduced-motion` honoured.
- Login screen: a two-panel layout with a tagline and a hero illustration (`client/public/login-hero.png`) on a soft accent background (hidden below 1024px), and the form with a demo-account panel on the right.
- Focus and disabled states: a custom `fade` transition utility animates colour, background and border only (Tailwind's `transition-colors` also animated the outline, which made the focus ring fade in). Disabled controls change fill, text colour and cursor, not opacity alone.
- Checks: Hallmark's render lint was run on static snapshots of the signed-in pages (it cannot log in) and its real findings were fixed. WCAG contrast was computed by hand for every token pair in both themes (all at least AA; field borders pass 3:1). realtimecolors.com loaded with the palette but its readout could not be captured. Live pages were checked for horizontal overflow at 375px.

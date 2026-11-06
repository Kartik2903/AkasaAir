# UI system

Calm, precise, warm-neutral workbench with **one** indigo accent used for actions, the active nav item and the current approval stage. Manrope throughout. Dark mode via `data-theme="dark"`.

- Tokens: `client/src/styles/index.css` (`:root` colours, radius, shadow); Tailwind maps them (`bg-surface`, `text-muted`, `border-line`, `border-field`, `bg-accent`). Charts use `var(--...)` too, so dark mode needs no chart changes.
- Status is always a text label (`LeaveStatusBadge`); colour only reinforces it. Calendar distinguishes approved (solid) from pending (outlined).
- Reusable pieces: `components/ui` (Button, Input/Select, Dialog on Radix, Card, Badge, Skeleton), `components/shared` (DataTable, Pagination, SearchInput, FormField, StatCard, ConfirmDialog, EmptyState/ErrorState, CommandPalette), `features/leaves` (ApprovalTimeline, DocumentList, DecisionDialog, FilePicker), `features/notifications` (NotificationBell).
- Aceternity UI: the Spotlight (adapted, CSS-only) on the sign-in panel only.
- Motion: transform/opacity only; `prefers-reduced-motion` honoured.
- Checks: Hallmark render lint is clean on the sign-in page; signed-in pages were reviewed from desktop and 375px screenshots (`docs/screenshots`). Colour contrast was not checked on realtimecolors.com.

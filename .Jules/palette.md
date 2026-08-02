## 2024-08-02 - Icon-Only Button Accessibility Pattern
**Learning:** Found multiple instances where Shadcn/Radix UI `<Button>` components with `size="sm"` or `size="icon"` were used for icon-only actions (like edit, delete, add progress) without screen-reader accessible names.
**Action:** Always verify that `<Button>` elements containing only an icon component (e.g., `<Trash2 />`, `<Edit />`) include a descriptive `aria-label` attribute to ensure screen reader users understand the button's purpose.

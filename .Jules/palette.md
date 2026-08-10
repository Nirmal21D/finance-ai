## 2024-05-24 - Accessibility on Icon-only Buttons
**Learning:** Found multiple instances of icon-only buttons (`<DollarSign>`, `<Edit>`, `<Trash2>`) across `app/goals/page.tsx` and `app/budgets/page.tsx` that lacked descriptive ARIA labels.
**Action:** Added `aria-label` attributes to these icon-only buttons to improve screen reader accessibility and navigation for visually impaired users.

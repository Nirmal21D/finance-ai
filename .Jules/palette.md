## 2026-08-18 - Icon-Only Button ARIA Labels
**Learning:** Found multiple instances of icon-only buttons (like Edit, Trash2, DollarSign) in `app/goals/page.tsx` and `app/budgets/page.tsx` missing `aria-label` attributes. This is a common accessibility issue that prevents screen reader users from understanding the button's purpose.
**Action:** Added descriptive `aria-label`s (e.g., 'Edit goal', 'Delete goal', 'Add progress', 'Add spending') to improve screen reader accessibility.

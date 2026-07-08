## 2024-07-08 - Icon-Only Button Accessibility Pattern
**Learning:** Icon-only action buttons (e.g., DollarSign for add progress/spending, Edit, Trash2 for delete) in list items across pages (goals, budgets) consistently lack accessible names, causing screen readers to read empty buttons and providing no context for mouse users.
**Action:** Always provide `aria-label` for screen reader accessibility and `title` for hover tooltips on icon-only buttons to ensure they have an accessible name and hover context.

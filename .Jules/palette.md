## 2026-08-05 - Adding ARIA labels to icon-only action buttons
**Learning:** Icon-only buttons for CRUD actions (Edit, Delete, Add Progress) lack screen reader context and tooltips for visual users in this application's components.
**Action:** Always verify custom component 'Button' implementations and add descriptive 'aria-label' and 'title' attributes to buttons containing only icons (like DollarSign, Edit, Trash2).

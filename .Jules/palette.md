## 2024-03-24 - Missing ARIA Labels on Icon-only Action Buttons
**Learning:** Icon-only action buttons (like those using `<DollarSign>`) frequently miss `aria-label` and `title` attributes across the application (e.g., in `app/budgets/page.tsx`), making them completely invisible to screen readers and lacking tooltips for mouse users.
**Action:** Audit and proactively add semantic `aria-label` and visual `title` attributes to all icon-only buttons to ensure they convey action intent to all users.

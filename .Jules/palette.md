## 2024-05-14 - Icon-Only Buttons Accessibility
**Learning:** Found multiple instances of icon-only action buttons (Edit, Delete, Add Progress) on list/card views like Budgets and Goals that were missing `aria-label` attributes, rendering them inaccessible to screen readers. This is a common pattern in this application's design system.
**Action:** When adding new interactive components or reviewing existing list views, proactively verify that all icon-only buttons include descriptive `aria-label` attributes (e.g., `aria-label="Edit budget"`).

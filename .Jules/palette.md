## 2024-08-16 - Icon-Only Button Accessibility in Goals Component
**Learning:** Icon-only buttons (like `DollarSign`, `Edit`, and `Trash2` inside `app/goals/page.tsx`) were missing `aria-label` attributes, making them inaccessible to screen readers.
**Action:** Added `aria-label`s to clarify button purpose (e.g., "Update progress", "Edit goal", "Delete goal") to ensure full screen reader support and better overall accessibility without modifying the layout.

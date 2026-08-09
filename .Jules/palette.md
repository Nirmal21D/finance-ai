## 2024-05-15 - ARIA Labels on Icon-only Buttons
**Learning:** Found multiple instances of icon-only buttons (like `DollarSign`, `Edit`, `Trash2`) missing `aria-label`s which are completely inaccessible to screen readers.
**Action:** Always add descriptive `aria-label`s to any button whose content is purely visual/iconic to maintain basic a11y compliance.

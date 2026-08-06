## 2026-08-06 - [Missing ARIA labels on Icon-only Buttons]
**Learning:** Discovered a recurring pattern of icon-only buttons (e.g., refresh buttons in market trackers, external link buttons) missing `aria-label` attributes. This makes them inaccessible to screen readers, violating basic accessibility standards.
**Action:** Always ensure that any button containing only an icon has a descriptive `aria-label` and a `title` (for native tooltips) to provide context for screen readers and sighted users respectively.

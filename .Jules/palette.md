## 2024-07-26 - Dynamic Tooltips for Icon Buttons
**Learning:** Using `aria-label` alongside the `title` attribute on icon-only buttons provides an immediate UX benefit (native browser tooltips for sighted users) while simultaneously fulfilling accessibility requirements for screen readers. Using dynamic text (like `Add progress to ${goal.title}`) provides much better context than generic labels.
**Action:** Always combine `aria-label` and `title` on icon-only buttons, and use dynamic, context-aware text when referencing specific items.

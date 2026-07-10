
## 2024-07-10 - Provide Contextual Labels for Repeated Icon Buttons in Lists
**Learning:** When standard icon-only buttons (like edit or delete) appear repeatedly in lists (e.g., for budgets or goals), screen reader users hear the same non-descriptive label multiple times. Adding item-specific details to the label improves accessibility.
**Action:** Always inject specific item names or categories into `aria-label` and `title` tags for icon buttons inside loops (e.g., `aria-label={\`Edit \${goal.title}\`}`).

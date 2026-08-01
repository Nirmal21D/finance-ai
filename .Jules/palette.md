## 2024-05-15 - ARIA Labels for Icon-only Buttons
**Learning:** Found multiple instances where Shadcn UI/Lucide React icon-only buttons lacked proper ARIA labeling, particularly in repetitive list items (goals, transactions).
**Action:** When working on lists or cards with action buttons (edit, delete, add), always verify that `aria-label` and `title` attributes are included for screen reader support and tooltip hover state.

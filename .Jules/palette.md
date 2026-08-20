## 2024-08-20 - Adding ARIA Labels to Icon-Only Buttons
**Learning:** Found multiple instances where Shadcn UI buttons containing only Lucide icons (like Edit, Trash2, DollarSign) were missing `aria-label` attributes, making them inaccessible to screen readers. This seems to be a common pattern when using icon libraries with component systems.
**Action:** Always verify that buttons containing only an icon component have a descriptive `aria-label` attribute applied to the wrapping `<Button>` component to ensure actions are properly announced to assistive technologies.

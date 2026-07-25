## 2024-05-18 - Missing ARIA Labels on Icon-only Buttons
**Learning:** Icon-only buttons wrapped in Tooltips often lack `aria-label` attributes, relying on visual tooltips for context but leaving screen reader users without context.
**Action:** Always add explicit `aria-label` to icon-only buttons (like close, send, external link, chat toggles) even if a visual Tooltip exists, to ensure accessibility for all users.

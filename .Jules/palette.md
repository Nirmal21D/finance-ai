## 2024-05-24 - Missing ARIA Labels on Icon-only Refresh Buttons
**Learning:** Found multiple instances in market components where the refresh button consisted entirely of a `RefreshCw` icon without an `aria-label`, rendering the buttons inaccessible to screen readers.
**Action:** Always verify that icon-only buttons (`<Button size="icon">` or generic buttons containing only an SVG/Icon component) have a descriptive `aria-label` attribute.

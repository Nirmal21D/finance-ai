## 2026-07-20 - Form Label Accessibility
**Learning:** Found that custom forms across multiple authentication pages were missing `id` attributes on inputs and `htmlFor` attributes on corresponding labels, breaking accessibility standards (screen readers could not associate labels with inputs).
**Action:** Always ensure that every custom form input element has a unique `id` attribute and that its corresponding `label` element uses the `htmlFor` attribute pointing to that `id`, improving both screen reader support and click target areas.

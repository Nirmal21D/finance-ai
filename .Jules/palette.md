## 2026-08-08 - [Auth Form Accessibility]
**Learning:** Auth forms in the application lacked proper label-to-input association which makes it hard for screen readers to announce fields and reduces click targets for pointing devices.
**Action:** Always add id attributes to input elements and the corresponding htmlFor attributes to their labels when creating or updating forms.

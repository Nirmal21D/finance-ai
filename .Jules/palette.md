## 2024-05-18 - Missing ARIA labels in icon-only dynamic buttons
**Learning:** Found several icon-only buttons (`<X />`, `<Mic />`, `<Send />`, etc.) lacking `aria-label`s, particularly those whose functionality and icons toggle based on state (e.g. `isOpen ? "Close chat" : "Open AI Assistant"`).
**Action:** Always ensure dynamic `aria-label`s map to the toggled state of interactive elements for accurate screen reader announcements.

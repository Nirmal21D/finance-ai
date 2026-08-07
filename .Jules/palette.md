## 2024-05-24 - AI Chatbot Icon Buttons A11y
**Learning:** The popup chatbot component heavily uses icon-only buttons (toggle, close, voice record, send) without descriptive `aria-label` attributes, making them inaccessible to screen readers. Dynamic states (like play/stop) need dynamic labels.
**Action:** Add dynamic and descriptive `aria-label` attributes to all icon-only interactive elements, ensuring assistive tech can announce their context and state.

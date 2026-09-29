# Fresh Coast Viewer

Offline-first mobile viewer notes for WNMU-TV staff covering the Fresh Coast Film Festival.

- Static PWA hosted by GitHub Pages.
- Notes save to the phone immediately.
- Sync uses the existing WNMU Supabase project and authenticated WNMU accounts.
- Synced feedback feeds the Google Sheet Viewer Feedback tab.
- The home screen attempts to use current public Fresh Coast and WNMU/PBS branding assets.
- Viewing screens intentionally use a low-light dark UI.


## Operations notes

- Additional festival viewers can be added later by assigning their name in the schedule data; the viewer-name field is not limited to the original three staff names.
- After the 2026 festival, when the Google Sheet is updated/finalized, ask whether it is time to retire or rotate the `fresh-coast-feedback-export` endpoint and its sheet export token.
- Before festival weekend, verify cold-start offline behavior on the actual phones: open the viewer online once, close it, enable airplane mode, reopen it, enter notes, reconnect, and sync.

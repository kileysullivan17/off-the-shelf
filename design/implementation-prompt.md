# Off the Shelf Retint: Implementation Prompt

Prerequisite: commit the design/ folder from this package into the Off the Shelf app repo (design-reference.html, support.js, reference-screens/, RECOLOR-DIRECTION.md). Then paste this into a Claude Code session in that repo. Opus, remote control and auto mode as usual.

NOTE: the app's working directory / repo may still be named "island-shopping-companion" or similar. The app's display name is now "Off the Shelf" — update the wordmark and visible title, but do not rename the repo/folder in this session.

---

Retint this app to the "Off the Shelf" cool violet direction. This is a COLOR retint only: keep the delivered layout, components, screens, and structure from design/design-reference.html intact. Read design/RECOLOR-DIRECTION.md and design/design-reference.html fully before starting. reference-screens/ shows the current (pre-retint) live app.

Why: the delivered redesign's palette is warm cream + ink + mustard, which collides with two other apps in the owner's portfolio (a warm-paper portfolio site and a warm sand/clay app). Off the Shelf must be the COOL, distinct member of the family while sharing the same structural bones (ink-on-light discipline, dot+label status chips, same type-scale proportions).

Target palette (tune exact stops during implementation, then verify contrast):
- Ground: cool near-white, around #F7F9FA (NOT cream). This is the single biggest separator from the warm apps.
- Ink / body text: cool near-black, around #14181B. Text is ALWAYS this cool ink, never violet or magenta (those fail AA at small sizes).
- Primary accent: violet, around #6D4AC9, as the dominant action color (buttons, active states, checkboxes, selected).
- Secondary pop: magenta, around #B0479E, used sparingly for review/attention flags (for example the "what do you think" flag), never as a large fill or body text.
- Neutrals: a cool slate/grey ramp replacing the warm taupe.
- Heat-safe marker: KEEP one warm signal here — a small amber (#8A5A00 text on #FDECC8) sun/heat chip — because it is the lone warm note against the cool field, so it pops as "watch the heat."
- Status system: keep the existing semantics (needed, in cart, bought, out of stock, substituted, moved, parked); retune each swatch to sit on the cool ground; keep dot + label, never color alone.

Signature gradient (subtle and premium — restraint is the rule):
- A violet-to-magenta linear gradient (about 135deg, #6D4AC9 -> #B0479E) appears ONLY on hero surfaces: the app/trip header band and the primary action button. Optionally the completed-trip / empty-state hero.
- Everywhere else is FLAT color. No gradient on cards, rows, chips, or body. Flat color carries all the working UI for bright-store legibility.
- The wordmark stays FLAT violet (not gradient) so it renders crisp at small sizes.

Work order, one commit each:
1. Retint the color tokens to the above (extend/replace only the color tokens; do not touch spacing, radii, or type scale). Load fonts if the design specifies any not already present. Build a contrast-check script and report the table: every text pair must pass WCAG AA, and checklist/trip-mode text should reach AAA (7:1) given bright-store use. Any violet/magenta fill carrying white or ink text must pass; darken the stop until it does and log it.
2. Apply the retint across trip mode and the store/list screens (the money screens): verify the status chips, heat-safe amber, and magenta review flag all read correctly on the cool ground.
3. Apply to add-item, staples, history, questions/inbox, returns, paste-import, and settings.
4. Add the signature gradient to the header band and primary button only. Wordmark flat violet.
5. Update the visible app name to "Off the Shelf" (wordmark and title/meta); do not rename the repo.

Constraints:
- NO logic changes: data layer, Supabase calls, trip sequencing, purchase memory, paste-import parsing, routing all frozen. Retint + name only.
- Mobile-first, one-handed; all targets >= 44px; status never color alone.
- All existing tests, typechecks, lint green after every commit. Log judgment calls in the decisions log.

Finish with a verify pass through every screen in a SEEDED/DEMO state (no real household data), attach screenshots, and confirm the contrast table. The seeded screenshots double as the portfolio card and montage source, so they must contain no real names or personal items.

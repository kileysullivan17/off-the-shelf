# Off the Shelf: Recolor Direction

## The problem (measured)
The delivered redesign's palette is a warm paper-and-ink scheme: grounds #efe8db / #fbf7f0, ink #19140d, taupe #6e6557, mustard accent #ffe86b. That is the same warm family as the portfolio (Warm Machine) and Foreground (Organic). Three cards sharing a palette makes the portfolio read as one template. Off the Shelf must move away while staying part of a congruent five-app family.

## The strategy: shared bones, distinct skin
Keep all four apps recognizably related by holding these constant across the family:
- Same structural token architecture (spacing 4-base, radii, elevation, type scale shape).
- Same status-system pattern (dot + label, never color alone).
- A shared neutral discipline: near-black ink text, clean light ground, one dominant accent per app.

Individuality comes from ONE lever: each app owns a different hue and temperature.
- Portfolio (Warm Machine): warm paper + ember (orange-red).
- Foreground (Organic): warm sand + clay/sage.
- Get to the Point (On Air): near-white + lime, dark "on air" mode.
- Off the Shelf: SHOULD BE COOL AND FRESH, the opposite temperature from the warm two.

## Off the Shelf target palette
Identity: a fast, bright, utilitarian tool. The reference class is a clean grocery/receipt/signage feel, not an editorial document.
- Ground: cool near-white or the faintest cool grey (e.g. #F7F9FA), NOT cream. This single change is what separates it most from Warm Machine.
- Ink: a cool near-black (e.g. #14181B), not the warm #19140d.
- Primary accent: a fresh, confident green (grocery-native, energetic) OR a clean bright blue, one of them as the dominant action color. Green leans "produce/fresh," blue leans "utility/trust." Pick one; do not use both as co-primaries.
- Secondary/support: a single cool neutral ramp (slate/cool-grey) replacing the taupe.
- Keep the existing status semantics but retune to the cool base: needed/in-cart/bought/out-of-stock/substituted/moved/parked each get a swatch that works on the cool ground.
- Heat-safe marker: this is a great place for one warm signal (a small amber/sun icon) precisely because the rest is cool, so it pops as "watch the heat."

## Congruence rule
So the five apps feel like a family, not strangers: same ink-on-light discipline, same chip pattern, same type scale proportions. Only the accent hue and ground temperature differ. Off the Shelf is the cool member; that is its recognizable individuality.

## What to hand the implementation session
Retint the delivered tokens to this cool direction rather than rebuilding layout: the screens, components, and structure in design-reference.html are kept; only the color tokens change. Verify every text pair still passes WCAG AA (AAA for checklist text given bright-store use) after the retint.

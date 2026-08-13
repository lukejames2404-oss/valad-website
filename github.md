repo: lukejames2404-oss/Hector-website
branch: main

## Last sync
date: 2026-08-12T00:00:00Z

### Leading pass narrowed after desktop breakage (2026-08-12)
The leading pass below was too blunt and broke desktop layout. Two faults:

1. **Display numerals.** Five 40px stat figures (2004, 6,644, GBP 2.1B, 6.8M,
   UK & Europe) were authored at `line-height: 1` *on purpose* — they sit in
   fixed-height tiles with a label under them. The pass read 1 as "too tight"
   and loosened it to 1.3, growing each numeral 40px -> 52px and pushing it into
   its label. valad.io does the same thing these tiles do: its own stat figures
   read **20px/20px**, ratio 1. That reading was in the notes and was missed.
2. **Wrong element types.** valad.io's 1.3-1.4 leading was measured on headings
   and paragraphs — normal-flow text, where a taller line box pushes siblings
   down harmlessly. The pass applied it to `div`, `span` and `select` as well,
   which on these pages sit in absolutely-positioned and fixed-height boxes,
   where the extra height overlaps instead of pushing.

Corrected: authored values restored on the five numerals, and leading reverted
on 19 non-heading/paragraph elements (5 About values-scroller names, 6 homepage
sector names + copy, 3 News, 5 Portfolio — including 5 `select` controls in the
filter bars that had no business being touched). The pass now applies to
`h1`-`h6` and `p` only.

Remaining change set is 47 style attributes across the six pages: heading and
paragraph leading, the 36->28 statement demotions, the footer statement, and
the three sector-layout values. Pre-pass originals kept in
`.backup-pre-typepass/` if any of this needs reverting.

**Not visually verified at desktop.** The browser pane renders at ~800px, so a
1440px composition cannot be seen in it, and the overlap detector used here
gives different results run to run depending on reveal-animation and lazy-image
timing — it is not a reliable before/after gate. The numeral fix is provable
(those declarations are now byte-identical to the originals bar whitespace);
the rest needs a human eye at a real desktop width.

### Sector scroller breathing room (2026-08-12)
The sector names read as trapped under the header. Measured, they were:

| @ | air above small index rail | air above sector name |
| --- | --- | --- |
| desktop 1280x800 | 10px | 56px |
| tablet 900x800 | (rail hidden) | **-6px** — name behind the header |
| phone 390x844 | (rail hidden) | 13px |
| phone 390x700 | (rail hidden) | **-15px** — name behind the header |

The constraint is `layoutMark()` (Homepage v2, ~line 590): it pins the mosaic to
the sector name's bottom edge + 56px, so air added above the name pushes the
mosaic down into the bottom-anchored copy block. The room had to be found, not
invented — the mosaic gives up height, and on tablet the copy anchor was
re-sloped so short viewports stop hoarding slack below the copy.

Now, verified at six viewport sizes:

| @ | rail | name | mosaic->copy | copy->facts |
| --- | --- | --- | --- | --- |
| 1440x900 | 95 | 104 | n/a (side column) | n/a |
| 1280x800 | 74 | 82 | n/a | n/a |
| 1280x700 | 56 | 60 | n/a | n/a |
| 900x800 | hidden | 30 | 34 | 40 |
| 900x700 | hidden | 15 | 16 | 14 |
| 390x844 | hidden | 47 | 64 | 75 |
| 390x700 | hidden | 24 | 30 | 39 |

- `.r-sec-index` 13vh -> 21vh (desktop only; the rail is hidden below 1200)
- `.r-sec-names` 18vh -> 22vh desktop, 11vh -> 15.5vh tablet, 16.5vh phone.
  Tablet and phone now carry separate anchors — phones drop the facts row lower
  and run a narrower mosaic, so they can afford more air than tablets.
- `#markBox` 52vh desktop (unchanged), 44vh -> 34vh tablet, 31vh -> 28vh phone
- Tablet `.r-sec-copy` `clamp(128px,19vh,200px)` -> `clamp(100px,33vh - 112px,200px)`;
  phone `calc(32.5vh - 50px)` -> `calc(32.5vh - 75px)`
- Desktop `.r-sec-copy` width cap 300px -> 208px. All five sector paragraphs now
  set 5 lines instead of 4 — their advance widths are 792-901px, so a 5th line
  needs the column under ~225px.

Two traps found by measuring rather than eyeballing, both worth knowing about:
`getBoundingClientRect()` on anything in this stage is polluted by the reveal
and scroll transforms, so all the numbers above are layout values
(`getComputedStyle().top`, `offsetHeight`); and `layoutMark()` recomputes on
resize using whatever transform is live at that instant, so the page has to be
reloaded after a resize before the mosaic's position means anything.

Not fixed: the browser pane would not screenshot the pinned sticky stage, so
this pass is verified by measurement only, not visually.

### Display type + leading correction (2026-08-12)
The pages still read heavier than valad.io at the same nominal size. Measured
both at 1280 rather than eyeballing, and found two causes:

1. **Leading.** valad.io runs `1.1` at 64px and *nowhere else* — every step from
   40px down sits at 1.3-1.4. These pages applied 1.1 across the whole display
   range, which is what made them read dense.
2. **One step too large.** valad.io carries the identical footer sentence
   "Unlocking Value by Transforming Real Estate." at **28px/44.8px**; ours was
   36px with no line-height at all. That 1:1 match showed the statement tier
   sat a step high throughout.

| | valad.io | was | now |
| --- | --- | --- | --- |
| Hero | 64 / 70.4 | 64 / 70.4 | unchanged |
| Section title | 32 / 44.8 | 32 / 35.2 | 32 / 44.8 |
| Statement | 28 / 36.4 | 36 / 39.6 | 28 / 36.4 |
| Footer line | 28 / 44.8 | 36 / normal | 28 / 44.8 |
| About section | 40 / 52 | 40 / 44 | 40 / 52 |

- 6 footer statements, 12 `h2` statements demoted 36 -> 28, 55 leadings raised
- Leading pass only ever *loosens* — Contact's 36px/1.5 paragraph was left alone
- Every value above is a reading off the live site, not a chosen number

Still open: the homepage sector scroller renders its names at 36px. valad.io
lists the same sectors at 20px/20px, but as a plain list rather than a pinned
full-bleed panel, so there is no like-for-like reading to copy. Left as is.

### Valad.io alignment pass (2026-08-12)
Audited all six pages against the live valad.io at desktop / tablet / mobile and
brought them onto its design system. Reference values were read out of the live
site rather than eyeballed:

| | valad.io | was | now |
| --- | --- | --- | --- |
| Typeface | Saans Light | PP Neue Montreal | Saans Light (vendored) |
| Weight | 300 only | 400 / 500 / 700 | 300 only |
| Breakpoints | 1200 / 810 | 1440 / 1024 / 768 | 1200 / 810 |
| Gutter | 80 / 40 / 20 | clamp(22,5.6vw,108) | 80 / 40 / 20 |
| Header | 94 / 94 / 92px | 82 / 68 / 62px | 94 / 94 / 92px |
| Logo | 85x22 at all widths | 30px, 24px on mobile | 85x22 at all widths |
| Nav | 15px | 16.5px | 15px |
| Buttons | pill, r60, h44-48 | square, full-bleed | pill, r60, h44 |
| Hero | 64px desktop / 39px mobile | up to 130px / 42.8px | 64px / 39px |
| Type scale | 12-64, fixed per breakpoint | 27 fluid clamps | same fixed ladder |

- Added `valad-system.css` (font-face, tokens, base) linked ahead of `responsive.css`
- Vendored `assets/saans-light.woff2` from Framer so the pages do not hotlink
- Dropped the now-unused PP Neue Montreal and Hedvig Letters Serif links

### Updated in this project
- Added `responsive.css`, a mobile/tablet layer built on the same principles as the Hector repo's own `responsive.css`: one external stylesheet linked from every page, every rule inside a `max-width` media query so the >=1440px desktop composition is untouched, `!important` to beat the inline styles, `r-*` hook classes in the markup, and the checkbox-driven full-screen nav overlay. Breakpoints match Hector's (1439 / 1023 / 767).
- Added a muted 4-column bordered partner-logo grid to the "Vertical integration" section of Valad Homepage v2, styled after the muted logo band on the Hector repo homepage

## Sync history
- 2026-08-11T00:00:00Z: Imported the user's edited Valad pages (Homepage v2, About, Portfolio, Contact) from uploads into live Design Components; copied logo assets and the world-map interactive component into the project

## Screen map
| Screen | Built from |
| --- | --- |
| Valad Homepage v2.dc.html | User-edited version of the Hector-based homepage; scroll-driven sectors + world-map |
| Valad About.dc.html | User-edited About page: values scroller, journey scroller |
| Valad Portfolio.dc.html | User-edited Portfolio page: filterable investment grid |
| Valad Contact.dc.html | User-edited Contact page |
| Valad News.dc.html | News index: filterable story grid + detail drawer |
| Valad Careers.dc.html | Careers page (dark header variant) |

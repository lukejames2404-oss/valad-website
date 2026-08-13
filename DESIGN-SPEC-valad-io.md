# valad.io — measured layout spec

Every number here was read off the live site with `getComputedStyle` /
`getBoundingClientRect` on 2026-08-13, at three viewports: **1440×900**,
**810×1080**, **390×844**. Nothing is estimated.

Note on widths: at 1440 the scrollbar takes 15px, so the layout box is **1425**,
not 1440. All x-positions below are in that 1425 space. Content column =
1425 − (2 × 80) = **1265**.

---

## 1. Global

| Token | valad.io | VAM now | Match |
|---|---|---|---|
| Page background | `#141414` (rgb 20,20,20) | `#EDECE8` (rgb 237,236,232) | ✗ |
| Type family | `Saans VF-TRIAL Variable Light` | `Saans` | see §7 |
| Weight (all text) | 300 | 300 | ✓ |
| Letter-spacing | `normal` (0) everywhere | `normal` (0) | ✓ |
| Gutter @1440 | 80px | 80px | ✓ |
| Gutter @810 | 40px | 40px | ✓ |
| Gutter @390 | 20px | 20px | ✓ |
| Content column @1440 | 1265px | 1265px | ✓ |

The gutter and content column already match at all three widths. That is the
spine of the layout and it is correct — the differences below sit inside it.

---

## 2. Header

### valad.io

```
position: fixed;  z-index: 10;  height: 94px;
background: rgba(255,255,255,0);   /* fully transparent, at all scroll positions */
backdrop-filter: none;  border: none;
padding: 24px 80px;                /* → inner row is 1265 × 46 */
```

Inner row: `display:flex; justify-content:space-between; align-items:center`.

**Left cluster** — `gap: 50px`, height 22px:

| Element | x | width | height |
|---|---|---|---|
| Logo (SVG data-URI bg) | 80 | 85 | 22 |
| Nav | 215 | 206 | 15 |

Nav is `display:flex; gap:32px`, three items:

| Label | x | width |
|---|---|---|
| Products | 215 | 61 |
| Assets | 308 | 44.6 |
| Team | 384.6 | 36.5 |

Nav type: **15px / line-height 15px / weight 300 / letter-spacing normal / `#FFF`**.

**Right cluster** — x 1041.8, width 303.2, height 46, `gap: 8px`, right edge
lands at 1345 = 1425 − 80:

| Pill | size | padding | radius | background | border |
|---|---|---|---|---|---|
| `contact@valad.io` | 156.2 × 46 | 0 20px | 60px | transparent | none |
| `Get in contact` | 139 × 44 | 0 22px | 60px | transparent | none |

Both pill labels: 15px / line-height 24px / weight 300 / `#FFF`. Neither pill
has any fill or outline at rest — they read as plain text with a 60px hit area.

### VAM now — deltas

| Property | valad.io | VAM | Action |
|---|---|---|---|
| Height | **94px** | 70px (`--valad-header-h`) | raise to 94 |
| Padding | **24px 80px** | 0 80px | add the 24px vertical |
| Inner row height | **46px** | n/a (no inner row) | add |
| Background | **transparent always** | `rgba(237,236,232,.9)` once scrolled | remove the scrolled fill |
| Logo | 85 × 22 @ x=80 | 85 × 22 @ x=80 | ✓ already identical |
| Logo → nav gap | 50px | 50px (via `padding-left`) | ✓ |
| Nav gap | 32px | 32px | ✓ |
| Nav x-start | 215 | 215 | ✓ |
| Nav font-size / weight | 15px / 300 | 15px / 300 | ✓ |
| Nav line-height | **15px** | `normal` (≈18px) | set to 15px |
| Nav items | 3 (Products, Assets, Team) | 4 (About, Portfolio, News, Contact) | **decision needed — §7** |
| Right cluster | 2 transparent pills, gap 8px, total 303.2 | 1 filled pill `#151515`, 185 × 44 | rebuild |
| Right edge | 1345 | 1345 | ✓ |

---

## 3. Hero

### valad.io

Section: `height: 900px` (100vh), `padding: 0 80px`, `display:flex`,
`justify-content:space-between`, `align-items:center`.

| Element | x | y | width | type |
|---|---|---|---|---|
| H1 line 1 "Institutional Assets," | 80 | 293 | 537 | 64px / 70.4px / 300 / `#FFF` |
| H1 line 2 "Built End-to-End" | 80 | 364 | 461 | same |
| CTA label "Open Hector Analytics" | 104 | 516 | 152 | 15px / 18px / 300 / `#141414` |

H1 is **left-aligned to the 80px gutter**, line-height ratio 1.10 (70.4 ÷ 64),
two hard lines, block height 141px.

### VAM now

H1 is already **64px / 70.4px / weight 300** at 1440 — an exact match on type.
The difference is structural: VAM's `h1` is a full-bleed block (x=0, w=1425)
with the text inset by its own padding, rather than a 537px-wide box sitting on
the 80px gutter. Same visual result at desktop, different behaviour as the
viewport narrows.

---

## 4. Section rhythm @1440

Vertical padding is where valad.io's spacing lives. Measured, top to bottom:

| # | Section | Height | Padding | Gap | Background |
|---|---|---|---|---|---|
| 1 | Header | 94 | — | — | transparent |
| 2 | Hero | 900 | `0 80px` | — | transparent |
| 3 | Thesis | 739 | `200px 80px 130px` | 200px | transparent |
| 4 | Belief | 625 | `160px 0 200px` | 200px | transparent |
| 5 | In action | 88 | `0` | 200px | transparent |
| 6 | Consultant team | 767 | `220px 80px 80px` | 120px | `#EDECE8` |
| 7 | Our assets | 851 | `0 80px 80px` | 160px | `#EDECE8` |
| 8 | Product suite | 2270 | `180px 80px 90px` | 0 | transparent |
| 9 | Our partners | 1052 | `80px 80px 120px` | 0 | transparent |
| 10 | How it works | 770 | `80px 80px 160px` | 0 | transparent |
| 11 | Hector Finance | 700 | `120px 80px` | 160px | transparent |
| 12 | Partners | 1096 | `150px 80px 160px` | 80px | `#FFF` |
| 13 | CTA + footer | 1391 | `0` | 0 | see §5 |

Total document height: **11250px**.

---

## 5. Footer

### CTA band

```
background: #EDECE8;   padding: 200px 80px;   height: 632px;
```

Inner block 1265 × 232, `display:flex`, `gap:50px`, centred.

| Element | x | width | type |
|---|---|---|---|
| Headline | 511 | 404 | 32px / 44.8px / 300 / `#141414` |
| Button row | 80 | 1265 | height 48, `gap: 4px`, centred |
| — button 1 | 548 | 119 | padding `0 22px`, gap 20px |
| — button 2 | 671 | 207 | padding `0 22px`, gap 14px |
| — "Download Overview" | 693 | 134 | 15px / 24px / 300 / `#141414` |
| — icon | 840 | 15 | 15 × 15 |

Headline is **centre-aligned**, not left.

### Footer proper

```
padding: 80px;   gap: 80px;   height: 759px;   background: #141414;
```

Inner column 1265 × 599, `display:flex; flex-direction:column; gap:80px`.

**Top row** — 1265 × 46, `justify-content:space-between; align-items:center`:

| Element | x | width | type |
|---|---|---|---|
| Tagline "Unlocking Value by Transforming…" | 80 | 548 | 28px / 44.8px / 300 / `#FFF` |
| Pill | 1208 | 137 | height 46, padding `0 22px`, gap 12px |

**Link area** — `gap: 48px`, two grids:

Grid A — 1265 × 210, `display:grid`, `gap:24px`, four columns:

| Column | x | width | padding-top | inner gap |
|---|---|---|---|---|
| 1 (mark) | 80 | 406 | 24px | 10px |
| 2 "Our Partners" | 510 | 262 | 24px | 32px |
| 3 "For Investors" | 796 | 262 | 24px | 32px |
| 4 | 1083 | 262 | 24px | 32px |

406 + 262 + 262 + 262 + (3 × 24) = 1264 ≈ 1265 ✓

Grid B — 1265 × 215, `display:grid`, `gap:24px`: col 1 x=80 w=406
(padding-top 24, gap 32), col 2 x=510 w=835 (padding-top 0, gap 24).

Link type: **15px / line-height 22.5px / weight 300 / `#FFF`**, row height 23px,
stacked at 32px gaps.

**Columns have no top border** — `border-top: 0px none`. The separation is done
with 24px of padding alone.

### VAM now — deltas

| Property | valad.io | VAM | Action |
|---|---|---|---|
| Columns @1440 | **4** — 406 / 262 / 262 / 262 | 3 — 474.75 / 339.125 / 339.125 | rebuild grid |
| Grid gap | **24px** | 56px | reduce |
| Column padding-top | **24px** | 38px | reduce |
| Column top border | **none** | `1px solid rgba(243,242,238,.22)` | remove |
| Footer padding | **80px** | `margin-top: 117px`, no padding | restructure |
| Footer inner gap | **80px** | — | add |
| Link line-height | **22.5px** | — | set |
| CTA headline align | **centred**, 32px / 44.8px | — | set |

---

## 6. Breakpoints

### @810 × 1080

| Property | valad.io | VAM | Match |
|---|---|---|---|
| Gutter | 40px | 40px | ✓ |
| Header height | 94px | 70px | ✗ |
| Nav | still visible (`display:flex`) | visible | ✓ |
| Hero H1 | 64px / 70.4px (unchanged) | 64px / 70.4px | ✓ |
| Hero padding | `0 40px` | `0 40px` | ✓ |
| Sections | all switch to `flex-direction: column` | — | check per section |
| Footer padding | `80px 40px` | — | ✗ |
| Footer inner gap | **50px** (down from 80) | — | ✗ |
| Footer grid | 9 tracks × 58.11px, gap 24px | 2 cols × 341.5px, gap 32px | ✗ |
| CTA band padding | `200px 80px` (keeps the 80) | — | ✗ |
| Document height | 13152px | — | — |

### @390 × 844

| Property | valad.io | VAM | Match |
|---|---|---|---|
| Gutter | 20px | 20px | ✓ |
| Header height | **92px** (2px shorter than desktop) | 70px | ✗ |
| Desktop nav | **removed from the DOM entirely** | present, `position:fixed` + burger | ✗ |
| Hero height | 844 (100vh) | — | — |
| Hero padding | `0 20px` | `0 20px` | ✓ |
| Hero H1 | **39px / 42.9px** (ratio 1.10) | 39px / **38.22px** (ratio 0.98) | size ✓, leading ✗ |
| Footer padding | `80px 20px` | — | ✗ |
| Footer inner gap | **80px** (back up from 50) | — | ✗ |
| Footer grid | 4 tracks × 69.5px, gap **40px 24px** | 2 cols × 159px, gap 32px | ✗ |
| CTA band padding | `200px 20px` | — | ✗ |
| Document height | 13345px | — | — |

The mobile H1 leading is the one type bug worth calling out: valad.io holds the
1.10 ratio at every width (64/70.4 and 39/42.9), while VAM drops to 0.98 at
390px, so the two lines nearly touch.

---

## 7. Two things that need a decision before "identical" is achievable

**1. The two sites have different information architecture.** valad.io's nav is
Products / Assets / Team plus a `contact@valad.io` pill. VAM's is About /
Portfolio / News / Contact. Matching the *proportions* is mechanical; matching
the *nav itself* means changing what pages VAM has and what they are called.
Those are different jobs and I have only done the measuring.

**2. valad.io is serving a trial font.** The live computed family is
`Saans VF-TRIAL Variable Light`. VAM ships `Saans` (self-hosted
`assets/saans-light.woff2`). VAM is on the correct footing here — copying
valad.io exactly would mean adopting a trial licence on a production site. I
have specced VAM's font as the target and treated this as the one place the two
should *not* match.

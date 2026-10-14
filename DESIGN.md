---
name: 펄세권 키오스크
description: A bubble-tea ordering kiosk set as a cafe felt letterboard in an oak frame.
colors:
  paper: "#121110"
  screen: "#1d1c1a"
  ink: "#f1ede4"
  muted: "#aaa497"
  line: "#3b3834"
  tile-line: "#4a4641"
  sweet: "#d08a55"
  tangy: "#f0a053"
  rich: "#c9b8a6"
  mild: "#b6a6e6"
  mark: "#f07a63"
  mark-soft: "#3a201a"
  oak: "#a77b4f"
  oak-dk: "#7c5836"
  oak-ink: "#1c120a"
  on-ink: "#1d1c1a"
  ledge-letter: "#f4ead9"
  field: "#faf7f1"
typography:
  display:
    fontFamily: "Gmarket Sans, Pretendard, Apple SD Gothic Neo, system-ui, sans-serif"
    fontSize: "104px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0"
    fontFeature: "tnum"
  headline:
    fontFamily: "Gmarket Sans, Pretendard, Apple SD Gothic Neo, system-ui, sans-serif"
    fontSize: "27px"
    fontWeight: 500
    lineHeight: 1.32
    letterSpacing: "0.02em"
  title:
    fontFamily: "Gmarket Sans, Pretendard, Apple SD Gothic Neo, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.02em"
  label:
    fontFamily: "Gmarket Sans, Pretendard, Apple SD Gothic Neo, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    letterSpacing: "0.02em"
  body:
    fontFamily: "Pretendard, Apple SD Gothic Neo, system-ui, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "Pretendard, Apple SD Gothic Neo, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  groove: "0px"
  tag: "3px"
  chip: "6px"
  frame: "8px"
  control: "10px"
spacing:
  groove-pitch: "10px"
  gap: "8px"
  row-y: "14px"
  board-x: "20px"
  ledge-x: "14px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    padding: "14px 18px"
    height: "56px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px"
    height: "50px"
  ledge-button:
    backgroundColor: "{colors.oak-ink}"
    textColor: "{colors.ledge-letter}"
    typography: "{typography.headline}"
    rounded: "{rounded.control}"
    padding: "14px 16px"
    height: "88px"
  letter-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.groove}"
    padding: "14px 44px 14px 2px"
    height: "72px"
  menu-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.groove}"
    padding: "14px 4px"
  option-chip:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.chip}"
    padding: "8px 14px"
    height: "44px"
  option-chip-selected:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    padding: "8px 14px"
    height: "44px"
  ledge-mini:
    textColor: "{colors.oak-ink}"
    rounded: "{rounded.frame}"
    padding: "8px 14px"
    height: "44px"
  ledge-input:
    backgroundColor: "{colors.field}"
    textColor: "#1b1a18"
    typography: "{typography.body}"
    rounded: "{rounded.frame}"
    padding: "0 14px"
    height: "50px"
  sold-tag:
    backgroundColor: "{colors.mark}"
    textColor: "#ffffff"
    rounded: "{rounded.tag}"
    padding: "3px 9px 3px 14px"
---

# Design System: 펄세권 키오스크

## Overview

**Creative North Star: "The Morning Letterboard"**

The owner pressed these letters into a felt board by hand this morning, and you order standing in front of it. The whole kiosk is one physical object: a grooved felt board (black by default, cream in the light theme) held in a 10px oak frame, with an oak ledge along the bottom carrying the physical buttons. Everything on the felt is lettering. Questions, menu names, options and prices are plastic letters set into the grooves. They are not tiles, cards or pills. When the screen changes, the new question's words drop into place one by one.

The system explicitly rejects the white card app it replaced: paper-coloured backgrounds, pill buttons and card shadows. Board density is menu-board density. Rows are separated by dashed groove rules rather than boxed, the letter face uses only three sizes, and colour is held back to the four taste pins, the drink illustrations, and one red for things the customer changed.

The drinks themselves are drawn in code. Each menu item has its own liquid layers, foam, blended texture and garnish. ICE drinks come in a clear plastic cup with ice, and HOT drinks in a glass mug with a handle and steam. The five desserts each have their own shape on a plate.

**Key Characteristics:**
- Grooved felt board in an oak frame; black felt is the default, cream felt the light theme, same token names in both.
- Lettering in Gmarket Sans Medium at three sizes; Pretendard for running text.
- Controls on the felt are letter rows on dashed groove rules; physical buttons live on the oak ledge.
- Selection reads as a pinned ▸ marker, an ink border and bright letters; everything not chosen dims; unavailable letters are struck through.
- Four fixed taste colours appear only as pins and in cup art; red (`mark`) is reserved for changes and warnings.

## Colors

The board is near-monochrome felt and letters. Colour arrives as small pins, as drink illustrations, and as one red.

Black felt (`data-theme="dark"`, set on `<html>`) is the default. The light theme swaps only the board material to cream felt with black letters, and every token keeps its name. The frontmatter carries the default (black felt) values. The light counterparts are paper `#d3ccbf`, screen `#e6dfd2`, ink `#1b1a18`, muted `#5a544b`, line `#c9c1b2`, tile-line `#bfb6a6`, sweet `#8a4b1f`, tangy `#d9731c`, rich `#2e211a`, mild `#8f7bc0`, mark `#b8321f`, mark-soft `#f6e3dc`, oak `#c39a6b`, oak-dk `#9a7348`, oak-ink `#2b1d10` and on-ink `#f4f1ea`.

### Primary
- **Plastic Letter White** (`ink`): every letter on the felt, the 2px rule above totals, the selected-chip border, and the fill of the one primary action. On cream felt it becomes black letters.
- **Felt Black** (`screen`): the board surface, laid with horizontal grooves. It also serves as the letter colour on filled ink controls (`on-ink`).

### Secondary
- **Brown Sugar** (`sweet`), **Passion Fruit** (`tangy`), **Espresso** (`rich`), **Taro** (`mild`): the four taste colours (달게, 상큼하게, 진하게, 순하게). They come from real ingredients and are a fixed product commitment. They appear only as coloured pins (category dots, taste-map points, numbered pick pins) and inside the drink art.

### Tertiary
- **Correction Red** (`mark`, with `mark-soft` behind it): reserved for what the customer changed and for warnings. It is used for the 변경됨 tag, the changed-choice chip border and marker, the board notes under the question, changed text in cart lines, and the 품절 tag pinned to sold-out rows.

### Neutral
- **Workshop Floor** (`paper`): the page behind the framed board.
- **Faded Letter** (`muted`): secondary lines, unselected options, axis and hint text.
- **Groove Rule** (`tile-line`) and **Felt Seam** (`line`): dashed row rules and chip outlines; `line` is the quieter outline for unselected chips and map gridlines.
- **Oak** (`oak`, edge `oak-dk`): the frame, the ledge, and the shelf line the welcome cups stand on.
- **Ledge Black** (`oak-ink`) with **Ledge Letter** (`ledge-letter`): the filled physical buttons on the ledge (매장/포장, 직원 부르기, 보내기).
- **Order Slip** (`field`): the free-text input on the ledge, which stays light in both themes.

### Named Rules
**The Four Pins Rule.** The taste colours are pins, not paint. They mark a dot, a map point, a numbered pick, or a cup's contents, and never a button fill, a border or a text colour.

**The Red Pen Rule.** `mark` means "you changed this" or "careful": changed options, warnings, 품절. Never use it for emphasis, branding or the primary action.

**The Same Board Rule.** Light and dark are the same board in a different felt. A theme changes token values only, never token names, layout or components.

## Typography

**Display Font:** Gmarket Sans Medium (with Pretendard, Apple SD Gothic Neo, system-ui), self-hosted from `fonts/GmarketSansMedium.woff`
**Body Font:** Pretendard 400 / 600 (with Apple SD Gothic Neo, system-ui), self-hosted as woff2

**Character:** Gmarket Sans is the plastic letter: round, even and slightly wide, with a little extra tracking so each glyph sits like a separate piece in the groove. Pretendard carries the explanatory sentences under the letters and never pretends to be lettering.

### Hierarchy
- **Display** (500, 104px, line-height 1, tracking 0, tabular numerals): the order number on the completion screen only. It is the single exception to the three-size rule.
- **Headline / t1** (500, 27px, 25px at ≤430px wide, 1.32, tracking .02em): the board question, totals, the large price, the ledge buttons and the phone number.
- **Title / t2** (500, 20px, 1.3, tracking .02em): menu names, option rows, category names, cart lines, the primary action and keypad digits.
- **Label / t3** (500, 14px, tracking .02em): the shop name, wait time, prices on rows, option headings and menu-group heads.
- **Body** (Pretendard 400, 16px, 1.5): dialog text, receipt notes and the input.
- **Body small** (Pretendard 400, 14px, 1.45 to 1.6, `muted`): the explanation line under each letter row, hints and board notes. Notes and tags at 12 to 13px stay in Pretendard.

### Named Rules
**The Three Letter Sizes Rule.** Lettering uses `--t1`, `--t2` and `--t3` and nothing else. The 104px order number is the only display exception. If a new letter needs a fourth size, it is body text and belongs in Pretendard.

**The Self-Hosted Rule.** Both faces load from the bundled `fonts/` directory with `font-display: swap`. No font CDNs.

## Layout

The kiosk is a single portrait board, max 410px wide and 820px tall (clamped to the viewport, min 600px), centred on the page with 28px/16px of page padding. It is a six-row grid: shop-name bar, the question area, the scrolling board body, the collapsible conversation log, the help nav and the input. The last two sit on the oak ledge.

The felt grooves repeat every 10px (`groove-pitch`). Content on the felt is padded 20px left and right and stacks with 8px gaps. Letter rows take 14px of vertical padding and are divided by dashed groove rules rather than whitespace or boxes. On the first screen, 매장/포장 sit on a full-bleed oak ledge band that pulls out to the board edges, continuous with the help nav and input below it.

At ≤430px wide the frame and page padding drop away. The board fills the viewport (100dvh), the oak border goes to 0, and `--t1` steps down to 25px.

The groove stripes (a repeating-linear-gradient on the board and dialog) and the board's `overflow: hidden` clipping are intentional and suppressed in `.impeccable/config.json`. The stripes are the felt material, and nothing positioned inside the board needs to escape it.

**Known open item:** on the first screen the cup shelf grows to fill the board (`flex: 1 1 190px`), which leaves a stretch of empty felt between the welcome line and the cups on tall viewports. This is recorded as unresolved, not as a spacing rule.

**The Groove Grid Rule.** Rows on the felt align to the grooves and are divided by 1px dashed `tile-line` rules. New board content is a row in the grooves, never a floating box.

## Elevation & Depth

Depth comes from the physical object, not from UI layering. The board itself is flat felt with inset shading under the frame. Letters cast a tiny drop shadow, as if raised plastic. Pins and the 품절 tag cast small soft shadows because they are stuck into the felt. Nothing on the board floats as a card. The only lifted surface is the dialog, which is a second framed board.

### Shadow Vocabulary
- **Frame** (`box-shadow: inset 0 0 0 1px var(--oak-dk), inset 0 2px 10px rgba(0,0,0,.25), 0 2px 4px rgba(0,0,0,.18), 0 24px 50px rgba(0,0,0,.28)`): the oak-framed board on the page; removed at ≤430px.
- **Raised letter** (`text-shadow: 0 1px 1px var(--letter-shadow)`; `0 2px 2px` on the order number): board question words, letter-row titles, menu names.
- **Pin** (`box-shadow: inset -2px -3px 0 rgba(0,0,0,.22), inset 2px 2px 0 rgba(255,255,255,.28), 0 2px 3px rgba(0,0,0,.3)`): taste dots, which read as round push-pin heads.
- **Pinned tag** (`box-shadow: 0 2px 3px rgba(0,0,0,.3)`, rotated -3deg): the 품절 tag and numbered pick pins.
- **Dialog board** (`box-shadow: 0 24px 60px rgba(0,0,0,.4)`, backdrop `rgba(10,8,6,.55)`): modal notices.

### Named Rules
**The Nothing Floats Rule.** No card shadows on the felt. A shadow on the board means a physical thing (a letter, a pin, a tag) is attached to it.

## Shapes

Lettering on the felt has no container, so it has no corners (`groove`, 0). The physical objects carry the rounding. The frame and the ledge mini-buttons and input use 8px corners, ledge buttons and filled actions 10px, option chips 6px, and tags 3px. Pins are circles. The 품절 tag is a small rotated label with a punched hole. Unavailable letters are struck through with a 1.5px line rather than hidden. The welcome cups stand on a 3px oak shelf line.

## Components

### Letter Rows (signature)
Letter rows are the board's own controls: a line of letters in a groove.
- **Shape:** full-width rows with no fill and no radius, 1px dashed `tile-line` rule below; the first row also gets one above.
- **Content:** a title-size letter line plus a body-small `muted` explanation. The fork and pay rows carry a chevron at the right (55% opacity, 100% on hover).
- **Hover / Press:** a faint `hover` wash; on press the row nudges down 1px.
- **Variants:** taste categories form a two-column grid of rows with dashed seams between them, each led by a taste pin and ending in an item count. Menu rows show a 52px drawn cup, then name … price, with a muted reason line below.

### Option Chips (selection)
- **Style:** 44px-high outlined chips in a choice row, all at equal width.
- **Unselected:** `muted` letters on a `line` outline, deliberately dimmed.
- **Selected:** a ▸ marker (inline SVG triangle), `ink` border, bright `ink` letters at weight 600, and `aria-pressed="true"`.
- **Changed from the recommendation:** the border and marker turn `mark`, and the group heading gets a 변경됨 tag.
- **Unavailable:** 50% opacity with a strikethrough.

### Buttons
- **Primary (`go`):** the one filled control on the felt: `ink` fill, `on-ink` letters at title size, 10px corners, 56px tall, full width, trailing arrow icon. Disabled sits at 35% opacity. It stays filled in every screen.
- **Ghost:** full-width outline in `tile-line`, 10px corners, 50px; the border turns `ink` on hover. Used for secondary routes (전체 메뉴 보기, 더 주문할게요).
- **Focus:** every control shows a 3px `ink` outline at 3px offset. On the ledge the outline switches to `oak-ink`.

### Oak Ledge
- **Ledge buttons:** 매장/포장 on the first screen are 88px `oak-ink` blocks with headline-size `ledge-letter` lettering and a 14px sub-line at 75% opacity; they go pure black on hover.
- **Navigation:** 뒤로 · 직원 부르기 · 처음으로 sit across the ledge as 44px mini-buttons on a translucent white wash, with `oak-ink` text in Pretendard 600. 직원 부르기 is filled `oak-ink`, so help is always the strongest of the three. 뒤로 dims to 45% when there is nowhere to go back to.
- **Input:** a light `field` slip with an `oak-dk` border and a filled `oak-ink` 보내기 button beside it. It is hidden on the notify and done screens.

### Taste Map
A square board inset (max 178px) plots every drink by sweetness (x) against richness (y), with gridlines in `line` and taste-pin dots. Dots that are not in focus drop to 22% opacity. The axis labels use the letter face. **Known open item:** they render at about 10px (21 SVG units in a 388-unit viewBox at 178px), which is below comfortable reading size. The map stays small because the team handoff requires the taste screen to fit without scrolling. Do not copy the 10px size elsewhere.

### Drink Illustrations
`DRINK_STYLE` in `screens.js` defines each drink's liquid layers (bottom-up with ratios), base foam, a blended flag (no ice visible, domed lid) and a menu-specific garnish (tiger stripes, grapefruit or lemon slices, passion-fruit seeds, mango cubes, cookie crumbs, aloe, vanilla specks, chocolate drizzle). ICE drinks render in a tapered clear cup with ice cubes and a straw (a wide straw for pearls and blends), with a flat lid or seal. HOT drinks render in a glass mug with a handle and steam. Toppings, shots, oat milk and syrup redraw the cup live. Desserts are five distinct shapes on a plate: scone, cookie, cheese bar, cheesecake stick and crepe. Cup outlines and straws use theme tokens (`--cup-line`, `--straw`); liquid colours come from the menu.

### Board Question and Notes
The question is set in headline lettering with balanced wrapping. Each word pins in from 7px above over .32s (`cubic-bezier(.16,1,.3,1)`), staggered 70ms per word and capped at 560ms. With reduced motion the words appear at once. Notes under the question are `mark` on `mark-soft` with a red dot.

### Totals, Receipt, Keypad
Totals sit under a 2px `ink` rule with the amount in headline lettering and tabular numerals. The receipt is the 104px order number pinned on the felt. The keypad is a 3×3+3 grid of 54px outlined keys in title lettering, with backspace as an inline SVG.

## Do's and Don'ts

### Do:
- **Do** set new board content as letter rows on 1px dashed `tile-line` groove rules, padded 14px vertically, inside the 20px board margin.
- **Do** show selection with the ▸ marker, an `ink` border, bright letters and `aria-pressed`, and dim the unselected options to `muted`.
- **Do** strike through what cannot be ordered and pin a `mark` 품절 tag on it, rather than hiding it.
- **Do** keep exactly one filled primary action (`ink` fill, 10px corners, 56px) per screen; physical buttons go on the oak ledge.
- **Do** keep lettering to `--t1` 27px (25px mobile) / `--t2` 20px / `--t3` 14px with .02em tracking; only the order number is larger.
- **Do** draw new menu items through `DRINK_STYLE` (layers, foam, blended, garnish), with clear cups for ICE and glass mugs for HOT.

### Don't:
- **Don't** bring back the white card app: paper backgrounds, pill buttons, card shadows, or filled tiles floating on the felt (the single primary action is the only filled control on the board).
- **Don't** use `--sweet`, `--tangy`, `--rich` or `--mild` for anything but pins and cup art, and don't change their roles; they are product commitments.
- **Don't** use `mark` red for anything other than customer changes, warnings and 품절.
- **Don't** add a fourth letter size or set body sentences in Gmarket Sans.
- **Don't** make light and dark themes differ in anything but token values.
- **Don't** load fonts from a CDN; both faces are self-hosted.

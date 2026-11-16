# Design system

Files: `app/ui/design.css` (tokens + surfaces + components, loaded after `theme.css`), `app/ui/common.js` (HTML helpers on `window`).
Old class names are kept and overridden by cascade; never rename them. Checks: `python3 tools/audit.py` (0 small controls), `python3 tools/contrast.py` (hero text AA).

## Tokens (CSS custom properties)
- Colour: `--bg #0b0c0c`, `--surface #141615` (standard card), `--surface2 #1a1d1b`, `--fg` warm ivory `#f0ebe0`, `--mute`, `--faint`.
- Accent: `--accent #9db39a` (sage, the single dominant accent), `--accent2 #b9cab6`, `--accent-rgb`, `--accent-ink`.
- Semantic, sparing: `--good` (emerald-sage), `--warn`, `--bad` (text on dark), fills `--oxblood #8e3b3b`, `--emerald #3f8f6b`.
- Lines: `--hair` (.10), `--hair2` (.18), tint fill `--tint` (.05 ivory).
- Spacing: `--s1..--s7` = 4 / 8 / 12 / 16 / 24 / 32 / 48. Radii: `--r1` 14, `--r2` 20 (hero).
- Shadows: `--shadow-1` (card), `--shadow-2` (floating). Soft, no coloured glow.
- Fonts: `--font-display` Cormorant Garamond (headings, numbers), `--font-body` Figtree (UI). Tabular figures are on globally.
- Imagery strength: `--wallop` (set by the Appearance setting, 1 to 5, default 2). Heroes must pass AA at the strongest setting.

## Type scale
eyebrow 11 px uppercase, .16em tracking; small 13; base 15; md 17; card `h2` 22 serif; `.big` 44 px at 390 to 56 at 1366 (`--t-big`);
hero number `--t-hero-num` 64 to 96; hero title `--t-title` 34 to 56. All use `clamp()`.

## Frame and spacing
- Page gutter 16 px at 390. At 860+ the left rail stays (body padding-left 112). Content max width 1180 (`#root.wrap`).
- Gap between cards 16 px (24 at 860+). Card padding 16 (24 at 860+). Inside a card: 16 below the `h2`, `.li` rows 12 px vertical, 44 px min.
- One hero per section, then at most one sub-nav, then standard cards. Leave the whitespace; do not fill it.

## Three surfaces
| Surface | Class | Use |
|---|---|---|
| HERO | `.sec-hero` (use `secHero()`) | Top of a section: scene image behind, dark overlay, eyebrow, serif title, ONE big serif number. Once per section. |
| STANDARD | `.card` | Main content: forms, logs, charts, the lists people act on. Solid `#141615`, 14 px radius, soft shadow. |
| QUIET | `.card.quiet` | Secondary lists, settings, history, empty areas. Transparent, hairline border only, no shadow. (`.card.flat` = no border either.) |

## Hero recipe
`secHero()` renders `section.sec-hero[data-scene]` > `.sec-hero__shade` (overlay: 84% at the bottom, 68% mid, 28% top, plus a left shade) > `.sec-hero__in` (eyebrow, h2 title, number+unit, sub, chips, actions).
The scene image is the fixed wall canvas behind the page and is chosen elsewhere; `data-scene` only labels it. With no image (body.nowall) the hero falls back to a solid dark gradient.
Text is positioned at the bottom, where the overlay is darkest. Keep the hero to: eyebrow, title, one number, one sentence, up to 3 chips, up to 2 actions.
Put `secHero(...)` first in the section HTML; `#app` top padding is removed when it is the first child.

## Sub-nav recipe
`subNav(items, current, act)`: a pill track of 44 px buttons with `data-act` and `data-v`, `aria-selected` on the current one. Scrolls horizontally at 390 with a right edge fade, so 5 items are fine.
Handle it in the existing click delegation: `if(a==='mm'){state.mm=t.dataset.v;render()}`. Use it below the hero, instead of the old `.seg` (which stays for 2 items).

## Controls
- Every button, input, select and summary is at least 44 px tall. `.chip` and `button.pill` are 44 px boxes with a 36 px visible pill drawn by `::before`.
- Week strip `.week` is 7 columns of 44 px minimum, scrolls if narrower. `input[type=file]` is 44 px. `a[data-act=tab]` links get a 44 px hit area without moving the layout.
- Primary action: `.btn.pri` (sage fill). Secondary `.btn`. Quiet `.btn.ghost`. One primary per card.

## Do
- Numbers that matter in serif (`.big`, `.mid`, hero number), tabular, with a small unit next to them.
- Sage for the one thing to press or read first. Oxblood or red only for overspend, overdue, errors. Emerald or green only for done and on-track.
- Whitespace between groups; hairlines instead of boxes inside cards.
- Test any new hero at wallop 0.5 and 1 with `tools/contrast.py`.

## Don't
- No glowing rims, no `box-shadow` with accent colour, no dotted or grid backgrounds, no gradient text.
- No second hero, no coloured gradient cards, no card inside a card with its own border.
- No new accent colours per section; the scene gives each section its mood.
- No text under 11 px, no controls under 44 px, no light text directly on an image without the shade.
- Do not rename or delete old classes; override them in design.css.

## common.js API (all on `window`, no side effects on load)
Strings starting with `<` are inserted as HTML, anything else is escaped with `esc()`.
```
secHero({scene, eyebrow, title, number, unit, sub, chips, actions}) -> html
  scene: 'coast'|'gym'|'table'|'arch'|'study'|'ridge'      (data attribute only)
  number: string, unit: string (small, next to the number)
  chips: array of text | '<html>' | {text, tone:'acc'|'good'|'warn'|'bad'}
  actions: array (or one) of '<button class="btn pri" data-act="...">..</button>' html
subNav(items, current, act) -> html
  items: [['key','Label'], ...] or [{key,label}, ...]; renders buttons data-act="<act>" data-v="<key>"
statRow([{label, value, sub, tone}]) -> html       tone: 'acc'|'good'|'warn'|'bad' (colours the value)
emptyState(text, actionHtml) -> html               actionHtml is optional ready HTML (a .btn)
```
Example: `secHero({scene:'arch',eyebrow:'Money · Nov',title:'Safe to spend',number:'₹1,240',unit:'today',sub:'On pace.'})+subNav(MM,state.mm,'mm')+statRow([...])`.

# Design patterns of exemplary long-form scholarly and explorable sites, applied to the "단면 / Cross-Section" redesign

Research date: 2026-11-16. Primary sources were the sites' own stylesheets, fetched with curl on that date (Distill template repo, Tufte CSS repo, ciechanow.ski base.css, quantecon-book-theme.css), plus designers' own write-ups and the W3C WCAG 2.2 Understanding documents. Where a value comes from my own measurement (contrast ratios, a font CDN check), the method is stated and the measured URL or file is cited. I also audited the site's current CSS at `prototype/traditional/style.css` in this repo, which is the stylesheet the live site links.

---

## Q1. What exact typographic and layout patterns do the best long-form scholarly web texts use?

### Takeaway
The best long-form scholarly sites share one skeleton: a single text column of roughly 640–710 px (about 65–85 Latin characters), body text at 17–21 px with line-height around 1.43–1.7, and a right-hand margin column of about 150–300 px for notes, all inside a wider "page" track that figures may break out into. Decoration stays off the text column: plain light paper, near-black ink, and at most one accent color for links. Distill's 704 px text column (at ≥1180 px) and Ciechanowski's 44rem (704 px) column are effectively the same measure.

### Cited Findings

**Distill (distillpub/template, `styles-layout.css`, `styles-base.css`, `d-article.css`; Apache-2.0, ©2018, fetched from master)**
- The layout is a named-line CSS grid applied to every top-level block (`d-title`, `d-article`, `d-appendix`, `d-byline`, footer). Its columns change at three breakpoints — [distill styles-layout.css](https://raw.githubusercontent.com/distillpub/template/master/src/styles/styles-layout.css):
  - **<768 px:** `8px [page/text] 1fr×8 [text-end] 8px`, gap 8 px, so text runs full width with 16 px total side margins.
  - **≥768 px:** 45 px × 10 columns, gap 16 px. Text spans 8 columns (≈472 px) and the gutter spans the last 2.
  - **≥1000 px:** 50 px × 12 columns, gap 16 px. Kicker 1 column, `middle` starts at column 2, text is columns 3–10 (8×50 + 7×16 = 512 px), and the gutter is columns 11–12.
  - **≥1180 px:** 60 px × 12 columns, gap 32 px. Text is 8×60 + 7×32 = **704 px**, `middle` (`l-body-outset`) is 10 columns ≈ 888 px, `page` is 12 columns ≈ 1072 px, the gutter is 2 columns ≈ 152 px, and `screen` is full bleed. (Widths computed from the grid template.)
- Layout classes: `.l-text`/`.l-body` → text, `.l-body-outset` → middle, `.l-page` → page, `.l-screen` → full bleed, `.l-gutter`/`aside` → gutter — [distill styles-layout.css](https://raw.githubusercontent.com/distillpub/template/master/src/styles/styles-layout.css).
- Asides in the gutter use `font-size: 12px; line-height: 1.6em; color: rgba(0,0,0,0.6)` — [distill styles-layout.css](https://raw.githubusercontent.com/distillpub/template/master/src/styles/styles-layout.css).
- Base type: `html { font-size: 14px; line-height: 1.6em }`, rising to 16 px at ≥768 px, in a system sans stack. Links are `#004276`. Paragraphs use `margin: 0 0 1em`. Tables use `border-collapse`, left-aligned `th`, and a `thead` bottom border of `1px solid rgba(0,0,0,0.05)` — [distill styles-base.css](https://raw.githubusercontent.com/distillpub/template/master/src/styles/styles-base.css).
- Article: `d-article { border-top: 1px solid rgba(0,0,0,0.1); padding-top: 2rem; color: rgba(0,0,0,0.8) }`. At ≥1024 px it sets `font-size: 1.06rem; line-height: 1.7em` (≈17 px / 29 px) — [distill d-article.css](https://raw.githubusercontent.com/distillpub/template/master/src/styles/d-article.css).
- Headings: h2 is 24 px, rising to **36 px** at ≥1024, weight 600, line-height 1.25, with a `border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 1rem`. h3 is 18→20 px, weight 700, margin-top 2em. h4 is 14 px uppercase, weight 600 — [distill d-article.css](https://raw.githubusercontent.com/distillpub/template/master/src/styles/d-article.css).
- In-text links are `color: inherit; border-bottom: 1px solid rgba(0,0,0,0.4)`, darkening to 0.8 on hover. Blockquotes use a `2px` left rule at `rgba(0,0,0,0.2)`, `padding-left: 2em`, italic, 60% ink — [distill d-article.css](https://raw.githubusercontent.com/distillpub/template/master/src/styles/d-article.css).
- The `.marker`/kicker (section number in the left "kicker" column) is 15 px, weight 600, 50% black, with a 1 px underline — [distill styles-base.css](https://raw.githubusercontent.com/distillpub/template/master/src/styles/styles-base.css); [d-article.css](https://raw.githubusercontent.com/distillpub/template/master/src/styles/d-article.css).

**Tufte CSS (edwardtufte/tufte-css, `tufte.css`, gh-pages, fetched 2026-11-16)**
- Base and page:
  - `html { font-size: 15px }`.
  - `body { width: 87.5%; padding-left: 12.5%; max-width: 1400px; background: #fffff8; color: #111 }`.
  - Dark mode: `@media (prefers-color-scheme: dark) { body { background: #151515; color: #ddd } }`.
  - Source: [tufte.css](https://raw.githubusercontent.com/edwardtufte/tufte-css/gh-pages/tufte.css).
- Text column and type:
  - `section > p, footer, table { width: 55% }`; lists are 50%.
  - `p { font-size: 1.4rem (21px); line-height: 2rem (30px ≈ 1.43) }`, with 1.4rem margins above and below.
  - Fonts: ET Book, falling back to Palatino and Georgia.
  - Source: [tufte.css](https://raw.githubusercontent.com/edwardtufte/tufte-css/gh-pages/tufte.css).
- Headings are light and italic: h1 `3.2rem`, weight 400, line-height 1. h2 `2.2rem` italic, weight 400. h3 `1.7rem` italic. `hr` is 1 px `#ccc` at 55% width — [tufte.css](https://raw.githubusercontent.com/edwardtufte/tufte-css/gh-pages/tufte.css).
- Sidenotes and margin notes:
  - `float: right; clear: right; margin-right: -60%; width: 50%; font-size: 1.1rem (16.5px); line-height: 1.3`, numbered with a CSS `counter(sidenote-counter)` in old-style figures.
  - Below 760 px, `body` becomes `width: 84%; padding: 0 8%`, text goes to 100% width, and notes are hidden behind a `<label class="margin-toggle">` + checkbox toggle.
  - Source: [tufte.css](https://raw.githubusercontent.com/edwardtufte/tufte-css/gh-pages/tufte.css).
- Figures: `figure { max-width: 55% }`, with `figcaption { float: right; max-width: 40%; font-size: 1.1rem; line-height: 1.6 }`. `.fullwidth` is 90% (100% for div/table). Tables sit in a sans wrapper (Trebuchet / Gill Sans) with `overflow-x: auto`. `span.newthought` uses small caps at 1.2em to open sections — [tufte.css](https://raw.githubusercontent.com/edwardtufte/tufte-css/gh-pages/tufte.css).

**Bartosz Ciechanowski (ciechanow.ski `/css/base.css`, fetched 2026-11-16)**
- `.padding_wrapper { max-width: 44rem; padding: 0 3rem; margin: 0 auto }` gives a 704 px reading column. `body { background: #F8F8F8; color: #444 }`. Body face is **IBM Plex Sans** and titles are **Inter** (both via Google Fonts). Header banner is `#2052BB`. Links are `#0181eb` (visited `#356082`) with a 0.15 s color transition. `strong` is weight 500, not 700. Heading scale is 1.8 / 1.5 / 1.3 / 1 em. Inline code is Menlo at 0.8em on `#eaeaea` — [ciechanow.ski base.css](https://ciechanow.ski/css/base.css); [article page head](https://ciechanow.ski/mechanical-watch/).

**QuantEcon lectures (`quantecon-book-theme.css`, intro.quantecon.org, fetched 2026-11-16)**
- Base and page:
  - Root size is 16 px, rising to 18 px at larger breakpoints. The reader can toggle `font-plus` (×1.2, 21.6 px) and `font-minus` (×0.9).
  - `body` is Source Sans Pro, `line-height: 1.5`, `color: #444`. Headings are **PT Serif** weight 400; h1 is 2em/900.
  - `.qe-page { max-width: 900px }`.
  - Source: [quantecon-book-theme.css](https://intro.quantecon.org/_static/styles/quantecon-book-theme.css).
- Margin and figure elements:
  - Margin notes, sidenotes and margin captions: `float: right; width: 40%; font-size: .9em; margin-left: .5rem`.
  - Full-width cells: `width: 136%`, breaking out of the column.
  - Equation numbers: `span.eqno { float: right; font-size: 1.2em }`.
  - Page footer: `border-top: 5px solid #0072bc`.
  - Source: [quantecon-book-theme.css](https://intro.quantecon.org/_static/styles/quantecon-book-theme.css).

**Rules of thumb from primary typography references**
- Butterick, *Practical Typography*:
  - **15–25 px** body on the web, line spacing **120–145%** of the point size, average line length **45–90 characters**.
  - All caps for less than one line, with **5–12%** extra letterspacing.
  - First-line indent (1–4× point size) *or* 4–10 pt paragraph space, never both.
  - Kerning always on; avoid system fonts.
  - Source: [Practical Typography, summary of key rules](https://practicaltypography.com/summary-of-key-rules.html).
- WCAG 2.2 SC 1.4.8 Visual Presentation (AAA):
  - Width **no more than 80 characters or glyphs (40 if CJK)**, text not justified, line spacing at least 1.5 within paragraphs, paragraph spacing at least 1.5× the line spacing, resizable to 200% without horizontal scrolling.
  - Rationale: "CJK characters are approximately twice as wide as non-CJK characters."
  - Source: [W3C Understanding 1.4.8](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html).

**Korean-specific**
- `word-break: keep-all` stops breaks between CJK characters, so Korean wraps only at the spaces between eojeol. Pair it with `overflow-wrap: break-word` (or `anywhere`) as a safety net for long words and URLs on narrow screens. `text-wrap: balance` suits headings and captions but has little effect on body text — [daleseo: long words](https://daleseo.com/css-long-words/); [daleseo: Korean line breaking](https://daleseo.com/css-text-wrap/).
- A third-party design-system gallery reports the KRDS (Korean government design system) body default as **17 px / line-height 1.5**, small body 15 px, caption 13 px. This was **not verified against krds.go.kr**. KRDS assets assume the Pretendard GOV typeface and follow KWCAG 2.2 — [oppadu KRDS summary](https://www.oppadu.com/tools/design-systems-site/brand/krds.html); [KRDS outline](https://www.krds.go.kr/html/eng/outline/outline_01.html).
- Google Fonts serves Korean by slicing the font with `unicode-range`. The CSS for Noto Serif KR at weights 400 and 700 contains **248 `@font-face` blocks** (about 124 slices per weight), so a page downloads only the slices whose glyphs it uses (my measurement of the API response, 2026-11-16) — [fonts.googleapis.com Noto Serif KR CSS](https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap).

**Audit of the current site (live `index.html` + `prototype/traditional/style.css`, 2026-11-16)**
- Body is `font-size: 19px; line-height: 1.62` in `'CMU Serif','Latin Modern Roman','Times New Roman'`, and paragraphs are `max-width: 640px`. The sheet is `max-width: 1180px` with `padding: 96px 72px 140px 132px`. Display face is `'Barlow Condensed','Arial Narrow'`. Several elements are `position: fixed` (title block, nav) — [style.css (repo)](https://voidmain443.github.io/Frontier_economics_BA/style.css).
- Font loading:
  - The live page does link both fonts: Google Fonts Barlow Condensed 400/500/600, and `cdn.jsdelivr.net/npm/computer-modern@0.1.2/cmu-serif.min.css`. Both returned HTTP 200 on 2026-11-16, and the first woff2 (`cmu-serif-500-roman.woff2`) is 222,840 bytes.
  - **However**, that package's `@font-face` rules declare only `font-weight: 500` and `700`, and use `font-style: roman`, which is not a valid CSS value (valid values are `normal | italic | oblique`).
  - Sources: [live site](https://voidmain443.github.io/Frontier_economics_BA/); [cmu-serif.min.css](https://cdn.jsdelivr.net/npm/computer-modern@0.1.2/cmu-serif.min.css).

### Inferences
- **Measure.** Distill's 704 px at ~17 px sans works out to roughly 80+ Latin characters. Tufte's 55% column at 21 px ET Book on a 1440 px screen is about 690 px, roughly 70–75 characters. Ciechanowski uses 704 px. The site's 640 px at 19 px CMU Serif is about 70–75 Latin characters, so **the English measure is already right**. In Korean, 640 px / 19 px gives about 33 Hangul syllables per line, within WCAG's 40-CJK limit. Don't widen the column. The Korean pages may even take a slightly smaller size (18 px) with taller leading.
- **Recommended text tokens.** These are syntheses of the cited values:
  - English: `font-size: 19–20px; line-height: 1.55–1.6; max-width: 36em` (about 680–720 px).
  - Korean: `font-size: 18px; line-height: 1.75–1.8; max-width: 36em; word-break: keep-all; overflow-wrap: break-word`. Hangul has no ascender/descender rhythm and needs more leading than Latin; this is a common practice rather than a sourced number, see Gaps.
  - Paragraphs: either 1em spacing or a 1–1.5em first-line indent, not both (Butterick).
- **Grid skeleton to adopt.** Copy Distill's named-line grid, which works without a build tool: `grid-template-columns: [screen-start] 1fr [page-start] 60px [middle-start] 60px [text-start] repeat(8, 60px) [text-end gutter-start] 60px [middle-end] 60px [page-end] 1fr [screen-end]; column-gap: 32px`. Map the site's components onto it:
  - body → `text`
  - "Held fixed" lines and short notes → `gutter`
  - SVG figure plates → `middle` (≈888 px) or `page` (≈1072 px)
  - zone markers / section numbers → the left `kicker` column (exactly where Distill puts its `.marker`)
- **Hierarchy.** Use Distill's pattern: h2 has a hairline bottom rule (`1px` at 10% ink), which fits the drafting vocabulary perfectly. Keep h2 at 30–36 px. For h3, use the condensed drafting face in small caps or uppercase at 14–15 px, tracked +6–10% (Butterick's 5–12%).
- **Font fix.** If the CMU faces render incorrectly in some browsers, the likely causes are the invalid `font-style: roman` descriptor, the missing 400 weight, and the ~220 KB per face. More importantly, **CMU Serif and Barlow Condensed contain no Hangul**, so every `.ko` page renders Korean in whatever OS fallback the reader has (AppleMyungjo, Batang, Apple SD Gothic Neo…). That alone would explain the "falls back to system fonts" impression on the Korean twin. The fix:
  - Self-host a corrected `@font-face` for the Latin face (`font-style: normal`, a 400-weight mapping, `font-display: swap`, `unicode-range` limited to Latin).
  - Put a Korean face second in the stack: e.g. `font-family: "CMU Serif", "Noto Serif KR", serif`, with Noto Serif KR served sliced from Google Fonts.
  - Use a Korean sans or condensed face for drafting labels on `.ko` pages.
  - Verify with `document.fonts.check('19px "CMU Serif"')` in DevTools.

### Gaps
- I could not fetch Richard Rutter's *Web Typography* measure chapter (HTTP 500), so Bringhurst's oft-quoted "45–75 characters, 66 ideal" remains unverified here. Butterick's 45–90 and WCAG's 80/40 are the verified bounds.
- I found no primary, research-backed source for a specific Korean body line-height (1.7–1.8 is common practice). The KRDS 17 px / 1.5 figure comes from a third-party summary.
- I did not re-verify how Chrome, Firefox and Safari treat the invalid `font-style: roman` descriptor. Test it in a browser.
- I did not inspect the CSS of Works in Progress, Stripe Press, The Pudding, Seeing Theory, Nicky Case's explorables, PubPub or CORE Econ (the CORE URL I tried returned 404, and the WiP homepage is a ~960 KB JS bundle), so no exact numbers are recorded for them.

---

## Q2. How do excellent sites handle figure numbering and captions, sidenotes and footnotes, equations, tables, "key facts" boxes, persistent navigation and TOC, chapter index cards, bilingual switches and dark mode?

### Takeaway
The recurring components are:
- **Captions:** small, 60%-ink, set to the figure's width or in the margin. Distill: 12–13 px. Tufte: caption floated right at 40%.
- **Notes:** CSS-floated sidenotes that collapse into tap-to-reveal or inline notes on mobile (Tufte, Gwern's survey).
- **Equations:** right-floated equation numbers (QuantEcon).
- **Tables:** hairline-only, with a left-aligned header row (Distill, Tufte).
- **Key facts:** a "Key insights" list near the top plus a "What you should know about this data" box (Our World in Data).
- **Navigation:** a sticky in-page TOC with active-section highlighting (QuantEcon).
- **Dark mode:** handled through CSS custom properties (Tufte, QuantEcon).

### Cited Findings
- **Figure captions.**
  - Distill: `figure { margin: 1.5em 0 2.5em }`, `figcaption { font-size: 12px → 13px at ≥1024; line-height: 1.5em; color: rgba(0,0,0,0.6) }`, with bold lead-ins inside captions at full black and weight 600. External images get a white mat: `padding: 18px; border: 1px solid rgba(0,0,0,.1); box-shadow: 0 1px 8px rgba(0,0,0,.1)` — [distill styles-base.css](https://raw.githubusercontent.com/distillpub/template/master/src/styles/styles-base.css).
  - Tufte: the caption floats to the figure's right side at up to 40% width — [tufte.css](https://raw.githubusercontent.com/edwardtufte/tufte-css/gh-pages/tufte.css).
  - QuantEcon: offers `margin-caption` figures whose caption floats at 40% width — [quantecon-book-theme.css](https://intro.quantecon.org/_static/styles/quantecon-book-theme.css).
- **Distill authoring conventions.** `.l-gutter` is for marginalia, asides and footnotes, "which doesn't interrupt body text except on mobile." `.l-middle`/`.l-page` give figures more room, with `-outset` variants. `.side` variants float right at about half width. Footnotes are auto-numbered and **hoverable**. Citations come from an inline BibTeX `<script type="text/bibliography">`, are cited with numbered `cite` elements that show details on hover, and the bibliography is generated in the appendix. Front matter (title, description, authors, affiliations) is structured data. The appendix holds acknowledgments and author contributions — [Distill guide](https://distill.pub/guide/). (The guide still documents the older `dt-*` element names; the current template uses `d-*`.)
- **Sidenote engineering, from Gwern's survey (created 2020-08-06, modified 2025-04-06):**
  - For light-to-moderate note use, prefer **Tufte-CSS-style static HTML/CSS** (fast, simple, no JS). For heavy use, a JS layout like sidenotes.js avoids overlaps.
  - Show notes by default ("click-to-reveal defeats the purpose") and collapse them to pop-ins on mobile.
  - Accept occasional overlap and have authors shorten long notes.
  - Mobile fallbacks seen in the wild: checkbox toggles (Tufte), inline rendering (Nystrom below 800 px; Butterick, who uses left-margin notes, below 520 px), floating footnotes, slide-up panels, endnotes.
  - Source: [Gwern, "Sidenotes in Web Design"](https://gwern.net/sidenote).
- **Equations.** QuantEcon floats equation numbers right (`span.eqno { float: right; font-size: 1.2em }`). Its dark theme forces MathJax ink to the theme text color (`mjx-math … color: var(--qe-dark-text) !important`) — [quantecon-book-theme.css](https://intro.quantecon.org/_static/styles/quantecon-book-theme.css). The Distill guide says to use MathJax or KaTeX — [Distill guide](https://distill.pub/guide/).
- **Tables.**
  - Distill: collapsed borders, left-aligned `th`, a 5%-black rule under `thead`, 0.5em padding — [distill styles-base.css](https://raw.githubusercontent.com/distillpub/template/master/src/styles/styles-base.css).
  - Tufte: tables at the 55% text width (or `.fullwidth`), in a sans wrapper with `overflow-x: auto` — [tufte.css](https://raw.githubusercontent.com/edwardtufte/tufte-css/gh-pages/tufte.css).
  - QuantEcon: transparent-background tables with collapsed borders and zebra striping only in dark mode — [quantecon-book-theme.css](https://intro.quantecon.org/_static/styles/quantecon-book-theme.css).
- **Key-facts and data-caveat boxes (Our World in Data, "Life Expectancy").**
  - After the intro comes a "Key Insights on Life Expectancy" list of five one-line takeaways. Each one heads its own section.
  - Each section has prose with superscript endnote links, an "In this article, we cover this in more detail" card block (thumbnail, title, teaser), a **"What you should know about this data"** box of bulleted method caveats, and a chart image linked to its interactive version.
  - The page ends with "Key Charts" (a counter like "Chart 1 of 43") and anchored endnotes with DOIs.
  - "Cite this work" gives a plain-text citation **and a BibTeX block**. "Reuse this work freely" states the CC BY license.
  - Source: [OWID life-expectancy page](https://ourworldindata.org/life-expectancy).
- **Persistent navigation and TOC (QuantEcon).**
  - A left sidebar with chapter navigation at `.9rem`.
  - An in-page TOC (`.qe-page__toc-nav`, `.9rem`) with a `position: sticky; top: 6rem` footer block, and the active entry highlighted in link blue.
  - A back-to-top button fades in at the bottom right (`opacity`/`translateY(10px)` transition, 0.3 s).
  - A top toolbar with search and font-size controls.
  - Source: [quantecon-book-theme.css](https://intro.quantecon.org/_static/styles/quantecon-book-theme.css).
- **Dark mode.**
  - Tufte flips to `#151515` / `#ddd` via `prefers-color-scheme` — [tufte.css](https://raw.githubusercontent.com/edwardtufte/tufte-css/gh-pages/tufte.css).
  - QuantEcon uses a token set on `body.dark-theme`: `--qe-dark-bg: #1a1a2e`, `--qe-dark-surface: #252540`, `--qe-dark-border: #3a3a5c`, `--qe-dark-text: #d4d4e4`, `--qe-dark-text-muted: #9898b0`, `--qe-dark-link: #6cb6ff`. Note the **blue-tinted dark background rather than neutral grey** — [quantecon-book-theme.css](https://intro.quantecon.org/_static/styles/quantecon-book-theme.css).
- **Translation metadata.** QuantEcon's page header has a `.qe-page__header-translators` line (muted `#6a6a6a`, .85rem, right-aligned on desktop), so translated editions credit translators in the header — [quantecon-book-theme.css](https://intro.quantecon.org/_static/styles/quantecon-book-theme.css).

### Inferences
- **Figure plate component** (for the site's 44 SVG figures). Make each figure a self-contained drawing sheet in the `middle` track. Collapsed to a single figure, the mini title block holds:
  - `FIG. 1.3` (drafting face, tracked caps, 13 px)
  - a one-line caption (CMU / Noto Serif, 15–16 px, 60–65% ink)
  - a **"Held fixed:" row typeset like a drawing note** ("NOTE: Pₓ, I, preferences held fixed"), set in the gutter at ≥1180 px and under the caption below that.

  This turns the site's distinctive "Held fixed" line into the equivalent of Distill's bold caption lead-in.
- **Sidenotes.** Use pure-CSS Tufte-style floats in the `gutter` track. On narrow screens, use a `<details>` or checkbox toggle, or render inline. That keeps the site build-free and JS-free, as Gwern recommends for moderate note density.
- **Equations.** If equations are added, KaTeX auto-render from jsDelivr works without a build. Float equation numbers right in the drafting face, styled like a drawing "detail number" (e.g. `(2.4)` in a small circle or box).
- **Key-facts boxes.** For each Part 1 stage, add a "What this cross-section holds fixed / what it hides" box modeled on OWID's "What you should know about this data". Draw it with a 1 px hairline frame and a drafting-face label tab ("NOTE 3"), not a tinted card.
- **Navigation.**
  - Replace the bordered-button row with a 44–48 px top bar on a **solid paper background** with a 1 px bottom hairline. It holds the sheet ID ("단면 · PART 1 · STAGE 3"), a reading-progress hairline (2 px, cobalt), the language switch and the "Fold into space" toggle.
  - At ≥1280 px, add a sticky left TOC (`position: sticky; top: 4–6rem; font-size: .85–.9rem`) that highlights the active stage the way QuantEcon does.
- **Bilingual switch.** Use a two-state segmented control, "EN | 한", in the top bar. It links to the twin page at the *same anchor* (`classical.html#stage-3` ↔ `classical.ko.html#stage-3`) with `hreflang` and `lang` attributes. Credit the translation in the header, as QuantEcon does.
- **Dark mode.** The site already has a dark, cyanotype "folded" state, so the paper page's own dark theme should be a **blueprint-tinted dark** (QuantEcon's navy-tinted `#1a1a2e` is the precedent): `--sheet: #0f1b2b`, ink `#dce7f3`, accents lightened. Keep it distinct from the WebGPU space so "folding" still reads as a change of medium.

### Gaps
- I did not verify the Distill v2 template's `d-footnote`/`d-cite` hover markup or its KaTeX `d-math` element directly; the guide page returned the older `dt-*` names.
- I found no exemplary site with a well-documented EN↔KO twin-page switcher; the bilingual pattern above is inferred.
- Stripe Press, Works in Progress and The Pudding's footnote and figure components were not inspected.

---

## Q3. How have designers used a technical-drawing / blueprint / engineering-paper aesthetic on the web while keeping body text readable?

### Takeaway
Successful "blueprint" sites use the grid as structure or as a barely visible backdrop behind hero and feature zones, never as a pattern under running text. They reserve accents for a few key elements, put crosshair "print center marks" only at a few junctions, and treat heavy effects (shaders, WebGL) as late-loading, skippable enhancements that pause under reduced motion. The rule designers repeat most is: if the grid is the first thing you notice, it is too strong.

### Cited Findings
- **Vercel, "What will you ship?" (Rauno Freiberg's craft write-up, Dec 2023).**
  - Layout and grid:
    - The hero sits on a visible frame, and the grid's columns "act as content guides" for the rest of the page.
    - Lines are CSS borders: cells draw their right and bottom edges, the container draws its top and left.
    - The grid is **1080 px with 360 px columns**, chosen to give "a readable line-length for 14–16px text."
    - Crosshairs are "inspired by traditional print center marks", used "to help guide the eye at certain points", and deliberately not overused.
  - Accent and motion:
    - Accent color is reserved for calls to action and key elements, because overusing it would make it feel insignificant.
    - Motion is budgeted by "novelty": high-novelty effects are never placed back to back.
    - Looping ambient animations pause under reduced motion; user-triggered ones are kept.
  - Performance and accessibility:
    - The hero's CSS, SVG and gradient layers render without client JS. The GLSL shader loads later and is **skipped on low-powered devices**.
    - Decorative visuals are hidden from assistive technology; meaningful ones get concise `aria-label`s.
  - Source: [rauno.me/craft/vercel](https://rauno.me/craft/vercel).
- **Setproduct, "Blueprint grid design and the Vercel aesthetic, explained" (Roman Kamushken, 2026-04-21).**
  - CSS recipes:
    - Line grid: two `linear-gradient` layers of `rgba(0,0,0,0.05)` 1 px lines at `background-size: 24px 24px`.
    - Dot grid: `radial-gradient` of `rgba(0,0,0,0.1)` at 16 px.
    - Grid lines in Figma terms: about `#E5E7EB` at 10–20% opacity, spacing 16 or 24 px.
  - Restraint rules:
    - The grid should be "barely visible… almost subliminal", and the most common mistake is making it too strong.
    - "If it's the first thing you notice, lower the opacity."
    - Don't fill every cell.
    - Keep text at least 4.5:1 against the pattern.
    - Don't stack gradients or illustrations on top of the grid.
    - Grids sit behind hero sections, pricing tables and feature showcases.
  - Palette and type: mostly black and white with 2–3 colors at most, one of them the accent. Geist Sans and Geist Mono, or Inter and JetBrains Mono.
  - Source: [setproduct blog](https://www.setproduct.com/blog/complete-guide-to-blueprint-grid-design).
- **Third-party "Blueprint / Engineering" design-system specs** set body text at 16 px / 1.6 with a 72-character cap, use monospace only for annotations and labels, and use a lighter gray for hairlines and muted text. These are community specs, not standards — [designmd.app Blueprint/Engineering](https://designmd.app/library/blueprint-engineering/); [superdesign Blueprint Grotesk](https://superdesign.dev/design-systems/blueprint-grotesk).
- **WCAG non-text contrast (SC 1.4.11).**
  - Graphical objects "required to understand the content" need **3:1 against adjacent colors**.
  - In charts, the data lines need 3:1 against the background, but they "do not need to contrast with each other or the graduated lines" when overlap is small.
  - Gridlines needed to read values are not automatically exempt.
  - Purely decorative graphics are exempt.
  - Source: [W3C Understanding 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
- **Contrast audit of the site's current palette.** These are my computations with the WCAG relative-luminance formula, using colors from `style.css`. The grid colors were alpha-blended onto `--sheet: #eef2ea`, which yields the effective colors `#cfdcce` (major) and `#e0e8de` (minor).

  | Token | Hex | On sheet | On a major gridline | Text use (4.5:1)? |
  |---|---|---|---|---|
  | ink | #1f231e | 14.06 | 11.22 | yes |
  | ink-2 | #545c51 | 6.12 | 4.88 | yes |
  | cobalt | #2a55a0 | 6.38 | 5.09 | yes |
  | madder | #b03b3b | 5.24 | **4.18** | fails on gridline |
  | olive | #587620 | 4.60 | **3.67** | borderline / fails on gridline |
  | ochre | #a8761c | **3.51** | **2.80** | fails as text; OK only as a ≥3:1 graphic on plain sheet |
  | rule | #9db097 | 2.04 | 1.63 | decorative only |
  | grid major vs sheet | — | 1.25 | — | — |
  | grid minor vs sheet | — | 1.10 | — | — |
  | chalk #dce7f3 on blueprint #0e2b4a | — | 11.46 | — | yes |

  Source palette: [style.css (repo)](https://voidmain443.github.io/Frontier_economics_BA/style.css); formula per [W3C Understanding 1.4.8/1.4.3 family](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html).
- **The site's current paper.** Two grids of `rgba(84,132,96,…)` lines, minor at **10 px** (alpha 0.09) and major at **50 px** (alpha 0.2), cover the entire `.sheet` behind all text — [style.css (repo)](https://voidmain443.github.io/Frontier_economics_BA/style.css).

### Inferences
- **Why the green grid hurts even though the ink passes contrast.** Numerically, ink on gridline is 11:1, so the problem isn't WCAG contrast. It is **interference**:
  - A 10 px minor grid is close to the text's stroke and x-height scale.
  - It doesn't align to the 19 × 1.62 ≈ 30.8 px baseline rhythm, so lines cut through letters at varying heights.
  - The 50 px major lines (1.25:1, far more visible than Setproduct's ~5% recommendation) form a second competing rhythm.

  Accent-colored text (madder, olive, ochre) does drop below 4.5:1 where it crosses a major line.
- **Fixes, in priority order:**
  1. **Confine the grid to figure plates.** Body text sits on plain paper (`#f3f1ea`–`#f4f5f0` range, or the current `#eef2ea` without pattern). Each SVG figure sits on its own engineering-paper "plate" in the `middle` track: 1 px border, 5 mm-style grid with the minor grid at ≤0.06 alpha and the major at ≤0.12, zone letters and numbers along the plate's frame, and a per-figure mini title block. The paper metaphor stays, and it is exactly where a real drafting sheet would have it, behind the drawing.
  2. **Keep the zone markers in the outer margin, not behind text.** Set the sheet's border zones (A–F down, 1–8 across) as a 20–24 px frame strip outside the reading column, in the drafting face at 11–12 px, 40–50% ink. They are decorative, so `aria-hidden="true"`.
  3. **If the page must keep an overall grid, make it a margin-only or baseline grid.** Options: a dot grid at ~0.06 alpha only in the `screen` gutters outside the `page` track, or a faint baseline-aligned grid whose pitch equals the line-height (30–31 px), masked out under the text column with a `mask-image` or an opaque `background` on the text column.
  4. **Move the title block.** Drawing sheets keep the title block in the lower-right corner, so make it a **static colophon at the end of each page** (title, part, sheet n of N, revision "D118", date, scale "NTS", drawn/checked). Use a per-figure mini title block in each plate. Never `position: fixed` it over text. If a persistent element is wanted, a 1-line "sheet ID" in the top bar does the same job.
  5. **Accent inks.** For text use, darken ochre to roughly `#8a5f12` (≈5.0:1 on `#eef2ea` by the same formula) and olive to around `#4a6418`. Keep the current lighter values for strokes ≥1.5 px in figures, where 3:1 suffices under SC 1.4.11. Following Vercel's reserved-accent rule, keep cobalt as the single interactive and link color and use the other three inks only inside figures for curve identity (demand/supply/etc.).
  6. **Hairlines and dimension lines as UI vocabulary.** Section breaks become a 1 px rule with tick marks at the ends. h2 gets a Distill-style hairline underline. Callouts get a leader line with an arrowhead from the gutter note to the referenced phrase. Place one crosshair (print center mark) per section junction at most, per Vercel's "not overused".
- **The 2D ↔ 3D "fold".**
  - Follow Vercel's shader pattern. The paper page must be complete without JS and WebGPU.
  - Lazy-load the WebGPU module only on the button press.
  - Feature-detect `navigator.gpu` and hide the button when unsupported.
  - Under `prefers-reduced-motion: reduce`, replace the fold animation with an instant cross-fade to a static blueprint rendering, and pause looping glow and parallax.
  - Since the fold is user-triggered, Vercel's rule permits keeping it, but provide an instant variant.
- **Display type.** A condensed, stencil-adjacent drafting face (Barlow Condensed is fine) for labels only, ≤1 line, uppercase, tracked +6–10%. The body face stays serif for the textbook voice. On `.ko` pages, pair it with a Korean sans for labels, since condensed Hangul options are scarce. This pairing is untested; see Gaps.

### Gaps
- I did not examine Teenage Engineering, Linear, Shopify Editions or architecture-studio sites directly within the tool budget, so I have no exact values from them. I found no design write-up specifically about a "Shopify Editions Fall '26 blueprint" site.
- I found no published study on how background-pattern frequency affects reading speed, and the WCAG Understanding 1.4.8 page says nothing about background patterns. The interference argument above is reasoned, not cited.
- I have no verified source for a good condensed or stencil Korean display face.

---

## Q4. What makes a book-catalog or curriculum-map page look excellent?

### Takeaway
Strong catalog pages give every item a distinct visual identity at a consistent shape, so the eye reads the collection as a set and the members as individuals (Stripe Press's book spines with per-book color schemes). Strong curriculum maps encode sequence and prerequisite relations explicitly: lines and stations, with solid vs. dashed arrows. A plain grid of identical boxes does neither.

### Cited Findings
- **Stripe Press** (unofficial descriptions only):
  - A dark backdrop with the books shown as spines; each book has its own color scheme; details and purchase links appear on click. One reviewer describes browsing it as "similar to exploring a library" and "not overpowering with flashy effects" — [student web review](https://tdavis.bitweb1.nwtc.edu/wfed2/website-reviews/stripe-press/index.html).
  - A third-party style reference says title and author use **Ivar Headline / Ivar Text**, with line-heights tuned to the spine metaphor, square-cornered blocks and no gradients — [refero style reference](https://styles.refero.design/style/54f257e9-1d6b-4410-b94a-1dfe648ecc87).
  - No official Stripe Press design documentation was found.
- **Metro-map curriculum (ASEE 2022 work-in-progress paper).** Degree programs drawn as a metro map: each major's requirements form a **line**, courses are **stations**, and shared courses become interchange stations that expose how curricula interrelate — [ASEE PEER paper](https://peer.asee.org/work-in-progress-a-metro-map-based-curriculum-visualization-for-examining-interrelated-curricula).
- **Prerequisite-map notation (Okayama University, 2024).** **Solid arrows** mark prerequisites, **dashed arrows** mark prerequisites with options, and solid or dashed **boundaries around groups** mark shared or multiple prerequisites — [Okayama Discovery Prerequisite Map PDF](https://discovery.okayama-u.ac.jp/master/wp-content/uploads/2024/05/Discovery_Prerequisite_Map_202403.pdf.pdf).
- **OWID index patterns.** A "Key Charts" list of thumbnail + title + source tag, with a counter ("Chart 1 of 43"). "Research & Writing" card grids show date, thumbnail, title and authors — [OWID life-expectancy page](https://ourworldindata.org/life-expectancy).
- **QuantEcon index cards.** `.web-version` and `.home-alternatives` cards (thumb + h2/h3 + p) shift border color to the link blue and lighten the background on hover. TOC captions are set in PT Serif at 1.2rem — [quantecon-book-theme.css](https://intro.quantecon.org/_static/styles/quantecon-book-theme.css).

### Inferences
- **Use the drawing-set vocabulary for Part 3's 22 books / 301 chapters.** Construction document sets open with a **sheet index / drawing register**, a table. The site already has a `.partslist` component. A register is a native technical-drawing form, so it adds hierarchy without abandoning the concept. Columns:

  | Column | Content |
  |---|---|
  | Sheet no. | e.g. B-07 |
  | Title | the book's title |
  | Work | one of the 8 works |
  | Chapters | count |
  | Prerequisites | sheet numbers |
  | Status / revision | e.g. D118 |

  Group rows by the eight works, with a hairline group header (drafting face, tracked caps) and a tabular-figure chapter count. That gives the hierarchy plain boxes lack: work → book → chapter.
- **One overview diagram above the register.** A metro or "wheel of wealth" floor plan where each of the 8 works is a colored line or sector and each book is a station. Follow the Okayama notation (solid = required prerequisite, dashed = optional). Clicking a station scrolls to its register row. Keep it a static inline SVG so it works without build tools.
- **Book cards, if cards are kept.** Give each book a "spine": a narrow vertical band in its work's accent ink, with the sheet number set vertically in the drafting face. Card body: title in serif at 18–20 px, a one-line thesis at 15 px / 65% ink, chapter count and prerequisites as small tabular metadata. Shape stays uniform while identity comes from color, as Stripe Press does with per-book color schemes. Use 1 px hairline borders, not filled boxes. On hover, change only the border color (QuantEcon's pattern).
- **Part 1 (8 stages) and Part 2 (9 sections).** A horizontal "stage strip" works well: a dimension line with 8 tick marks, each labeled with the stage number and short title, and the current stage highlighted. It doubles as in-page progress navigation.

### Gaps
- MIT OCW course maps, Khan Academy and Brilliant course maps, and the Stripe Press site itself were not inspected directly, so no measured values are available for them.
- I found no rigorous evaluation of metro-map versus list curriculum displays; the ASEE paper is work-in-progress.

---

## Q5. Accessibility and readability guidance relevant to these choices (WCAG contrast, background pattern contrast, reduced motion)

### Takeaway
At WCAG level, body text needs 4.5:1, and figure lines and controls need 3:1 against adjacent colors. Line length, spacing and resize behavior have explicit AAA targets: ≤80 Latin or ≤40 CJK glyphs, line spacing ≥1.5, paragraph spacing ≥1.5× line spacing, 200% zoom without horizontal scroll. Background patterns aren't addressed by a specific success criterion, so practitioners apply 4.5:1 "against the pattern" and keep patterns out of text areas. Ambient motion should pause under `prefers-reduced-motion`.

### Cited Findings
- **SC 1.4.8 Visual Presentation (AAA).** Foreground and background colors selectable by the user, width ≤80 characters (40 if CJK), not justified, line spacing ≥1.5, paragraph spacing ≥1.5× line spacing, resize to 200% without horizontal scrolling — [W3C Understanding 1.4.8](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html).
- **SC 1.4.11 Non-text Contrast (AA).** 3:1 for UI components and states, and for graphical objects required to understand content. Lines in a chart need 3:1 against the background. Decorative graphics are exempt. Graphics whose information is duplicated in text labels are not required to meet the ratio — [W3C Understanding 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
- **Practitioner guidance on grid backgrounds.** Keep text at ≥4.5:1 against the pattern, keep the grid "barely visible", and lower its opacity if it's the first thing noticed — [setproduct blog (2026-04-21)](https://www.setproduct.com/blog/complete-guide-to-blueprint-grid-design).
- **Reduced motion and decoration in practice (Vercel).** Looping ambient animation pauses for reduced-motion users. Decorative visuals are hidden from assistive technology. The shader loads late and is skipped on low-power devices — [rauno.me/craft/vercel](https://rauno.me/craft/vercel).
- **Sidenote accessibility.** Notes should keep a sensible reading order for screen readers and keyboard focus. Reader modes may strip CSS-positioned notes. Click-to-reveal hides content by default, which defeats the purpose — [Gwern, "Sidenotes in Web Design"](https://gwern.net/sidenote).
- **Reader font-size control.** QuantEcon exposes A+/A− controls (×1.2 / ×0.9 on the root font size) — [quantecon-book-theme.css](https://intro.quantecon.org/_static/styles/quantecon-book-theme.css).
- **Korean wrapping.** Use `word-break: keep-all` with `overflow-wrap` so 200% zoom on narrow screens doesn't overflow — [daleseo](https://daleseo.com/css-long-words/).

### Inferences
- **Checklist for the redesign:**
  - All text, including captions, gutter notes, the drafting-face labels that carry meaning, and the "Held fixed" lines, should reach ≥4.5:1 against the **actual pixels behind it**. Removing the grid from text areas makes this automatic.
  - Ochre text must be darkened (current 3.51:1).
  - Figure curves and axes should reach ≥3:1 against the plate.
  - Plate gridlines are decorative when values are labeled. Under 1.4.11 they may stay faint (≤1.2:1) as long as axis ticks and labels carry the values.
- **Fixed elements.** The fixed title block and the transparent fixed nav fail the spirit of 1.4.8 and 1.4.10-type reflow at 200% zoom, because they cover a growing share of the viewport. Make the title block static (colophon). Give the nav a solid background and a height ≤48 px, or make it scroll away and reappear on upward scroll.
- **Motion.** Gate the fold animation and any ambient glow behind `@media (prefers-reduced-motion: no-preference)`. Offer the blueprint view as an instant swap otherwise. Add `aria-pressed` on the fold toggle, and keep a "Return to paper" control that keyboard focus moves to.
- **Language.** Set `lang="ko"` / `lang="en"` on each twin page, and `lang` on inline foreign terms. Screen readers and font fallback both depend on it, and it lets CSS apply Korean-specific leading via `:lang(ko)`.

### Gaps
- I did not re-fetch the texts of SC 1.4.3 (Contrast Minimum: 4.5:1, 3:1 for large text), 1.4.10 (Reflow), 1.4.12 (Text Spacing) or 2.3.3 (Animation from Interactions) in this session. The report writer should cite their W3C Understanding pages directly if quoting thresholds beyond those above.
- I found no WCAG success criterion or W3C guidance that specifically quantifies acceptable background-pattern "busyness" behind text. That aspect is practitioner guidance only.
- Korean-specific accessibility norms (KWCAG 2.2) were not examined beyond KRDS stating that it follows them.

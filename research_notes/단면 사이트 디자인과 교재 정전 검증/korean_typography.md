# Korean (Hangul) web typography for 단면 / Cross-Section: webfonts, pairing, math, CSS

Method and status (2026-11-16). Every CDN URL below was checked with `curl` on 2026-11-16 (HTTP status and byte size are given). Package versions come from the jsDelivr data API and cdnjs API. Font metrics (x-height, cap height, Hangul ink height, advance widths, glyph coverage) were measured with fontTools on the actual webfont files, or on Google Fonts `text=` subsets. Browser support comes from MDN browser-compat-data (BCD) JSON. The session's WebSearch budget ran out partway through, so designer interviews, Brunch, Publy and similar publisher specs, and a few licence pages could not be researched. They are listed under Gaps.

Current state of the site, from the repo file `prototype/traditional/style.css`, lines 25–26 and 1128–1139:
- Base: `--serif: 'CMU Serif','Latin Modern Roman','Times New Roman',serif; --draft: 'Barlow Condensed','Arial Narrow',sans-serif;`, body 19px/1.62, `p {max-width:640px; hyphens:auto}`, `i, em {font-style:italic}`.
- Korean override already exists: `:root:lang(ko){--serif:'CMU Serif','Noto Serif KR','Apple SD Gothic Neo',serif; --draft:'Barlow Condensed','IBM Plex Sans KR','Apple SD Gothic Neo',sans-serif}`, `:lang(ko) body{font-size:18px;line-height:1.8}`, `word-break:keep-all; overflow-wrap:break-word`, `:lang(ko) h1,h2{letter-spacing:-0.03em}`, and mobile 16.5px/1.75.
- No page links any font CSS and the stylesheet has no `@font-face`, so none of these families load unless they are installed locally. The `*.ko.html` pages do set `<html lang="ko">`.

---

## Q1. Which Korean serif (본문 바탕/명조) webfont for long-form screen reading?

### Takeaway
**MaruBuri (마루 부리, Naver, OFL)** is the best fit for a modern textbook body face, used at Regular 400 plus SemiBold 600 (and Bold 700 if needed). It has five weights and all 11,172 syllables. Naver's CORS-enabled CDN serves each weight as one woff2 of about 415–466 KB, and the files are not content-dependent. **Noto Serif KR (Google Fonts, variable 200–900, auto-sliced)** is the zero-effort alternative. Its contrast is more traditional, and it cost about 1.1 MB for just two of the site's Korean pages. The other candidates are weaker for this use. RIDIBatang has one weight only. KoPubWorld Batang is about 3 MB per weight and forbids modification. Nanum Myeongjo feels dated. Gowun Batang has two weights and a handwritten warmth. Hahmlet is quirky and better suited to display.

### Cited Findings
**MaruBuri (마루 부리)**
- Five weights (ExtraLight, Light, Regular, SemiBold, Bold), serif ("부리") classification, credited to Naver and the Naver Cultural Foundation, licensed OFL. Commercial embedding and logo/CI use are allowed. — [Sandoll Cloud: Maru Buri](https://www.sandollcloud.com/free-font/16193/Maru-Buri)
- Naver released the five-weight family on Hangeul Day 2021, after a 2020 trial release. It was developed with user participation, described as "4 years with about 60,000 users". The press count was 4,363 Hangul, 296 Latin and 971 symbol glyphs. — [NewDaily, 2021-10-06](https://biz.newdaily.co.kr/site/data/html/2021/10/06/2021100600021.amp.html) (read via a search summary). **Conflict:** the webfont files I inspected contain all 11,172 precomposed Hangul syllables (U+AC00–D7A3), measured with fontTools on [MaruBuri-Regular.woff](https://hangeul.pstatic.net/hangeul_static/webfont/MaruBuri/MaruBuri-Regular.woff). The "4,363" figure may count designed rather than encoded glyphs, or refer to an earlier build.
- Licence metadata: `"spdx": "OFL-1.1"`, pointing to Naver's licence help page. — [@kfonts/maruburi metadata.json](https://cdn.jsdelivr.net/npm/@kfonts/maruburi@0.1.0/metadata.json)
- Naver CDN CSS is live (HTTP 200): `https://hangeul.pstatic.net/hangeul_static/css/maru-buri.css`. It declares **a separate family name per weight** ('MaruBuriExtraLight', 'MaruBuriLight', 'MaruBuri', 'MaruBuriSemiBold', 'MaruBuriBold') **with no `font-weight` descriptors**, and lists eot, woff2, woff and ttf sources. — [maru-buri.css](https://hangeul.pstatic.net/hangeul_static/css/maru-buri.css)
- Naver woff2 sizes, one unsliced file per weight: ExtraLight 413,948 B, Light 434,944 B, Regular 433,776 B, SemiBold 466,108 B, Bold 451,596 B. Response headers are `access-control-allow-origin: *` and `cache-control: max-age=2592000` (30 days). — [Regular woff2](https://hangeul.pstatic.net/hangeul_static/webfont/MaruBuri/MaruBuri-Regular.woff2)
- jsDelivr npm alternative `@kfonts/maruburi@0.1.0`. It maps the weights correctly (family '마루 부리', weights 200/300/400/600/700, `font-display: swap`), but its woff2 files are 801–892 KB each, about twice the Naver files. jsDelivr serves them with `immutable`, a one-year cache and CORS `*`. — [index.css](https://cdn.jsdelivr.net/npm/@kfonts/maruburi@0.1.0/index.css)
- Measured MaruBuri Regular metrics (UPM 1000): Latin x-height 0.467 em, cap height 0.655 em, Hangul ink height ('한/국/가') up to 0.960 em, Hangul advance 0.970 em. It has only 2 Greek code points and 0 Hanja. hhea ascent/descent/lineGap in the Naver build: 800/−200/345. — measured from [Naver woff](https://hangeul.pstatic.net/hangeul_static/webfont/MaruBuri/MaruBuri-Regular.woff)
- One search summary says AG Typography Institute (AG 타이포그라피연구소) lists planning and development of 마루 부리 in its portfolio. — [agfont.com/about](https://agfont.com/about) (not fetched directly; treat as unverified)

**Noto Serif KR / Source Han Serif (본명조)**
- Google Fonts: designer Google, OFL, variable `wght` 200–900. Subsets are cyrillic, korean, latin, latin-ext and vietnamese. The description says it "also supports Hiragana, Katakana, Latin, Cyrillic and Greek". — [google/fonts notoserifkr METADATA.pb](https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifkr/METADATA.pb), [DESCRIPTION](https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifkr/DESCRIPTION.en_us.html)
- `https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@200..900&display=swap` returns 124 `@font-face` blocks, each a `unicode-range` slice of woff2 (verified 200). A single slice, for example #50, is 50,492 B. — [CSS2 API](https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@200..900&display=swap)
- I measured the cost on this site. The text of `index.ko.html` plus `classical.ko.html` contains 686 unique characters, 577 of them Hangul syllables. The variable 200–900 axis pulled 28 slices, about 1,122 KB. A 400-only request pulled 28 slices of about 596 KB. Requesting `wght@400;700` gets the same variable files, so it costs the same as the full axis. — same CSS2 API, with sizes taken from gstatic `Content-Length`
- Measured metrics: Latin x-height 0.516, cap 0.728, Hangul ink 0.961, Hangul advance 0.966. — [Google Fonts `text=` subset](https://fonts.googleapis.com/css2?family=Noto+Serif+KR)
- Upstream Source Han Serif is SIL OFL 1.1 with seven weights. A Korean "Subset Variable" (OTF/TTF) and a region-specific Korean OTF zip are offered. — [adobe-fonts/source-han-serif README](https://github.com/adobe-fonts/source-han-serif)
- npm mirror: `@fontsource-variable/noto-serif-kr@5.3.1`. Its CSS returns 200 and is also unicode-range sliced. — [jsDelivr](https://cdn.jsdelivr.net/npm/@fontsource-variable/noto-serif-kr@5.3.1/index.css)

**RIDIBatang (리디바탕)**
- Single weight (400). Licence metadata says `OFL-1.1`, with homepage ridicorp.com/ridibatang. — [@kfonts/ridi-batang metadata.json](https://cdn.jsdelivr.net/npm/@kfonts/ridi-batang@0.2.0/metadata.json). The official page returned HTTP 403 to my fetch, so the licence is unverified at source.
- woff2 is 457,732 B (`https://cdn.jsdelivr.net/npm/@kfonts/ridi-batang@0.2.0/index.css`, 200). The noonnu CDN still serves only woff: `https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_twelve@1.0/RIDIBatang.woff` (200, 724,448 B). — [jsDelivr](https://cdn.jsdelivr.net/npm/@kfonts/ridi-batang@0.2.0/index.css)
- Measured: 11,172 Hangul, 48 Greek code points, Latin x-height 0.481 and cap 0.663 from glyph bounds, Hangul ink 0.960. — measured from the kfonts woff

**KoPubWorld Batang (KoPubWorld 바탕)**
- Free for everyone after registering on the homepage. Modification without prior approval is not allowed. Embedding in websites, servers and e-books is permitted. IP is held by the Ministry of Culture, Sports and Tourism and the Korean Publishers Society. — [Sandoll Cloud: KoPubWorld Batang](https://www.sandollcloud.com/free-font/15811/KoPubWorldBatang)
- Third-party npm package `font-kopubworld@1.0.3`: Batang Light woff2 is 2,996,388 B and Bold is 3,204,152 B, with no slicing. — [jsDelivr font-kopubworld](https://www.jsdelivr.com/package/npm/font-kopubworld)

**Other Google Fonts myeongjo/batang faces**
- Gowun Batang: designer Yanghee Ryu (류양희), OFL. "a serif text typeface inspired by neat, pencil-written handwriting letterforms … warm and friendly impression". Two weights (400/700). — [google/fonts gowunbatang](https://raw.githubusercontent.com/google/fonts/main/ofl/gowunbatang/DESCRIPTION.en_us.html)
- Hahmlet: designer Hypertype. Minjoo Ham drew the Hangul and Mark Frömberg the Latin. Inspired by a 1940s Korean 'Hamlet' movie poster; "distinct and sharp, quirky and attention seeking details". Variable `wght` 100–900, OFL. — [google/fonts hahmlet](https://raw.githubusercontent.com/google/fonts/main/ofl/hahmlet/DESCRIPTION.en_us.html). Measured: its Latin is very wide (H advance 0.899 em, against 0.814 for Source Serif 4), x-height 0.492, Hangul ink 0.899.
- Nanum Myeongjo: Sandoll for Naver, added to Google Fonts in 2012, weights 400/700/800, "expertly hinted for screen use", OFL. — [google/fonts nanummyeongjo](https://raw.githubusercontent.com/google/fonts/main/ofl/nanummyeongjo/METADATA.pb)
- Song Myung: by JIKJI, one weight, OFL. "The Latin is based on Source Serif 4." — [google/fonts songmyung](https://raw.githubusercontent.com/google/fonts/main/ofl/songmyung/DESCRIPTION.en_us.html)
- Download estimates for the same two Korean pages: Gowun Batang 400 only about 465 KB, 400+700 about 888 KB. Hahmlet variable about 937 KB. Nanum Myeongjo 400+700 about 761 KB. These are upper bounds, since a bold slice downloads only if bold text actually needs it. — measured via the CSS2 API

**Chosunilbo Myungjo (조선일보명조)**
- Still on the noonnu CDN: `https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_one@1.0/Chosunilbo_myungjo.woff` (442,644 B, woff only). — [jsDelivr listing of projectnoonnu/noonfonts_one](https://data.jsdelivr.com/v1/packages/gh/projectnoonnu/noonfonts_one@1.0?structure=flat)

### Inferences
- **Recommended body face: MaruBuri 400 + 600, and 700 only if needed.** Two weights are about 900 KB and download once for the whole site, whatever the content. Noto Serif KR's sliced variable font cost about 1.1 MB for just two pages and pulls more slices as other pages bring new syllables. MaruBuri's lower stroke contrast and open forms read as a contemporary screen face, not the dated look of AppleMyungjo. It also has the semibold a textbook needs for key terms. All weights share one family once the `@font-face` rules below are written.
- **Do not link Naver's CSS directly.** Its per-weight family names would make `<strong>` synthesise faux bold. Write your own `@font-face` rules instead:
  ```css
  @font-face{font-family:"MaruBuri";font-style:normal;font-weight:400;font-display:swap;
    src:url("https://hangeul.pstatic.net/hangeul_static/webfont/MaruBuri/MaruBuri-Regular.woff2") format("woff2");}
  @font-face{font-family:"MaruBuri";font-style:normal;font-weight:600;font-display:swap;
    src:url("https://hangeul.pstatic.net/hangeul_static/webfont/MaruBuri/MaruBuri-SemiBold.woff2") format("woff2");}
  @font-face{font-family:"MaruBuri";font-style:normal;font-weight:700;font-display:swap;
    src:url("https://hangeul.pstatic.net/hangeul_static/webfont/MaruBuri/MaruBuri-Bold.woff2") format("woff2");}
  ```
  The Naver URLs are unversioned and cached for 30 days. For immutability, copy the three woff2 files into the repo (for example `/fonts/maruburi/`) and point `src` at them. OFL permits redistribution, and this needs no build step. Add `<link rel="preload" as="font" type="font/woff2" crossorigin href=".../MaruBuri-Regular.woff2">` on `*.ko.html` only.
- **Optional one-time optimisation:** slice MaruBuri into Google-Fonts-style `unicode-range` chunks with `pyftsubset` from fontTools. That gives Pretendard-style "dynamic subset" behaviour. Because slicing covers all 11,172 syllables it is content-independent: a one-off artefact committed to the repo, not a build step. It is probably not worth the effort at about 430 KB per weight.
- **Alternative if minimal effort matters most:** `Noto Serif KR` via one Google Fonts URL, with `wght@400;600` or the 200..900 axis. Its Hangul is slightly heavier and higher in contrast, and its Latin is large (cap 0.728).
- **Rejected for the body:** RIDIBatang has one weight, so bold would be synthetic. KoPubWorld is about 3 MB per weight, and its no-modification clause arguably forbids subsetting. Nanum Myeongjo has 2012-era forms. Hahmlet is too idiosyncratic for running text but could serve as a part-title accent. Gowun Batang is a viable softer alternative: hosted and sliced by Google, two weights.

### Gaps
- No controlled legibility comparison (x-height, contrast, screen rendering) among these Korean serifs was found. The search budget was exhausted before Korean typography blogs or talks could be checked.
- I could not open Naver's official MaruBuri licence page or confirm the designer credit (the AG Typography Institute link comes from a search summary). The OFL status is consistent across Sandoll Cloud and the kfonts metadata.
- RIDI's official licence page returned 403, so the OFL claim rests on the kfonts metadata.
- Iropke Batang (이롭게 바탕) was not found in the noonnu repos I listed, and its licence and CDN are unverified. The Chosunilbo Myungjo licence is unverified.

---

## Q2. Which Korean sans / condensed fonts for display headings, figure labels and UI (technical-drawing look)?

### Takeaway
I found **no free, multi-weight condensed Hangul text family**. The only "장체" found is KORAIL Condensed: one weight, distributed through Sandoll Cloud, with redistribution restricted. The strongest system for the drafting and title-block concept is **IBM Plex Sans KR + IBM Plex Sans Condensed + IBM Plex Mono**. I measured identical x-height (0.516 em) and cap height (0.698 em) across all three. All are OFL and hosted by Google Fonts with automatic slicing. The existing **Barlow Condensed** (x-height 0.506 / cap 0.700) matches Plex Sans KR almost exactly, so it can stay for Latin display. **Pretendard Variable**, the de facto Korean UI face used by RIDI and in its GOV form by KRDS, is the neutral alternative.

### Cited Findings
**Pretendard**
- Built from Inter, Source Han Sans (본고딕) and M PLUS 1p. Nine weights plus a variable font. Variants: JP, Std (Latin environments) and GOV (Korean public services). SIL OFL. — [Pretendard README](https://github.com/orioncactus/pretendard/blob/main/packages/pretendard/README.md)
- Official snippets (v1.3.9). Variable dynamic subset: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css`, family `"Pretendard Variable"`. Mirrors: `https://cdnjs.cloudflare.com/ajax/libs/pretendard/1.3.9/variable/pretendardvariable-dynamic-subset.min.css` and `https://unpkg.com/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css`. The README says dynamic subset works "the same way as the Korean fonts Google Fonts provides". It recommends the stack `"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", …, sans-serif`. — [README](https://github.com/orioncactus/pretendard/blob/main/packages/pretendard/README.md)
- Version status: the latest GitHub release is still **v1.3.9 (published 2023-11-05)**, though the repo was last pushed on 2026-07-23. npm `pretendard` latest is 1.3.9, as is cdnjs. — [GitHub releases API](https://api.github.com/repos/orioncactus/pretendard/releases/latest), [jsDelivr API](https://data.jsdelivr.com/v1/packages/npm/pretendard)
- Verified 2026-11-16: the variable dynamic-subset CSS returns 200 with 92 `@font-face` slices, weight range 45–920. The GOV variable dynamic subset `…/pretendard@v1.3.9/dist/web/variable/pretendardvariable-gov-dynamic-subset.min.css` returns 200. The full unsliced `PretendardVariable.woff2` is 2,057,688 B (npm path); the `gh/…/woff2/` path returns 404. A single slice, for example subset.50, is 33,228 B. The two Korean pages needed 27 slices, about 747 KB. — [jsDelivr](https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css)
- Measured: x-height 0.530, cap 0.707. Hangul ink is only 0.868 em and Hangul advance 0.864 em, so the Hangul sits small in the em, tuned to match Inter. — [Pretendard-Regular.woff](https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/woff/Pretendard-Regular.woff)
- KRDS design assets require Pretendard GOV. — [KRDS resources](https://krds.go.kr/html/eng/resource/resource.html), [KRDS typography](https://www.krds.go.kr/html/site/style/style_03.html)

**IBM Plex Sans KR / Condensed / Mono**
- IBM Plex Sans KR: designers Mike Abbink and Bold Monday, OFL. Google Fonts subsets are korean, latin and latin-ext, with **no Greek**. Seven weights (100–700); the CSS for all seven returns 658 sliced faces. — [google/fonts ibmplexsanskr](https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexsanskr/METADATA.pb)
- IBM Plex Sans Condensed subsets: cyrillic-ext, latin, latin-ext, vietnamese, with **no Greek**. IBM Plex Mono subsets add symbols2. — [google/fonts ibmplexsanscondensed](https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexsanscondensed/METADATA.pb), [ibmplexmono](https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono/METADATA.pb)
- Measured: Plex Sans KR x-height 0.516 / cap 0.698 / Hangul ink 0.892 / Hangul advance 0.892. Plex Sans Condensed 0.516 / 0.698, with H advance 0.637 against 0.707 for the normal width. Plex Mono 0.516 / 0.698. — measured from [Google Fonts `text=` subsets](https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR)
- Two weights of Plex Sans KR (400+600) for the two Korean pages: about 427 KB. — CSS2 API measurement
- The IBM/plex repo is OFL-1.1 and was active as of 2026-11-12. — [github.com/IBM/plex](https://github.com/IBM/plex)
- "Monoplex KR" merges IBM Plex Mono with IBM Plex Sans KR ("IBM Plex Mono와 IBM Plex Sans KR 합쳐만든 프로그래밍 글꼴"). The repo was pushed 2026-11-11, jsDelivr gh version 0.0.2, and the API reports the licence as NOASSERTION. — [github.com/y-kim/monoplex](https://github.com/y-kim/monoplex)

**Condensed Latin candidates (measured; Google Fonts)**
- Barlow Condensed: x-height 0.506 / cap 0.700 / H advance 0.472, no Greek subset.
- Roboto Condensed: 0.528 / 0.711 / 0.620, variable wght 100–900, **includes Greek**.
- Oswald: 0.578 / 0.810 / 0.561, no Greek.
- Saira Condensed: 0.510 / 0.688 / 0.527, no Greek.
- Big Shoulders (merged family): `opsz` 10–72 and `wght` 100–900, no Greek.
- Sources: [google/fonts METADATA files](https://github.com/google/fonts/tree/main/ofl), with measurements from the CSS2 `text=` subsets.
- Stencil Latin faces are available on Google Fonts: Big Shoulders Stencil, Saira Stencil One and Allerta Stencil (CSS2 returns 200). — [Google Fonts CSS2 API](https://fonts.googleapis.com/css2?family=Big+Shoulders+Stencil)

**Other Korean sans and display faces**
- SUIT: OFL, described as "UI 본문용" (UI body text). jsDelivr gh latest is 2.0.5. `https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2.0.5/fonts/variable/woff2/SUIT-Variable.css` returns 200 and declares one `'SUIT Variable'` 100–900 file, `SUIT-Variable.woff2` at 624,536 B, unsliced. — [github.com/sun-typeface/SUIT](https://github.com/sun-typeface/SUIT)
- Wanted Sans: OFL-1.1 ("Geometric with a heart, Humanist with a soul"), v1.0.3. The split variable CSS `https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.min.css` returns 200. — [github.com/wanteddev/wanted-sans](https://github.com/wanteddev/wanted-sans)
- Spoqa Han Sans Neo: OFL-1.1. CSS at `https://spoqa.github.io/spoqa-han-sans/css/SpoqaHanSansNeo.css` returns 200 but is unversioned. The repo was last pushed 2022-06-15. — [github.com/spoqa/spoqa-han-sans](https://github.com/spoqa/spoqa-han-sans)
- NanumSquare Neo: Naver CSS `https://hangeul.pstatic.net/hangeul_static/css/nanum-square-neo.css` returns 200 and defines NanumSquareNeoLight, Regular, Bold, ExtraBold and Heavy, plus `'NanumSquareNeoVariable'`. Measured x-height 0.481, cap 0.707, Hangul ink 0.934. — [nanum-square-neo.css](https://hangeul.pstatic.net/hangeul_static/css/nanum-square-neo.css)
- Orbit: by Sooun Cho and JAMO, OFL, added 2023. "inspired by the concept of monospaced Latin coding fonts … a mathematical and geometric impression through a serif with right angle and orbicular circles." — [google/fonts orbit](https://raw.githubusercontent.com/google/fonts/main/ofl/orbit/DESCRIPTION.en_us.html)
- Black Han Sans: by Zess Type, "designed to emphasize square shapes as a font for headlines and titles", and covers only 2,580 Korean characters. — [google/fonts blackhansans](https://raw.githubusercontent.com/google/fonts/main/ofl/blackhansans/DESCRIPTION.en_us.html)
- Do Hyeon is by Woowahan Brothers and Sunflower by JIKJISOFT; both OFL with one display style each. Gothic A1 is by HanYang I&C and includes Greek subsets. Noto Sans KR is variable 100–900. — [google/fonts](https://github.com/google/fonts/tree/main/ofl)
- **KORAIL Condensed (코레일 장체):** made by AsiaSoft, copyright KORAIL, classified as sans (민부리). One weight. Web and server embedding are allowed, while sale and unauthorised redistribution are prohibited. It is distributed through the Sandoll Cloud app and KORAIL's site. — [Sandoll Cloud: KORAIL Condensed](https://www.sandollcloud.com/free-font/17909/KORAILCondensed)
- A search for free condensed Hangul gothics (한글 장체 무료 폰트, condensed, OFL) found no multi-weight OFL condensed family other than KORAIL Condensed. — [Sandoll Cloud open free fonts list](https://www.sandollcloud.com/openfreefonts.html) (search result set)

### Inferences
- **Title block, figure labels and UI:** set Latin and numerals in `Barlow Condensed`, which keeps the existing concept, or switch to `IBM Plex Sans Condensed`. Set Hangul in `IBM Plex Sans KR` at 500/600. The shared x-height and cap height let Hangul and Latin sit on one visual line in a label with no size-adjust. Plex's engineered, slightly mechanical character suits the "engineering computation paper" idea better than Pretendard's neutral app-UI tone.
- **Hangul cannot match condensed Latin width.** Hangul advances are about 0.86–0.97 em, while condensed Latin H advances are about 0.47–0.64 em. Build the "condensed technical" feel another way:
  - Use rules, frames and tabular numerals (`font-variant-numeric: tabular-nums`).
  - Track uppercase Latin open, at about +0.04 to +0.08 em.
  - Leave Hangul tracking at 0 to −0.01 em.
  - Make the Hangul about 0.9–0.95× the size of the Latin in mixed labels, since Hangul ink is about 0.89 em against a Latin cap of about 0.70.
  If horizontal compression is truly needed for a big display word, `display:inline-block; transform:scaleX(.9)` imitates print 장평 (horizontal scaling), but it distorts stroke weight. Keep it to large display text only. This is my judgement, not sourced.
- **Pretendard is the safe choice for UI chrome,** such as navigation and the language switcher, if Plex feels too idiosyncratic. Its GOV variant is not needed here.
- **Greek in labels:** Barlow Condensed, Plex Sans Condensed, Plex Mono and Plex Sans KR (Google Fonts builds) have no Greek. Add a Greek-capable fallback to the draft stack, such as Roboto Condensed or Source Serif 4 / STIX Two Text italic for math variables, or an α in a label will fall back to a system font.
- **A geometric "plan drawing" accent face:** Orbit or NanumSquare Neo could serve for tiny sheet numbers and labels. Neither has a condensed width.

### Gaps
- I found no sources on how Korean designers approach condensed or stencil display aesthetics (talks, interviews, 장평 practice). The search budget ran out.
- The licence of Kakao Big Sans ("KakaoBig", used by tech.kakao.com) was not verified. Paperlogy, Gmarket Sans and S-Core Dream were not checked.
- The KORAIL Condensed files were not inspected for glyph coverage or a CDN-able source.

---

## Q3. Latin pairing (serif / condensed / mono), stack ordering, unicode-range and size-adjust

### Takeaway
**Put the Latin font first in each stack.** The Latin faces carry no Hangul, so the browser takes Hangul per glyph from the next font, the Korean one. Choose Latin faces whose x-height and cap height match the Korean font's own Latin. With MaruBuri (Latin x-height 0.467 / cap 0.655), **STIX Two Text (0.473 / 0.657) is a near-exact metric twin** and **Source Serif 4 (0.492 / 0.670) is a close, more contemporary match**. Both include Greek, which the formulas need, and MaruBuri has only two Greek glyphs. Literata (0.507 / 0.701) pairs best with Noto Serif KR (0.516 / 0.728). EB Garamond (0.405) and Crimson Pro (0.420) are too small and delicate next to Hangul. `size-adjust` works in all engines (Chrome/Firefox 92+, Safari 17+) but only in your own `@font-face`. `ascent-override` has not shipped in Safari stable.

### Cited Findings
- **Measured metrics** (em fractions; fontTools on Google Fonts `text=` subsets or CDN files). "Hangul ink" is the largest yMax−yMin of 한, 국 and 가.

| Font | x-height | cap | H advance | Hangul ink | Greek in the build served? |
|---|---|---|---|---|---|
| MaruBuri (its own Latin) | 0.467 | 0.655 | 0.733 | 0.960 | 2 glyphs only |
| RIDIBatang | 0.481 | 0.663 | 0.752 | 0.960 | 48 glyphs |
| Noto Serif KR | 0.516 | 0.728 | 0.853 | 0.961 | GF subset list has no "greek" |
| Gowun Batang | 0.540 | 0.775 | 0.710 | 0.915 | – |
| Hahmlet | 0.492 | 0.742 | 0.899 | 0.899 | – |
| Nanum Myeongjo | 0.470 | 0.737 | 0.846 | 0.945 | – |
| Source Serif 4 | 0.492 | 0.670 | 0.814 | – | yes (greek) |
| STIX Two Text | 0.473 | 0.657 | 0.777 | – | yes (greek) |
| Literata | 0.507 | 0.701 | 0.839 | – | yes (greek, greek-ext) |
| Newsreader | 0.441 | 0.676 | 0.800 | – | no |
| Spectral | 0.450 | 0.660 | 0.810 | – | no |
| Crimson Pro | 0.420 | 0.573 | 0.656 | – | no |
| EB Garamond | 0.405 | 0.653 | 0.810 | – | yes |
| Pretendard | 0.530 | 0.707 | 0.706 | 0.868 | – |
| IBM Plex Sans KR | 0.516 | 0.698 | 0.707 | 0.892 | no |
| IBM Plex Sans Condensed | 0.516 | 0.698 | 0.637 | – | no |
| IBM Plex Mono | 0.516 | 0.698 | 0.600 | – | no |
| Barlow Condensed | 0.506 | 0.700 | 0.472 | – | no |
| Roboto Condensed | 0.528 | 0.711 | 0.620 | – | yes |
| JetBrains Mono | 0.550 | 0.730 | 0.600 | – | yes |

  Sources: measurements from [Google Fonts CSS2 API `text=` subsets](https://fonts.googleapis.com/css2?family=Source+Serif+4), [MaruBuri woff](https://hangeul.pstatic.net/hangeul_static/webfont/MaruBuri/MaruBuri-Regular.woff) and [Pretendard woff](https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/woff/Pretendard-Regular.woff). Greek availability is from each family's `subsets` in [google/fonts METADATA.pb](https://github.com/google/fonts/tree/main/ofl) (sourceserif4, stixtwotext, literata, newsreader, spectral, crimsonpro, ebgaramond, barlowcondensed, ibmplexsanscondensed, robotocondensed, jetbrainsmono).
- Axes on Google Fonts: Source Serif 4 has `opsz` 8–60 and `wght` 200–900. Literata has `opsz` 7–72 and `wght` 200–900. Newsreader has `opsz` 6–72 and `wght` 200–800. STIX Two Text has `wght` 400–700 with italics. — [google/fonts METADATA](https://raw.githubusercontent.com/google/fonts/main/ofl/sourceserif4/METADATA.pb)
- There is a precedent for pairing Source Serif with Hangul myeongjo: Google's Song Myung states "The Latin is based on Source Serif 4." — [google/fonts songmyung](https://raw.githubusercontent.com/google/fonts/main/ofl/songmyung/DESCRIPTION.en_us.html)
- Browser support from BCD:
  - `@font-face size-adjust`: Chrome 92, Firefox 92, Safari 17.
  - `ascent-override`: Chrome 87, Firefox 89, Safari "preview" only.
  - `font-size-adjust`: Chrome 127, Firefox 3, Safari 16.4.
  — [BCD font-face.json](https://github.com/mdn/browser-compat-data/blob/main/css/at-rules/font-face.json), [BCD font-size-adjust.json](https://github.com/mdn/browser-compat-data/blob/main/css/properties/font-size-adjust.json)
- One combined Google Fonts request was verified to return 200 with all six families: `https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&family=STIX+Two+Text:ital,wght@0,400..700;1,400..700&family=IBM+Plex+Sans+KR:wght@400;500;600&family=IBM+Plex+Sans+Condensed:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Barlow+Condensed:wght@400;500;600&display=swap`. — [Google Fonts CSS2 API](https://fonts.googleapis.com/css2?family=Source+Serif+4)
- Pretendard's README puts the Korean font first in its recommended stack, so Latin comes from its Inter-derived glyphs. — [Pretendard README](https://github.com/orioncactus/pretendard/blob/main/packages/pretendard/README.md)

### Inferences
- **Recommended stacks**, the same for both languages:
  ```css
  :root{
    --serif: "Source Serif 4", "MaruBuri", "Noto Serif KR", "AppleMyungjo", serif;   /* or "STIX Two Text" first */
    --draft: "Barlow Condensed", "IBM Plex Sans KR", "Roboto Condensed", "Apple SD Gothic Neo", sans-serif;
    --mono:  "IBM Plex Mono", "IBM Plex Sans KR", monospace;
  }
  ```
  Because Source Serif 4 has no Hangul, every Hangul syllable falls through to MaruBuri. Latin letters, digits, Greek, curly quotes, en/em dashes and the middle dot come from Source Serif 4. CJK brackets 「」『』〈〉 come from MaruBuri. There is no need for different stacks per language: an English page simply never reaches MaruBuri, so it never downloads.
- **Which Latin serif?**
  - STIX Two Text matches MaruBuri's Latin almost exactly (x-height ratio 0.99). It also matches STIX Two Math, which helps formula consistency (see Q4), but it has a Times-like, scientific-journal tone.
  - Source Serif 4 is slightly larger (x-height ratio 1.05 against MaruBuri's Latin). It has optical sizes, which help the 13–15 px captions and SVG labels, and a more contemporary, Adobe-textbook feel. It is my first choice for the "manifesto textbook" voice.
  - Literata is a good partner if the Hangul face is Noto Serif KR.
  - The declared "CMU Serif / Latin Modern" is thin and small (Computer Modern), and would look anaemic next to a dense Hangul myeongjo. It is also not loaded anywhere.
- **size-adjust values, if you self-host and want exact x-height matching against the Korean font's own Latin:**
  - Source Serif 4 against MaruBuri: about 95% (0.467/0.492). In practice 100% is fine, since a slightly larger Latin balances big Hangul.
  - Source Serif 4 against Noto Serif KR: about 105% (0.516/0.492).
  - Literata against Noto Serif KR: about 102%.
  - Newsreader against MaruBuri: about 106%, and against Noto Serif KR about 117%.
  - EB Garamond against MaruBuri: about 115%, and against Noto Serif KR about 127%.
  Google-hosted CSS cannot carry descriptors, so to use `size-adjust` you must write your own `@font-face` with `src:url(<self-hosted woff2>)`.
- **The unicode-range alias trick** is needed only when the font you want first contains glyphs you don't want from it. Examples: Pretendard first but Latin from another face, or Greek taken from a third face. Declare one family twice:
  ```css
  @font-face{font-family:"Body";src:url(/fonts/SourceSerif4-Var.woff2) format("woff2");font-weight:200 900;
    unicode-range:U+0000-024F,U+0370-03FF,U+1E00-1EFF,U+2000-206F,U+2070-209F,U+20AC,U+2100-214F,U+2190-22FF;}
  @font-face{font-family:"Body";src:url(/fonts/MaruBuri-Regular.woff2) format("woff2");font-weight:400;
    unicode-range:U+1100-11FF,U+3000-303F,U+3130-318F,U+AC00-D7A3,U+FF00-FFEF;}
  ```
  Here font ordering already does this job, so the trick is optional.
- **Hangul will look about 1.45× taller than Latin capitals** (ink 0.96 against cap 0.66). That is inherent in Korean type, and every Korean font's own Latin is drawn at those ratios. Matching the Korean font's Latin proportions keeps the texture consistent. Don't try to "fix" it by shrinking Hangul.
- **Mono:** IBM Plex Mono shares Plex Sans KR's metrics. JetBrains Mono has Greek but a larger x-height (0.550).

### Gaps
- I found no designer-authored guidance on which Latin faces pair with MaruBuri specifically, or on what MaruBuri's Latin was modelled on.
- I could not confirm whether Noto Serif KR's Latin derives from Source Serif. The Adobe README is silent.

---

## Q4. Math with Korean: KaTeX vs MathJax vs native MathML; CDN URLs; font consistency

### Takeaway
For a no-build static site with modest inline formulas (Greek, subscripts), the lightest consistent options are:
- **native MathML** (all engines; Chrome since 109) with **STIX Two Math**;
- **plain HTML `<i>`/`<sub>` in the body serif**;
- **KaTeX 0.19.1**: synchronous rendering, 273 KB JS plus 25 KB CSS plus fonts on demand.

**MathJax 4.1.3** is heavier (`tex-mml-chtml.js` is about 998 KB) but offers 11 font sets, including STIX2 and New Computer Modern. Keep Hangul out of math mode: KaTeX's own font stack would set Hangul in `\text{}` in the system serif, not in MaruBuri.

### Cited Findings
- Latest versions on jsDelivr: `katex` latest **0.19.1** (recent versions 0.19.1, 0.19.0, 0.18.11, 0.18.10) and `mathjax` latest **4.1.3**. cdnjs reports the same: KaTeX 0.19.1 and mathjax 4.1.3. — [jsDelivr API katex](https://data.jsdelivr.com/v1/packages/npm/katex), [mathjax](https://data.jsdelivr.com/v1/packages/npm/mathjax), [cdnjs API](https://api.cdnjs.com/libraries/KaTeX?fields=version)
- Verified URLs (HTTP 200, with sizes):
  - `https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.css` (24,793 B)
  - `…/katex@0.19.1/dist/katex.min.js` (273,081 B)
  - `…/katex@0.19.1/dist/contrib/auto-render.min.js` (3,486 B)
  - `https://cdn.jsdelivr.net/npm/mathjax@4.1.3/tex-mml-chtml.js` (997,558 B)
  - `https://cdn.jsdelivr.net/npm/mathjax@4/tex-svg.js` (1,849,625 B)
  - The old cdnjs path `…/KaTeX/0.16.22/katex.min.css` now returns 404.
  — [jsDelivr katex](https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.css)
- KaTeX's CSS sets `.katex{font:normal 1.21em KaTeX_Main,math,Times New Roman,serif;line-height:1.2;…}`. It ships the families KaTeX_AMS, _Caligraphic, _Fraktur, _Main, _Math, _SansSerif, _Script, _Size1–4 and _Typewriter. — [katex.min.css 0.19.1](https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.css)
- KaTeX docs: math is "rendered in a 1.21× larger font than the surrounding context". Change it with `.katex { font-size: 1.1em; }`. woff2 files are included for modern browsers. The docs say nothing about CJK fallback. — [KaTeX: Font](https://katex.org/docs/font)
- MathJax v4 fonts. There are 11 sets: `mathjax-newcm` (the default, New Computer Modern), `mathjax-asana`, `-bonum`, `-dejavu`, `-fira`, `-modern`, `-pagella`, `-schola`, `-stix2`, `-termes` and `-tex`.
  - Fonts load from cdn.jsdelivr.net in "dynamic ranges" on demand, so rendering can be asynchronous.
  - Configure with `output: { font: 'mathjax-stix2' }`, and use `*-nofont.js` components to avoid downloading the bundled default font.
  - To self-host, set `paths: { fonts: '/mathjax-fonts' }`.
  — [MathJax docs: fonts](https://docs.mathjax.org/en/latest/output/fonts.html)
- Native MathML `<math>` support per BCD: Chrome 109, Firefox 4, Safari 5.1. — [BCD mathml/elements/math.json](https://github.com/mdn/browser-compat-data/blob/main/mathml/elements/math.json)
- Math fonts available: STIX Two Math (CSS2 returns 200; one woff2 of 284,844 B) and Noto Sans Math are on Google Fonts, and `@fontsource/stix-two-math@5.3.0` is on npm. STIX Two Text and STIX Two Math share designers (Tiro Typeworks: Ross Mills, John Hudson, Paul Hanslow). — [google/fonts stixtwomath](https://raw.githubusercontent.com/google/fonts/main/ofl/stixtwomath/METADATA.pb), [jsDelivr API](https://data.jsdelivr.com/v1/packages/npm/@fontsource/stix-two-math)
- Korean practice: Kakao's tech blog ships KaTeX CSS (KaTeX_Main, KaTeX_Math and others in its main stylesheet) alongside its "KakaoBig" body font. — [tech.kakao.com](https://tech.kakao.com) (entry CSS inspected)

### Inferences
- **Ranking for 단면:**
  1. If formulas stay simple (variables, Greek, sub/superscripts, a few fractions), keep HTML markup. Italic Latin and Greek then come from Source Serif 4 or STIX Two Text italic via `--serif`, so there is zero JS and the formulas use the body font by construction.
  2. For real fractions, sums and matrices without JS, use native MathML with `math{font-family:"STIX Two Math", math;}`. It pairs naturally with STIX Two Text (same foundry) and reasonably with Source Serif 4.
  3. If authoring in TeX is preferred, use KaTeX 0.19.1 with auto-render: `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.css">` plus `<script defer src="https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.js">` plus `<script defer src="https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body,{delimiters:[{left:'\\(',right:'\\)',display:false},{left:'\\[',right:'\\]',display:true}]})">`.
  4. Use MathJax 4 only if accessibility features or exotic TeX are needed. It is about 1 MB plus asynchronous font ranges; choose `output:{font:'mathjax-stix2'}` for consistency with STIX or Source Serif.
- **KaTeX sizing next to Hangul:** the default 1.21em makes inline math loom in a 18–19px body whose Hangul already fills about 0.96 em. Try `.katex{font-size:1.05em}` to `1.1em`.
- **Hangul in `\text{}` with KaTeX:** missing glyphs fall through `KaTeX_Main, math, Times New Roman, serif`, so Hangul would render in the OS serif (for example AppleMyungjo). Either keep Korean words outside math, or add `.katex .text{font-family:KaTeX_Main,"MaruBuri",serif}`. This is unverified and needs testing.
- The site's SVG figure labels use `var(--serif)`. Web fonts reach SVG text only when the SVG is inline in the HTML; an SVG loaded via `<img>` cannot load external fonts. This is general browser behaviour I did not source here, so verify which embedding the figures use.

### Gaps
- I did not review the KaTeX 0.17–0.19 changelog for breaking changes, such as auto-render API changes.
- MathJax 4's option for inheriting the page font in `\text{}` (`mtextInheritFont`) was not confirmed in the fetched doc.

---

## Q5. Korean typesetting CSS best practices

### Takeaway
- Body: `word-break: keep-all` + `overflow-wrap: break-word` + `text-wrap: pretty` (Chrome and Safari 26; ignored in Firefox).
- Headings and captions: `keep-all` + `text-wrap: balance`.
- Alignment: left-aligned, not justified, when using keep-all.
- Body line-height: about 1.7–1.8.
- Body tracking: 0.
- Emphasis: weight (or 방점 via `text-emphasis`), not synthetic italic.
- Measure: about 30–34 Hangul syllables per line.

Many CJK properties are Japanese- or Chinese-oriented, or work in one engine only: `line-break`, `text-spacing-trim`, `word-break: auto-phrase` and `hanging-punctuation`.

### Cited Findings
- **W3C klreq** (Requirements for Hangul Text Layout and Typography, W3C Group Note Draft, 21 March 2026):
  - "If a line ends in Hangul, line breaking is done on character or word basis", and the author chooses.
  - Closing parentheses and hyphens cannot start a line, and opening parentheses cannot end one.
  - "Characters like Hangul, Hanja, or Kana have zero space between characters by default."
  - "Even space alignment is the default setting in Hangul writing."
  - The space between math symbols and Hangul is user-defined, with 1/8 of the character width recommended.
  - Horizontal text uses curly quotes (U+2018/2019/201C/201D) and half-width period and comma.
  - Emphasis (§6.3) is "TBD", and whether Korean uses hanging punctuation is an open issue.
  — [W3C klreq](https://www.w3.org/TR/klreq/)
- **daleseo.com (Korean CSS line breaking):**
  - Use `keep-all` first.
  - `text-wrap: balance` alone can still split Korean words and is capped at about 6 lines in Chromium and 10 in Firefox, so use it for headings, captions and quotes.
  - `pretty` has no line limit and is safe for body text.
  - Recommended combinations: headings `word-break: keep-all; text-wrap: balance`; body `word-break: keep-all; overflow-wrap: break-word; text-wrap: pretty`.
  - `line-break` rules "mainly target Japanese"; `word-break: auto-phrase` is "not ready for production".
  — [daleseo: 어색하게 끊기는 한국어 줄바꿈 다듬는 법](https://daleseo.com/css-text-wrap/)
- **CSSWG discussion:** justification works better with break-all, while keep-all plus justify requires word-spacing adjustment. — [w3c/csswg-drafts#4285](https://github.com/w3c/csswg-drafts/issues/4285)
- **Browser support, from MDN BCD on 2026-11-16 (first version: Chrome / Firefox / Safari):**

| Feature | Chrome | Firefox | Safari |
|---|---|---|---|
| `text-wrap-style: pretty` | 130 | no | 26 |
| `text-wrap-style: balance` | 130 | 124 | 17.5 |
| `word-break: keep-all` | 44 | 15 | 9 |
| `word-break: auto-phrase` | 119 | no | preview |
| `line-break: strict` | 25 | 69 | 8 |
| `hanging-punctuation` | no | no | 26.5 |
| `text-emphasis` / `-position` | 99 | 46 | 7 |
| `text-autospace` | 140 | 145 | 18.4 |
| `text-spacing-trim` | 123 | no | no |
| `text-box` | 133 | 154 | 18.2 |
| `overflow-wrap: anywhere` | 80 | 65 | 15.4 |

  Notes: the `text-wrap-style` versions are for the longhand. Other sources date the `text-wrap: pretty` shorthand to Chrome 117 and Safari 26 (September 2025), with Firefox unsupported as of early 2026. — [BCD css/properties](https://github.com/mdn/browser-compat-data/tree/main/css/properties), [web.dev: New to the web platform in September 2025](https://web.dev/blog/web-platform-09-2025?hl=en)
- **KRDS (Korean government design system) typography:**
  - Pretendard GOV for Korean and English. Weights 400 and 700, plus 500 as part of an "ideal" set.
  - Body tokens: 19, 17, 15 and 13 px, with 17px as the base.
  - Line-height 150% throughout; the rule is "최소 150% 이상" (at least 150%).
  - Body letter-spacing 0. Display (60/44/36 px on PC) and large headings (40/32 px) use **+1px** letter-spacing.
  - Minimum body size 16px; the 17px default is because Pretendard GOV renders small.
  - Emphasis "by weight or color"; underlines only for links.
  - Use relative units, and follow WCAG 1.4.12 text spacing.
  — [KRDS 타이포그래피](https://www.krds.go.kr/html/site/style/style_03.html)
- **Current site Korean rules:** 18px/1.8, keep-all plus break-word, `h1,h2 {letter-spacing:-0.03em}`, mobile 16.5px/1.75, `p {hyphens:auto}`, `i, em {font-style:italic}`, and `.plot .lb.it/.note` italic in SVG. — repo file `prototype/traditional/style.css`
- **Measured Hangul advance widths:** MaruBuri 0.970 em, Noto Serif KR 0.966, IBM Plex Sans KR 0.892, Pretendard 0.864. — fontTools measurements (see Q3)

### Inferences
- **Drop-in Korean block,** replacing lines 1128–1139:
  ```css
  :root:lang(ko){
    --serif: "Source Serif 4", "MaruBuri", "Noto Serif KR", "AppleMyungjo", serif;
    --draft: "Barlow Condensed", "IBM Plex Sans KR", "Roboto Condensed", "Apple SD Gothic Neo", sans-serif;
  }
  :lang(ko) body { font-size: 18px; line-height: 1.75; font-synthesis: none; }
  :lang(ko) p, :lang(ko) li, :lang(ko) figcaption, :lang(ko) td {
    word-break: keep-all; overflow-wrap: break-word; text-wrap: pretty; text-align: start; hyphens: manual;
  }
  :lang(ko) h1, :lang(ko) h2, :lang(ko) h3, :lang(ko) figcaption, :lang(ko) blockquote, :lang(ko) .lede {
    word-break: keep-all; text-wrap: balance;
  }
  :lang(ko) h1, :lang(ko) h2 { letter-spacing: -0.02em; line-height: 1.3; }   /* serif display: mild negative tracking */
  :lang(ko) em, :lang(ko) i:not(.var) { font-style: normal; font-weight: 600; } /* no fake-italic Hangul */
  :lang(ko) .stress { font-style: normal; -webkit-text-emphasis: filled dot; text-emphasis: filled dot;
                      -webkit-text-emphasis-position: over right; text-emphasis-position: over right; } /* optional 방점 */
  :lang(ko) p { max-width: 34em; }     /* ≈ 34 Hangul cells; see measure note */
  @media (max-width: 760px){ :lang(ko) body { font-size: 16.5px; line-height: 1.7; } }
  ```
  Keep Latin math variables italic. Mark them, for example `<i class="var">`, so they still get Source Serif 4's true italic.
- **Line-height:** Hangul ink fills about 0.96 em, against a Latin x-height of about 0.47–0.52. That density needs more leading than Latin text. 1.7–1.8 at 18px is consistent with Kakao (1.75) and above KRDS's 1.5 floor (see Q6), so the existing 1.8 is fine; 1.75 is slightly tighter if the page feels airy.
- **Measure:** at 18px with MaruBuri (advance 0.97 em), a 640px column holds about 36.7 Hangul cells. That is roughly 30–32 syllables once you count word spaces, on the comfortable short side for screen reading. Because Hangul advance is about 1 em, `max-width` in `em` reads directly as a Hangul character count: 32–36em gives about 30–35 syllables per line.
- **Body size:** MaruBuri's Hangul looks larger than Latin at the same px. 18px Korean against 19px English, as the site already has, is a sound offset.
- **Justification:** keep the text ragged-right. `keep-all` plus `justify` on a 30-syllable measure produces uneven word gaps (CSSWG #4285). Korean print books justify with syllable-level breaking instead, which reads worse on screen with reflow.
- **Tracking:** body at 0, matching klreq's zero default and KRDS's body 0. For large serif Hangul headings, −0.01 to −0.02 em is enough; −0.03 em is on the tight side for MaruBuri. Keep Hangul in condensed or technical labels at 0.
- **Emphasis:** both KRDS and the lack of true Hangul italics point to weight (600) or colour. 방점 (`text-emphasis: filled dot`, over) is supported everywhere and is a distinctive, textbook-appropriate accent for defined terms. klreq leaves emphasis "TBD", so it is a stylistic choice, not a rule. `font-synthesis: none` prevents faux bold and italic if a weight is missing.
- **Low or no value for Korean:**
  - `line-break: strict` is a harmless no-op for Hangul.
  - `text-spacing-trim` is Chrome-only and aimed at full-width CJK punctuation.
  - `word-break: auto-phrase` is Japanese-oriented and Chrome-only.
  - `hanging-punctuation` is Safari-only, and klreq is undecided on it.
  - `hyphens: auto` does nothing for Hangul.
- **`text-autospace`** (now in all three engines) inserts spacing between ideographs and Latin. Korean already uses spaces. Check that it doesn't add spacing around Latin words in Korean text, and set `text-autospace: no-autospace` on `:lang(ko)` if it does. Whether Hangul counts as "ideograph" here was not verified.
- **Loading:** add `<link rel="preconnect" href="https://fonts.googleapis.com">` and `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` (and hangeul.pstatic.net if MaruBuri is hot-linked), use `font-display: swap`, and preload only the MaruBuri Regular woff2 on `*.ko.html`.

### Gaps
- I found no authoritative source for an ideal Hangul measure (the brief's "35–45자") or for research-backed Hangul line-height values. A 2020 expert survey on web-document readability (Korean Society of Design Research) was found but not read: [KyoboBook Scholar listing](https://scholar.kyobobook.co.kr/article/detail/4010027677543).
- BCD lists `hanging-punctuation` in Safari only from 26.5, which looks oddly recent given older partial WebKit support. Verify before relying on it.
- The effect of `text-autospace` on Hangul–Latin boundaries was not tested.
- The rendering effects of `lang="ko"` (UA default font selection for generic families, Han glyph variants) were not sourced in this session.

---

## Q6. Examples of well-typeset Korean long-form web publications, and their specs

### Takeaway
Korean long-form and tech publishers on the web overwhelmingly set **body text in sans**: Pretendard, Noto Sans KR or a proprietary corporate sans. Bodies run **16–17px**, with **line-height 1.6–1.75** and **0 letter-spacing**, often with `keep-all`. Korean web publishing with a serif body is uncommon, which makes a well-set MaruBuri body a distinctive textbook voice for 단면 rather than a convention.

### Cited Findings
- **KRDS (government):** Pretendard GOV, body base 17px, line-height ≥150%, body tracking 0, display +1px, emphasis by weight or colour. — [KRDS 타이포그래피](https://www.krds.go.kr/html/site/style/style_03.html)
- **Toss tech blog** (article page `toss.tech/article/snap-llm-cost-reduction`):
  - Family `'Toss Product Sans', 'Tossface', 'SF Pro KR', 'SF Pro Display', …`. Toss Product Sans is proprietary and loaded from `static.toss.im/tps/`.
  - Body paragraph class: `font-size:17px; letter-spacing:0em; line-height:1.6`.
  - h2-level heading: `30px / 1.55, bold`.
  - Captions: `13px / 1.7; word-break: keep-all`.
  — [toss.tech](https://toss.tech/article/snap-llm-cost-reduction) (inline TDS styles inspected)
- **Kakao tech blog:** `font-family: KakaoBig, Apple SD Gothic Neo, Malgun Gothic, 맑은 고딕, sans-serif`. Post body `.preview p{font-size:1.14rem;line-height:1.75}`, with lists and blockquotes also at line-height 1.75. It ships KaTeX CSS for math. — [tech.kakao.com](https://tech.kakao.com) (entry CSS inspected)
- **RIDI (ridibooks.com web store):** `font-family: Pretendard Variable, Pretendard Std Variable, Pretendard JP Variable, -apple-system, BlinkMacSystemFont, system-ui, Roboto, Helvetica Neue, Segoe UI, Apple SD Gothic Neo, …`, self-hosted at `static.ridicdn.net/web-font/pretendard.css`, plus a custom 'ridi-roboto' for numerals and Latin. — [ridibooks.com](https://ridibooks.com)
- **National Institute of Korean Language (국립국어원):** self-hosts Noto Sans KR (`/asset/css/font/notosanskr-eot.min.css`). — [korean.go.kr](https://www.korean.go.kr)
- **Brunch:** the page returned no inspectable CSS to `curl`, so its specs could not be retrieved. — [brunch.co.kr](https://brunch.co.kr)

### Inferences
- The industry baseline is about 16–17px, line-height 1.6–1.75, tracking 0 and keep-all. The site's 18px/1.8 Korean body is consistent with it, slightly larger and airier, which suits a 바탕 serif and textbook reading.
- The tech blogs show that pairing KaTeX with a Korean body face is established practice (Kakao). No inspected site attempts serif-Hangul + condensed-Latin "engineering" styling, so there is no direct precedent to copy. The IBM Plex KR/Condensed/Mono system is the closest ready-made coherent kit.
- RIDI's reading app (not the store) is where RIDIBatang appears, but the web store itself uses Pretendard. Even e-book companies keep web UI in sans and reserve serifs for reading surfaces. That mirrors a sensible split for 단면: MaruBuri for chapters, Plex or Barlow for chrome, labels and the title block.

### Gaps
- I could not research Publy, Outstanding (아웃스탠딩), 민음사 and 문학동네 web, KOCW and Korean open textbooks, the RIDI reader internals, the Toss design-system docs, or designer interviews (안삼열, 노은유, 류양희, Typography Seoul). The WebSearch budget was exhausted, and some sites (Brunch) don't expose CSS to `curl`.
- Kakao's root font size was not determined, so 1.14rem was not converted to px.

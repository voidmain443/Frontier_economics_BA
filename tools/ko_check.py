#!/usr/bin/env python3
"""Checks the Korean edition (docs/ko-style.md).

    python3 tools/ko_check.py [files…]     (default: every Korean page and dictionary)

Three checks for each file:
  keep   against the committed version (git HEAD): the markup, ids, links,
         scripts and styles of a page are unchanged, and a dictionary keeps
         every key with the same {n} slots and tags; added keys and numbers
         that differ are listed as notes.
  josa   a particle after a number, a Latin or Greek letter, % or a bracket
         agrees with how the word before it is read: 3은, 2는, 1로, 3으로,
         A는, M은, 수요곡선(demand curve)은.
  style  counts of the translated forms docs/ko-style.md replaces.

Returns 1 when keep or josa finds a problem; style only counts.
"""

import collections
import html
import json
import os
import re
import subprocess
import sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = 'prototype/traditional'
DEFAULT = [f'{WEB}/{p}' for p in ('index.ko.html', 'classical.ko.html', 'beyond.ko.html', 'archive.ko.html', 'course.ko.html',
                                  'i18n/ko-curriculum.js', 'i18n/ko-p1.js', 'i18n/ko-p23.js', 'i18n/ko-extra.js')]
HANGUL = re.compile(r'[가-힣]')
FREE = {'alt', 'aria-label', 'title', 'data-name', 'content'}   # attributes whose Korean values may change
BLOCK = {'p', 'li', 'h1', 'h2', 'h3', 'h4', 'figure', 'figcaption', 'section', 'table', 'tr', 'td', 'th', 'details',
         'summary', 'ul', 'ol', 'dl', 'dt', 'dd', 'caption', 'nav', 'header', 'footer', 'main', 'article', 'aside'}


def head(path):
    r = subprocess.run(['git', 'show', f'HEAD:{path}'], cwd=ROOT, capture_output=True)
    return r.stdout.decode('utf-8') if r.returncode == 0 else None


# ---- keep -------------------------------------------------------------------

class Tags(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.all, self.blocks, self.raw, self._in = collections.Counter(), [], [], None

    def handle_starttag(self, tag, attrs):
        kept = tuple(sorted((k, '' if (k in FREE and v and HANGUL.search(v)) else v) for k, v in attrs))
        self.all[(tag, kept)] += 1
        if tag in BLOCK:
            self.blocks.append((tag, kept))
        if tag in ('script', 'style'):
            self._in = []

    def handle_endtag(self, tag):
        if tag in ('script', 'style') and self._in is not None:
            self.raw.append(''.join(self._in))
            self._in = None

    def handle_data(self, data):
        if self._in is not None:
            self._in.append(data)


def keep_page(old, new):
    a, b = Tags(), Tags()
    a.feed(old)
    b.feed(new)
    out = []
    if a.blocks != b.blocks:
        for i, (x, y) in enumerate(zip(a.blocks, b.blocks)):
            if x != y:
                out.append(f'block {i} changed: {x} → {y}')
                break
        if len(a.blocks) != len(b.blocks):
            out.append(f'{len(a.blocks)} blocks → {len(b.blocks)}')
    for t in (a.all - b.all):
        out.append(f'tag lost: {t}')
    for t in (b.all - a.all):
        out.append(f'tag added: {t}')
    if a.raw != b.raw:
        out.append('a script or style changed')
    return out, []


def load_dict(src):
    tmp = os.path.join(ROOT, '.ko_check_tmp.mjs')
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(src)
    try:
        r = subprocess.run(['node', '--input-type=module', '-e',
                            f"import d from {json.dumps('file://' + tmp)}; console.log(JSON.stringify(d))"],
                           capture_output=True, text=True)
    finally:
        os.remove(tmp)
    if r.returncode:
        raise SystemExit(r.stderr)
    return json.loads(r.stdout)


SLOT = re.compile(r'\{\d+\}')
TAG = re.compile(r'<[^>]+>')
NUM = re.compile(r'\d+(?:[.,]\d+)*')


def keep_dict(old, new):
    a, b = load_dict(old), load_dict(new)
    out, notes = [], []
    for k in a.keys() - b.keys():
        out.append(f'key lost: {k[:70]}')
    for k in b.keys() - a.keys():
        notes.append(f'key added: {k[:70]}')
    for k in a.keys() & b.keys():
        if sorted(SLOT.findall(a[k])) != sorted(SLOT.findall(b[k])):
            out.append(f'slots differ: {k[:70]}')
        if sorted(TAG.findall(a[k])) != sorted(TAG.findall(b[k])):
            out.append(f'tags differ: {k[:70]}')
        if sorted(NUM.findall(SLOT.sub('', a[k]))) != sorted(NUM.findall(SLOT.sub('', b[k]))):
            notes.append(f'numbers differ: {a[k][:50]} → {b[k][:50]}')
    return out, notes


# ---- text -------------------------------------------------------------------

def page_text(s):
    s = re.sub(r'<(script|style)\b.*?</\1>', '', s, flags=re.S)
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    s = re.sub(r'</?(?:%s|div|br)\b[^>]*>' % '|'.join(BLOCK), '\n', s)
    s = re.sub(r'<[^>]+>', '', s)
    return [html.unescape(l).strip() for l in s.split('\n')]


def dict_text(s):
    return [v for _, v in re.findall(r'^\s*"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"', s, flags=re.M)]


def lines_of(path, s):
    return [(i + 1, l) for i, l in enumerate(page_text(s) if path.endswith('.html') else dict_text(s)) if HANGUL.search(l)]


# ---- josa -------------------------------------------------------------------
# How the end of the word before a particle sounds: 'v' a vowel, 'l' ㄹ, 'c' any other final consonant.

DIGIT = {'0': 'c', '1': 'l', '2': 'v', '3': 'c', '4': 'v', '5': 'v', '6': 'c', '7': 'l', '8': 'l', '9': 'v'}
LETTER = {**{c: 'v' for c in 'ABCDEFGHIJKOPQSTUVWXYZ'}, 'L': 'l', 'R': 'l', 'M': 'c', 'N': 'c'}
GREEK = {**{c: 'v' for c in 'αβγδζηθικλμνξοπρστυφχψω'}, 'ε': 'c'}
PAIRS = [('은', '는'), ('이', '가'), ('을', '를'), ('과', '와'), ('으로', '로')]
END = r'(?=[\s.,;:!?)\]」』’”·…]|$)'


def sound(word):
    """'v', 'l', 'c' or None (unknown) for the end of word."""
    w = word.rstrip()
    if not w:
        return None
    ch = w[-1]
    if ch == ')':
        depth, i = 0, len(w) - 1
        while i >= 0:
            depth += {')': 1, '(': -1}.get(w[i], 0)
            if depth == 0:
                # a gloss after a Korean word, 수요곡선(demand curve)은, is read
                # as that word; a coordinate or formula, (3, 6)으로, as its end
                inside, before = w[i + 1:-1], w[:i].rstrip('』」’”\'"')
                gloss = i and not w[i - 1].isspace() and (before != w[:i] or '가' <= w[i - 1] <= '힣' or HANGUL.search(inside)
                                                          or re.fullmatch(r'\d{4}(?:[–-]\d{2,4})?', inside))  # GATT(1947)와
                return sound(before) if gloss else sound(inside)
            i -= 1
        return None
    if '가' <= ch <= '힣':
        f = (ord(ch) - 0xAC00) % 28
        return 'v' if f == 0 else 'l' if f == 8 else 'c'
    # a fraction is read denominator first, 1/2 as 2분의 1, so it ends as its
    # numerator; a ratio of letters, K/L, is read either way and is not checked
    m = re.search(r'(?:^|[^0-9A-Za-z])([0-9]+)/[0-9A-Za-z]+$', w)
    if m:
        return sound(m.group(1))
    if re.search(r'[0-9A-Za-z)]/[0-9A-Za-z(]+$', w):
        return None
    # a Roman numeral in a name, 경제수학 I, is read as a number: 일, 이, 삼
    m = re.search(r'(?:경제수학|바젤) (I|II|III|IV|V|VI)$', w)
    if m:
        return {'I': 'l', 'II': 'v', 'III': 'c', 'IV': 'v', 'V': 'v', 'VI': 'c'}[m.group(1)]
    if '0' <= ch <= '9':
        n = re.search(r'([0-9]+)$', w).group(1).lstrip('0') or '0'
        return 'c' if n.endswith('0') else DIGIT[n[-1]]
    if ch == '%':
        return 'v'
    if ch in GREEK:
        return GREEK[ch]
    if re.match(r'[A-Za-z]', ch):
        m = re.search(r'([A-Za-z]+)$', w)
        tok = m.group(1)
        if len(tok) == 1 or tok.isupper():
            return LETTER.get(tok[-1].upper())
    return None


def josa(lines):
    out = []
    pat = re.compile(r'([0-9A-Za-z%)α-ω])(으로|은|는|이|가|을|를|과|와|로)' + END)
    for n, l in lines:
        for m in pat.finditer(l):
            s = sound(l[:m.start(2)])
            p = m.group(2)
            if s is None:
                continue
            want = None
            for c_form, v_form in PAIRS:
                if p in (c_form, v_form):
                    if c_form == '으로':
                        want = '로' if s in ('v', 'l') else '으로'
                    else:
                        want = v_form if s == 'v' else c_form
            if want and want != p:
                out.append(f'{n}: …{l[max(0, m.start() - 18):m.end() + 2]}…  ({p} → {want})')
    return out


# ---- style ------------------------------------------------------------------

STYLE = {
    '것들': r'것들',
    '무생물+들': r'(?:곡선|점|가격|모형|균형|균형점|시장|그림|선택|값|칸|방법|과목|단원|책|작업|장|축|변수|가정|경로|흐름|정리|결과|질문|조건|부분|요소|재화|자료|데이터|논문|사실|단계|규칙|제도|나라|단면|평면|직선|교점|최적점|발견|논쟁|도구|설계|부문|과업|전략)들',
    '그것·그들·이들': r'그것|그들|이들|이것들',
    '재다(측정)': r'잰다|재는|재고|잴 |재면|잰 |재야|재지|재며',
    '가지다': r'가진다|갖는|가지는|가졌|갖고|갖지|가지고|가진 ',
    '필요로': r'필요로',
    '에 대한·관한': r'에 대한|에 대해|에 관한|에 관해',
    '을 통해': r'[을를] 통해|[을를] 통한',
    '에 의해': r'에 의해|에 의한',
    '로부터': r'로부터',
    # the article "하나의 N" (after a particle or at the start), not a count after its noun, 곡선 하나의 이동
    '하나의': r'(?:^|[은는이가을를에서로도과와][ ]|[.,(“‘][ ]?)하나의 ',
    '~는 것이다': r'[는은한된던] 것이다',
    '와 함께': r'[와과] 함께',
    '중 하나': r'중 하나',
    '겹피동': r'되어지|되어진|쓰여지|쓰여진|불려지|보여지|보여진',
    ', 곧': r', 곧 ',
    '문두 그리고·그래서·하지만': r'(?:^|[.?] )(?:그리고|그래서|하지만) ',
    '무생물 주어+행위': r'(?:그림|표|페이지|절|단계|모형|정리|과목|책|바퀴|이야기|평면도)(?: [0-9.]+)?[은는이가] [^.?]{0,40}(?:보여 준다|말한다|묻는다|적는다|가르친다|허락한다|요구한다|원한다|준다)',
}


def style(lines):
    c = collections.Counter()
    ex = {}
    for n, l in lines:
        for k, p in STYLE.items():
            hits = re.findall(p, l)
            if hits:
                c[k] += len(hits)
                ex.setdefault(k, n)
    return c, ex


def main(argv):
    files = argv or DEFAULT
    bad = 0
    total = collections.Counter()
    for path in files:
        rel = os.path.relpath(os.path.abspath(path), ROOT)
        with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
            new = f.read()
        old = head(rel)
        problems, notes = [], []
        if old is not None and old != new:
            problems, notes = (keep_page if rel.endswith('.html') else keep_dict)(old, new)
        lines = lines_of(rel, new)
        j = josa(lines)
        c, ex = style(lines)
        total += c
        print(f'== {rel}: keep {len(problems)}, josa {len(j)}, style {sum(c.values())}')
        for p in problems:
            print('  keep  ', p)
        for p in notes[:20]:
            print('  note  ', p)
        for p in j:
            print('  josa  ', p)
        if c:
            print('  style ', ', '.join(f'{k} {v} (줄 {ex[k]})' for k, v in c.most_common()))
        bad += len(problems) + len(j)
    print(f'style in all: {sum(total.values())}  ' + ', '.join(f'{k} {v}' for k, v in total.most_common()))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

#!/usr/bin/env python3
"""Splits docs/textbook-plan.md into one design file per book (docs/books/).

    python3 tools/split_plan.py

Each book's textbook is written in a repository of its own. That repository
takes three files from docs/books/: its book (NN-id.md: the head table, the
table of contents and the plan's section 5 for that book, one heading a
chapter), 00-common.md (the plan without section 5: the principles, the
chapter's fourteen parts, the eight works and their tests, the division of
labour) and 00-style.md (docs/ko-style.md). README.md lists the books.

The plan stays the one source: edit docs/textbook-plan.md and run this again.
The works and chapters each book is read in come from prototype/traditional/
books.js, which tools/check_works.py checks against the plan.
"""

import html
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAN = os.path.join(ROOT, 'docs', 'textbook-plan.md')
STYLE = os.path.join(ROOT, 'docs', 'ko-style.md')
OUT = os.path.join(ROOT, 'docs', 'books')
WEB = os.path.join(ROOT, 'prototype', 'traditional')

SITE = 'https://voidmain443.github.io/Frontier_economics_BA/'
REPO = 'https://github.com/voidmain443/Frontier_economics_BA/blob/main/'
# the three parts of the site: the Korean page, the prefix of its section ids
PARTS = {'1': ('classical.ko.html', 's', '고전 교과서'), '2': ('beyond.ko.html', 'b', '서로 다르고 연결된'), '3': ('archive.ko.html', 'a', '새 아카이브')}
# the data the chapters name, and where each is published
DATA = [
    ('ECOS', '한국은행 경제통계시스템', 'https://ecos.bok.or.kr/'),
    ('산업연관표', '한국은행 산업연관표', 'https://www.bok.or.kr/portal/main/contents.do?menuNo=200672'),
    ('KOSIS', '국가통계포털', 'https://kosis.kr/'),
    # 통계청 became 국가데이터처 on 2025-10-01; MDIS moved to mods.go.kr
    ('MDIS', '마이크로데이터 통합서비스(국가데이터처)', 'https://mdis.mods.go.kr/'),
    ('OpenDART', '금융감독원 전자공시 OpenDART', 'https://opendart.fss.or.kr/'),
    ('KLIPS', '한국노동패널조사', 'https://www.kli.re.kr/klips'),
    ('FRED', 'FRED(세인트루이스 연준)', 'https://fred.stlouisfed.org/'),
    ('Penn World', 'Penn World Table', 'https://www.rug.nl/ggdc/productivity/pwt/'),
    ('Maddison', 'Maddison Project Database', 'https://www.rug.nl/ggdc/historicaldevelopment/maddison/'),
]

WORK_KO = {1: '읽기', 2: '풀이', 3: '증명', 4: '경제 전체의 모형화', 5: '측정', 6: '계산', 7: '심사와 답변', 8: '질문과 논문'}
SIDE_KO = {'core': '핵심', 'field': '각론', 'last': '마지막 책'}


def site():
    """WORKS and BOOKS from books.js, and the Korean dictionary for the deliverables."""
    js = ("import { WORKS, BOOKS, SHELF } from './books.js'; import ko from './i18n/ko.js';"
          # as i18n.js looks a string up: as it is, or with its numbers as {0}, {1}, …
          "const N = /\\d+(?:[.,]\\d+)*/g;"
          "const k = (x) => { if (ko[x] != null) return ko[x]; const n = x.match(N) ?? []; let i = 0;"
          " const tpl = ko[x.replace(N, () => `{${i++}}`)]; return tpl == null ? x : tpl.replace(/\\{(\\d+)\\}/g, (m, j) => n[+j] ?? m); };"
          "console.log(JSON.stringify({ WORKS, BOOKS, SHELF, hands: Object.fromEntries(WORKS.map((w) => [w.no, k(w.hands)])),"
          " ko: Object.fromEntries([...WORKS.flatMap((w) => [w.name, w.hands]), ...BOOKS.flatMap((b) => [b.name, b.question, b.takes])].map((x) => [x, k(x)])) }));")
    r = subprocess.run(['node', '--input-type=module', '-e', js], cwd=WEB, capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr)
    return json.loads(r.stdout)


def site_index():
    """Figure titles and section names of the three parts, from the Korean pages."""
    figs, secs = {}, {}
    for part, (page, pre, _) in PARTS.items():
        s = open(os.path.join(WEB, page), encoding='utf-8').read()
        for m in re.finditer(r'<figure[^>]*data-fig="([\d.]+)"[^>]*>(.*?)</figure>', s, re.S):
            cap = re.search(r'<figcaption>(.*?)</figcaption>', m.group(2), re.S)
            text = html.unescape(re.sub(r'<[^>]+>', '', cap.group(1))) if cap else ''
            text = text.strip().removeprefix(f'그림 {m.group(1)}').strip()
            title = re.split(r'(?<=[.?])\s', text, maxsplit=1)[0].rstrip('.')
            figs[(part, m.group(1))] = title if len(title) <= 40 else title[:38].rstrip() + '…'
        for m in re.finditer(rf'id="{pre}(\d+)" data-no="\d+" data-name="([^"]*)"', s):
            secs[(part, m.group(1))] = m.group(2)
    found = open(os.path.join(ROOT, 'docs', 'part3-foundations.md'), encoding='utf-8').read()
    heads = {m.group(1): m.group(2) for m in re.finditer(r'^#{2,3} (\d+(?:\.\d+)?)\.? (.+)$', found, re.M)}
    return figs, secs, heads


def num_key(x):
    return [int(i) for i in re.findall(r'\d+', x)]


def where(text, refs):
    """The section '이 권을 쓸 때 볼 곳': what the book's design points to on
    the site, in the foundations, and in the data."""
    figs, secs, heads = refs
    lines = []
    for part, (page, pre, name) in PARTS.items():
        fs = sorted({f for f in re.findall(rf'{part}부 그림 (\d+\.\d+)', text)}
                    | ({f for f in re.findall(r'2부 (\d+\.\d+)', text)} if part == '2' else set()), key=num_key)
        ss = sorted(set(re.findall(rf'{part}부 (\d+)절', text)), key=int)
        items = []
        for f in fs:
            if (part, f) not in figs:
                continue
            items.append(f'[그림 {f}]({SITE}{page}#f{f.replace(".", "-")}) {figs[(part, f)]}')
        for n in ss:
            if (part, n) in secs:
                items.append(f'[{n}절]({SITE}{page}#{pre}{n}) {secs[(part, n)]}')
        if items:
            lines.append(f'- **{part}부 {name}.** ' + ' · '.join(items))
    fd = sorted(set(re.findall(r'토대 (\d+(?:\.\d+)?)절', text)), key=num_key)
    if fd:
        lines.append(f'- **3부의 토대** ([`docs/part3-foundations.md`]({REPO}docs/part3-foundations.md)). '
                     + ' · '.join(f'{n}절 {heads[n]}' for n in fd if n in heads))
    used = [(k, name, url, len(re.findall(re.escape(k), text))) for k, name, url in DATA]
    used = sorted([u for u in used if u[3]], key=lambda u: -u[3])
    if used:
        lines.append('- **자료.** ' + ' · '.join(f'[{name}]({url}) {n}곳' for _, name, url, n in used))
    return ('## 이 권을 쓸 때 볼 곳\n\n'
            '설계의 본문이 가리키는 사이트의 그림과 절, 3부의 토대, 자료이다. `tools/split_plan.py`가 본문에서 뽑았으므로 '
            '설계를 고치면 이 목록도 바뀐다. 자료 뒤의 수는 설계에서 그 자료를 언급한 횟수이다.\n\n'
            + '\n'.join(lines) + '\n\n')


def shelf(b, data):
    """The section '참고 서가': the existing textbooks beside the book (books.js SHELF)."""
    s = data['SHELF'].get(b['id'])
    if not s:
        return ''
    item = lambda x: f'[{x["t"]}]({x["u"]})' if x.get('u') else x['t']
    rows = [('표준 교재', s['std']), ('공개·개혁 교재', s['open']), ('한국어 교재', s['ko'])]
    body = '\n'.join(f'- **{k}.** ' + ('; '.join(item(x) for x in xs) if xs else '없음. 이 책이 첫 한국어 교재가 된다.') for k, xs in rows)
    return ('## 참고 서가\n\n'
            '판과 연도는 2026-11-16에 출판사, 저자, 알라딘의 페이지와 대조했다(`prototype/traditional/books.js`의 `SHELF`). '
            '링크가 걸린 책은 온라인에서 무료로 읽을 수 있다. 빌릴 것과 피할 것, 이용허락은 `docs/next-series.md` 3절과 4절에 있다.\n\n'
            + body + '\n\n')


def runs(chs):
    """[1, 2, 3, 5] -> '1~3, 5'"""
    out = []
    for c in sorted(chs):
        if out and c == out[-1][1] + 1:
            out[-1][1] = c
        else:
            out.append([c, c])
    return ', '.join(f'{a}' if a == b else f'{a}, {b}' if b == a + 1 else f'{a}~{b}' for a, b in out)


def sections(plan):
    """The plan's parts: everything before section 5, the books, everything after."""
    i = plan.index('\n## 5. ')
    j = plan.index('\n## 6. ')
    head, five, tail = plan[:i], plan[i:j], plan[j:]
    parts = re.split(r'^### 권 (\d+)\. ', five, flags=re.M)
    intro = parts[0]
    books = {int(parts[k]): parts[k + 1] for k in range(1, len(parts), 2)}
    return head, intro, books, tail


CHAPTER = re.compile(r'^\*\*(\d+)장\. (.+?)\*\* — (.+)$', re.M)


def book_file(no, body, b, data, refs):
    title = body.split('\n', 1)[0].strip()
    text = body.split('\n', 1)[1].strip('\n')
    chapters = CHAPTER.findall(text)
    works = data['WORKS']
    read = {int(w): chs for w, chs in b['read'].items()}
    all_chs = sorted(c for chs in read.values() for c in chs)
    assert [int(n) for n, _, _ in chapters] == list(range(1, len(chapters) + 1)) == all_chs, f'book {no}: chapters differ from books.js'
    rows = [('번호와 식별자', f'권 {no}, `{b["id"]}`'), ('자리', SIDE_KO[b['side']]), ('장 수', f'{len(chapters)}장')]
    rows.append(('읽는 작업', '; '.join(
        f'작업 {w}({WORK_KO[w]})' + ('' if len(read) == 1 else f', {runs(chs)}장') for w, chs in sorted(read.items()))))
    waits = sorted({p for w in read for p in works[w - 1]['waits']})
    rows.append(('선행 작업', ', '.join(f'작업 {p}({WORK_KO[p]})' for p in waits) if waits else '없음'))
    rows.append(('작업의 산출물', '; '.join(f'작업 {w}: {data["hands"][str(w)]}' for w in sorted(read))))
    rows.append(('사이트의 과목 페이지', f'`course.html?c={b["course"]}` (1부의 학교 과정, 주차별)' if b['course'] else '없음'))
    toc = '\n'.join(f'{n}. {t} — {q}' for n, t, q in chapters)
    text = CHAPTER.sub(lambda m: f'## {m.group(1)}장. {m.group(2)}\n\n**질문.** {m.group(3)}', text)
    return (f'# 권 {no}. {title}\n\n'
            f'> `docs/textbook-plan.md` 5절의 권 {no}을 떼어 낸 설계다(`tools/split_plan.py`). '
            f'공통 규약은 `00-common.md`, 문체는 `00-style.md`를 따른다.\n\n'
            '| 항목 | 내용 |\n|---|---|\n' + '\n'.join(f'| {k} | {v} |' for k, v in rows) +
            f'\n\n{where(body, refs)}{shelf(b, data)}## 목차\n\n{toc}\n\n## 책의 설계\n\n{text}\n')


def main():
    plan = open(PLAN, encoding='utf-8').read()
    data = site()
    refs = site_index()
    head, intro, books, tail = sections(plan)
    os.makedirs(OUT, exist_ok=True)
    by_no = {b['no']: b for b in data['BOOKS']}
    assert sorted(books) == sorted(by_no), 'the plan and books.js list different books'
    index = []
    for no in sorted(books):
        b = by_no[no]
        name = f'{no:02d}-{b["id"]}.md'
        with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
            f.write(book_file(no, books[no], b, data, refs))
        title = books[no].split('\n', 1)[0].split(' (')[0]
        works = ', '.join(str(w) for w in sorted(int(w) for w in b['read']))
        index.append(f'| {no} | [{name}]({name}) | {title} | {SIDE_KO[b["side"]]} | {len(sum(b["read"].values(), []))} | {works} |')
    common = (head + intro.replace('## 5. ', '## 5. ', 1) +
              '\n권마다의 설계는 `NN-id.md` 파일에 있다(README.md의 표).\n' + tail)
    with open(os.path.join(OUT, '00-common.md'), 'w', encoding='utf-8') as f:
        f.write('> `docs/textbook-plan.md`에서 5절(권별 상세 목차)을 뺀 공통 규약이다(`tools/split_plan.py`).\n\n' + common)
    with open(os.path.join(OUT, '00-style.md'), 'w', encoding='utf-8') as f:
        f.write('> `docs/ko-style.md`의 사본이다(`tools/split_plan.py`). 9절의 점검 도구는 사이트 저장소에 있다.\n\n' +
                open(STYLE, encoding='utf-8').read())
    total = sum(len(sum(b['read'].values(), [])) for b in data['BOOKS'])
    # the catalogue as data, for any other site that lists the books
    # (the author's site replaces its old catalogue with this one)
    ko = data['ko']
    catalogue = {
        'source': 'docs/textbook-plan.md (tools/split_plan.py)',
        'site': SITE + 'archive.ko.html#a9',
        'works': [{'no': w['no'], 'name': {'en': w['name'], 'ko': ko[w['name']]}, 'hands': {'en': w['hands'], 'ko': ko[w['hands']]},
                   'waits': w['waits']} for w in data['WORKS']],
        'books': [],
    }
    for no in sorted(books):
        b = by_no[no]
        chapters = [{'no': int(n), 'title': t, 'question': q} for n, t, q in CHAPTER.findall(books[no])]
        catalogue['books'].append({
            'no': no, 'id': b['id'], 'side': b['side'], 'file': f'docs/books/{no:02d}-{b["id"]}.md',
            'name': {'en': b['name'], 'ko': ko[b['name']]},
            'question': {'en': b['question'], 'ko': ko[b['question']]},
            'takes': {'en': b['takes'], 'ko': ko[b['takes']]},
            'works': {w: chs for w, chs in sorted(b['read'].items(), key=lambda x: int(x[0]))},
            'course_page': f'{SITE}course.ko.html?c={b["course"]}' if b['course'] else None,
            'site_row': f'{SITE}archive.ko.html#b-{b["id"]}',
            'shelf': data['SHELF'].get(b['id']),
            'chapters': chapters,
        })
    with open(os.path.join(OUT, 'books.json'), 'w', encoding='utf-8') as f:
        json.dump(catalogue, f, ensure_ascii=False, indent=1)
        f.write('\n')
    with open(os.path.join(OUT, 'README.md'), 'w', encoding='utf-8') as f:
        f.write('# 교재 22권의 설계\n\n'
                f'3부의 교재 22권, {total}장의 설계를 권마다 나눈 파일이다. 원본은 `docs/textbook-plan.md`이고, '
                '`python3 tools/split_plan.py`가 이 폴더를 만든다. 고칠 때는 원본을 고치고 다시 만든다.\n\n'
                '교재의 본문은 권마다 다른 저장소에서 쓴다. 각 저장소에는 다음 세 파일을 가져간다.\n\n'
                '- `NN-id.md`: 그 권의 설계. 머리 표, 목차, 책의 바퀴, 장마다 상태, 다루는 법, 근거와 반증, 연습, 다시 나오는 곳.\n'
                '- `00-common.md`: 모든 권이 따르는 규약. 원칙 여덟, 장의 열네 순서, 권의 짜임, 여덟 가지 작업과 통과 기준, '
                '책의 지도, 권 사이의 분업, 출판 전에 확인할 사실.\n'
                '- `00-style.md`: 한국어 문체 기준과 용어집.\n\n'
                '`books.json`은 같은 목록을 자료로 낸 것이다. 작업 여덟 가지, 권마다 이름, 질문, 읽는 작업과 장, 장마다 제목과 질문이 '
                '한국어와 영어로 들어 있다. 다른 사이트의 교재 목록은 이 파일에서 만든다.\n\n'
                '새 시리즈를 시작할 때 읽는 순서와 권마다 옆에 둘 기존 교재는 `docs/next-series.md`에 있다.\n\n'
                '설계에 나오는 \'1부 그림 1.1\', \'2부 2.4\', \'3부 7절\'은 사이트 단면(Cross-Section)의 그림과 절이고, '
                '\'토대 N절\'은 `docs/part3-foundations.md`의 절이다.\n\n'
                '| 권 | 파일 | 제목 | 자리 | 장 | 작업 |\n|---|---|---|---|---|---|\n' + '\n'.join(index) + '\n')
    print(f'{len(books)} books, {total} chapters -> docs/books/')


if __name__ == '__main__':
    main()

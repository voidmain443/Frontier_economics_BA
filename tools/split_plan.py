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

WORK_KO = {1: '읽기', 2: '풀이', 3: '증명', 4: '경제 전체의 모형화', 5: '측정', 6: '계산', 7: '심사와 답변', 8: '질문과 논문'}
SIDE_KO = {'core': '핵심', 'field': '각론', 'last': '마지막 책'}


def site():
    """WORKS and BOOKS from books.js, and the Korean dictionary for the deliverables."""
    js = ("import { WORKS, BOOKS } from './books.js'; import ko from './i18n/ko.js';"
          "console.log(JSON.stringify({ WORKS, BOOKS, hands: Object.fromEntries(WORKS.map((w) => [w.no, ko[w.hands] ?? w.hands])) }));")
    r = subprocess.run(['node', '--input-type=module', '-e', js], cwd=WEB, capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr)
    return json.loads(r.stdout)


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


def book_file(no, body, b, data):
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
            f'\n\n## 목차\n\n{toc}\n\n## 책의 설계\n\n{text}\n')


def main():
    plan = open(PLAN, encoding='utf-8').read()
    data = site()
    head, intro, books, tail = sections(plan)
    os.makedirs(OUT, exist_ok=True)
    by_no = {b['no']: b for b in data['BOOKS']}
    assert sorted(books) == sorted(by_no), 'the plan and books.js list different books'
    index = []
    for no in sorted(books):
        b = by_no[no]
        name = f'{no:02d}-{b["id"]}.md'
        with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
            f.write(book_file(no, books[no], b, data))
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
    with open(os.path.join(OUT, 'README.md'), 'w', encoding='utf-8') as f:
        f.write('# 교재 22권의 설계\n\n'
                f'3부의 교재 22권, {total}장의 설계를 권마다 나눈 파일이다. 원본은 `docs/textbook-plan.md`이고, '
                '`python3 tools/split_plan.py`가 이 폴더를 만든다. 고칠 때는 원본을 고치고 다시 만든다.\n\n'
                '교재의 본문은 권마다 다른 저장소에서 쓴다. 각 저장소에는 다음 세 파일을 가져간다.\n\n'
                '- `NN-id.md`: 그 권의 설계. 머리 표, 목차, 책의 바퀴, 장마다 상태, 다루는 법, 근거와 반증, 연습, 다시 나오는 곳.\n'
                '- `00-common.md`: 모든 권이 따르는 규약. 원칙 여덟, 장의 열네 순서, 권의 짜임, 여덟 가지 작업과 통과 기준, '
                '책의 지도, 권 사이의 분업, 출판 전에 확인할 사실.\n'
                '- `00-style.md`: 한국어 문체 기준과 용어집.\n\n'
                '설계에 나오는 \'1부 그림 1.1\', \'2부 2.4\', \'3부 7절\'은 사이트 단면(Cross-Section)의 그림과 절이고, '
                '\'토대 N절\'은 `docs/part3-foundations.md`의 절이다.\n\n'
                '| 권 | 파일 | 제목 | 자리 | 장 | 작업 |\n|---|---|---|---|---|---|\n' + '\n'.join(index) + '\n')
    print(f'{len(books)} books, {total} chapters -> docs/books/')


if __name__ == '__main__':
    main()

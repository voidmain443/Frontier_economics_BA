#!/usr/bin/env python3
"""Check the order of the eight works in docs/textbook-plan.md (standard-library Python).

Part 3's textbooks are not ordered by semester or year but by eight works a
reader must accomplish (plan section 4). Section 4.1's table assigns every
chapter to one work and says which works each work waits for. This reads that
table and every chapter's references to other chapters (in the bullets state,
treatment, grounds and falsification, exercises; the "appears again" list is
left out), and lists each reference that points to a chapter in a work that is
neither the same work nor one it waits for. Such a reference is fine when it
states a theorem that a later work proves, or hands a failure case to a later
book; it is a mistake when the chapter cannot stand without the later one.

The site draws the same order in Part 3, section 9, from books.js; this
also checks that books.js reads every chapter in the work the plan gives it,
and that its works wait for what the plan's do.

    python3 tools/check_works.py        # exit status 1 if a chapter is unassigned or assigned twice,
                                        # or books.js disagrees with the plan
"""

import os
import re
import sys
from collections import Counter

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAN = os.path.join(HERE, "docs", "textbook-plan.md")
SITE = os.path.join(HERE, "prototype", "traditional", "books.js")
DEP = ("상태", "다루는 법", "근거와 반증", "연습")
ALIAS = {"방법과 철학": "경제학의 방법과 철학", "중급 미시": "중급 미시경제학", "중급 거시": "중급 거시경제학", "원론": "경제원론", "계량": "계량경제학"}


def nums(s):
    out = []
    for part in s.split("·"):
        a = [int(x) for x in re.split(r"\s*~\s*", part.strip())]
        out += list(range(a[0], a[-1] + 1)) if len(a) == 2 else a
    return out


def read():
    lines = open(PLAN, encoding="utf-8").read().split("\n")
    books, order, cur = {}, [], None
    for line in lines:
        m = re.match(r"### 권 (\d+)\. (.+?) \(", line)
        if m:
            cur = m.group(2).split(":")[0].strip()
            books[cur] = set()
            order.append(cur)
            continue
        if line.startswith("## 6."):
            cur = None
        m = re.match(r"\*\*(\d+)장\. ", line)
        if m and cur:
            books[cur].add(int(m.group(1)))
    return lines, books, order


def works(lines, books, order):
    """Section 4.1's table: work -> chapters, and work -> works it waits for."""
    names = sorted(books, key=len, reverse=True)
    pair = re.compile("(" + "|".join(map(re.escape, names)) + r") ([\d~·]+)장")
    assign, wait = {}, {}
    on = False
    for line in lines:
        if line.startswith("### 4.1"):
            on = True
            continue
        if on and line.startswith("### "):
            break
        m = re.match(r"\| (\d+)\. ", line) if on else None
        if not m:
            continue
        w = int(m.group(1))
        cells = [c.strip() for c in line.strip("|").split("|")]
        wait[w] = set() if cells[4] == "없음" else {int(x) for x in re.findall(r"\d+", cells[4])}
        for b, s in pair.findall(cells[3]):
            for c in nums(s):
                assign.setdefault((b, c), []).append(w)
        for a, z in re.findall(r"권 (\d+)~(\d+)", cells[3]):
            for b in order[int(a) - 1:int(z)]:
                for c in books[b]:
                    assign.setdefault((b, c), []).append(w)
    return assign, wait


def refs(lines, books):
    names = sorted(set(books) | set(ALIAS), key=len, reverse=True)
    ref = re.compile("(?:(" + "|".join(map(re.escape, names)) + r")(?:의)?\s*(?:[가-힣 ]{0,6}\()?\s*)?(\d+(?:\s*[~·]\s*\d+)*)장")
    out, cur, ch = [], None, 0
    for line in lines:
        m = re.match(r"### 권 (\d+)\. (.+?) \(", line)
        if m:
            cur, ch = m.group(2).split(":")[0].strip(), 0
            continue
        if line.startswith("## 6."):
            cur = None
        if not cur:
            continue
        m = re.match(r"\*\*(\d+)장\. ", line)
        if m:
            ch = int(m.group(1))
            continue
        m = re.match(r"- \*\*(.+?)\.\*\*", line)
        if not (m and ch and m.group(1) in DEP):
            continue
        body = line[m.end():]
        last, end = cur, 0
        for r in ref.finditer(body):
            if r.group(1):
                tb = ALIAS.get(r.group(1), r.group(1))
            else:
                gap = body[end:r.start()]
                tb = last if end and re.fullmatch(r"\s*(,|과|와|및|,\s*그리고|그리고)?\s*", gap) else cur
            last, end = tb, r.end()
            rest = body[r.end():]
            if rest.startswith("("):  # step over "(topic)" so a chained "N장" keeps its book
                depth = 0
                for i, c in enumerate(rest):
                    depth += (c == "(") - (c == ")")
                    if depth == 0:
                        end = r.end() + i + 1
                        break
            for n in nums(r.group(2)):
                if n in books[tb] and (tb, n) != (cur, ch):
                    out.append((m.group(1), cur, ch, tb, n))
    return out


def site():
    """books.js: (book number, chapter) -> work, and work -> works it waits for."""
    text = open(SITE, encoding="utf-8").read()
    assign, wait = {}, {}
    for no, waits in re.findall(r"\{ no: (\d+), name: .*?waits: \[([\d, ]*)\]", text):
        wait[int(no)] = {int(x) for x in re.findall(r"\d+", waits)}
    for no, read_ in re.findall(r"\{ no: (\d+), id: '[\w-]+',.*?read: \{(.*?)\} \}", text, re.S):
        for w, chs in re.findall(r"(\d+): (\[[^\]]*\]|R\(\d+, \d+\))", read_):
            runs = [range(int(a), int(z) + 1) for a, z in re.findall(r"R\((\d+), (\d+)\)", chs)]
            for c in [c for r in runs for c in r] + [int(x) for x in re.findall(r"\d+", re.sub(r"R\(\d+, \d+\)", "", chs))]:
                assign[(int(no), c)] = int(w)
    return assign, wait


def main():
    lines, books, order = read()
    assign, wait = works(lines, books, order)
    every = {(b, c) for b in books for c in books[b]}
    missing = sorted(every - set(assign))
    twice = sorted(k for k, v in assign.items() if len(v) > 1)
    W = {k: v[0] for k, v in assign.items()}

    def before(w):
        seen, stack = set(), [w]
        while stack:
            for p in wait.get(stack.pop(), ()):
                if p not in seen:
                    seen.add(p)
                    stack.append(p)
        return seen

    print("%d books, %d chapters, %d works" % (len(books), len(every), len(wait)))
    print("chapters per work:", ", ".join("%d: %d" % kv for kv in sorted(Counter(W.values()).items())))
    if missing or twice:
        print("unassigned:", missing)
        print("assigned twice:", twice)
    R = refs(lines, books)
    ahead = [(W[(b, c)], W[(tb, n)], k, b, c, tb, n) for k, b, c, tb, n in R
             if (b, c) in W and (tb, n) in W and W[(tb, n)] != W[(b, c)] and W[(tb, n)] not in before(W[(b, c)])]
    print("%d references between chapters; %d point to a work not yet done" % (len(R), len(ahead)))
    for ws, wt, k, b, c, tb, n in sorted(ahead):
        print("  work %d -> %d  %s %d장 -> %s %d장  (%s)" % (ws, wt, b, c, tb, n, k))
    S, Swait = site()
    plan = {(order.index(b) + 1, c): w for (b, c), w in W.items()}
    off = sorted(k for k in set(plan) | set(S) if plan.get(k) != S.get(k))
    if off or Swait != wait:
        print("books.js disagrees with the plan:")
        for no, c in off:
            print("  book %d, chapter %d: plan work %s, books.js work %s" % (no, c, plan.get((no, c)), S.get((no, c))))
        if Swait != wait:
            print("  waits: plan %s, books.js %s" % (sorted(wait.items()), sorted(Swait.items())))
    else:
        print("books.js agrees with the plan: %d chapters, %d works" % (len(S), len(Swait)))
    return 1 if missing or twice or off or Swait != wait else 0


if __name__ == "__main__":
    sys.exit(main())

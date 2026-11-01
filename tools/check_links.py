#!/usr/bin/env python3
"""Check the site's internal links (standard-library Python).

Every link written in the site's HTML and JavaScript to one of its own pages
must reach something: a page that exists, an element id in that page, a course
id that curriculum.js defines, and a week of that course. Part 2's sections
were renumbered once (D100) and fourteen links had to be found by hand; this
finds them.

    python3 tools/check_links.py        # exit status 1 if any link is broken
"""

import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "prototype", "traditional")
BASE = ("index", "classical", "beyond", "archive", "course")
# each page and its Korean twin (docs/i18n.md), where the twin exists
PAGES = tuple(n for b in BASE for n in ("%s.html" % b, "%s.ko.html" % b) if os.path.exists(os.path.join(ROOT, n)))
LINK = re.compile(r"""(?<![\w./-])((?:index|classical|beyond|archive|course)(?:\.ko)?\.html)(\?c=[\w-]+)?(#[\w-]+)?""")
SAME = re.compile(r"""href=["']#([\w-]+)["']""")
ID = re.compile(r"""\bid=["']([\w-]+)["']""")


def read(name):
    with open(os.path.join(ROOT, name), encoding="utf-8") as f:
        return f.read()


def courses():
    """Course ids in curriculum.js, with the number of weeks of each."""
    text = read("curriculum.js")
    out = {}
    blocks = re.split(r"\n  \{\n    id: '", text)
    for b in blocks[1:]:
        cid = b.split("'", 1)[0]
        head = b.split("\n", 1)[0]
        if "short:" not in head:
            continue
        out[cid] = len(re.findall(r"\bW\(", b.split("\n  },", 1)[0]))
    return out


def main():
    ids = {p: set(ID.findall(read(p))) for p in PAGES}
    known = courses()
    files = sorted(f for f in os.listdir(ROOT) if f.endswith((".html", ".js")))
    bad = []
    n = 0
    for f in files:
        text = read(f)
        for line_no, line in enumerate(text.split("\n"), 1):
            for m in LINK.finditer(line):
                # (a link built in a template string is checked where it is used)
                if line[m.end():m.end() + 2] == "${":
                    continue
                page, query, anchor = m.group(1), m.group(2), m.group(3)
                n += 1
                if not os.path.exists(os.path.join(ROOT, page)):
                    bad.append((f, line_no, m.group(0), "no such page"))
                    continue
                if page in ("course.html", "course.ko.html"):
                    cid = query[3:] if query else None
                    if cid and cid not in known:
                        bad.append((f, line_no, m.group(0), "no course '%s'" % cid))
                    elif cid and anchor:
                        wk = re.fullmatch(r"#%s-(\d+)" % re.escape(cid), anchor)
                        if not wk or not 1 <= int(wk.group(1)) <= known[cid]:
                            bad.append((f, line_no, m.group(0), "no such week"))
                    continue
                if anchor and anchor[1:] not in ids[page]:
                    bad.append((f, line_no, m.group(0), "no id '%s' in %s" % (anchor[1:], page)))
            if f in PAGES:
                for m in SAME.finditer(line):
                    n += 1
                    if m.group(1) not in ids[f]:
                        bad.append((f, line_no, "#" + m.group(1), "no id in this page"))
    for f, line_no, link, why in bad:
        print("%s:%d  %s  (%s)" % (f, line_no, link, why))
    print("%d links checked in %d files (%d courses known), %d broken" % (n, len(files), len(known), len(bad)))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())

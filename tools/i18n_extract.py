#!/usr/bin/env python3
"""Collect the English strings the site's scripts draw, for translation.

Every string literal in the listed scripts that reads as text (not a CSS
class, a selector, a key or a URL) is written out under the key i18n.js
looks it up by: its numbers, and the ${...} parts of template strings, as
{0}, {1}, ... in order. The groups are translated separately.

    python3 tools/i18n_extract.py   # writes prototype/traditional/i18n/strings-*.json
"""

import json
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "prototype", "traditional")
GROUPS = {
    "p1": ["p1-figs.js", "p1-fold.js", "market.js", "geo3d.js"],
    "p23": ["p2-figs.js", "p2-fold.js", "p2-models.js", "p3-figs.js", "p3-space.js", "p3.js", "ontology.js", "wheel.js",
            "course.js", "page.js", "fold.js", "ladder.js"],
    "curriculum": ["curriculum.js"],
}
# strings built at run time from parts, whose keys the scripts cannot show
MANUAL = {"p23": ["Stage {0} of {1}", "Section {0} of {1}", "Course {0} of {1}", "Part {0}", "Part {0}, Figure {1}",
                  "Figure {0}", "{0} weeks", "The core", "The field courses", "Cross-Section", "held", "Held fixed",
                  "{0}<i> min</i>", "The fold needs WebGPU with HTML-in-Canvas.", "The flat page is complete on its own.",
                  "Could not fold the page:", "The fold could not start:", "Lay the page flat", "Fold the page into space"]}

CLASS = set("""k thin thick dash faint md cb oc ol note halo small room step stop col held out tick lb rm it guide ln area
dot ring arr axis xl tag madder cobalt olive ochre chalk white violet door route cno two panels wide dense sub
f-hatch f-olive f-ochre f-cobalt f-madder cobaltInk madderInk ochreInk person firm bank left right middle start end
household central_bank rest_of_world government person_crowd firm_crowd""".split())
CODE = re.compile(r"^(#|\.|\[|figure\[|a\.|https?:|data/|\./)|\.(html|json|js|png|svg)\b|=>|rgba?\(|url\(|translate\(|rotate\(|"
                  r"matrix\(|px\b|^[a-z]+(-[a-z]+)+$|^[a-z_]+>[a-z_]+$|<svg|createElement|querySelector")


def literals(text):
    """(line, value, is_template) for every string literal, template parts as \\x00."""
    out = []
    i, n, line = 0, len(text), 1
    while i < n:
        c = text[i]
        if c == "\n":
            line += 1
        if text.startswith("//", i):
            j = text.find("\n", i)
            i = n if j < 0 else j
            continue
        if text.startswith("/*", i):
            j = text.find("*/", i)
            line += text[i:j].count("\n")
            i = n if j < 0 else j + 2
            continue
        if c in "'\"":
            j, buf = i + 1, []
            while j < n and text[j] != c:
                if text[j] == "\\" and j + 1 < n:
                    buf.append({"n": "\n", "t": "\t"}.get(text[j + 1], text[j + 1]))
                    j += 2
                    continue
                if text[j] == "\n":
                    break
                buf.append(text[j])
                j += 1
            out.append((line, "".join(buf), False))
            i = j + 1
            continue
        if c == "`":
            j, buf, start = i + 1, [], line
            while j < n and text[j] != "`":
                if text[j] == "\\" and j + 1 < n:
                    buf.append(text[j + 1])
                    j += 2
                    continue
                if text.startswith("${", j):
                    depth, k = 1, j + 2
                    while k < n and depth:
                        if text[k] == "{":
                            depth += 1
                        elif text[k] == "}":
                            depth -= 1
                        elif text[k] == "`":
                            # a nested template: skip to its end
                            k2 = k + 1
                            while k2 < n and text[k2] != "`":
                                k2 += 2 if text[k2] == "\\" else 1
                            k = k2
                        k += 1
                    buf.append("\x00")
                    line += text[j:k].count("\n")
                    j = k
                    continue
                if text[j] == "\n":
                    line += 1
                buf.append(text[j])
                j += 1
            out.append((start, "".join(buf), True))
            i = j + 1
            continue
        i += 1
    return out


T_CALL = re.compile(r"\bt\(\s*(['\"])((?:\\.|(?!\1).)+)\1\s*\)")


def key_of(s):
    k = [0]

    def sub(_m):
        k[0] += 1
        return "{%d}" % (k[0] - 1)
    return re.sub(r"\x00|\d+(?:[.,]\d+)*", sub, s)


def is_text(s):
    s2 = s.replace("\x00", "")
    if len(re.findall(r"[A-Za-z]", s2)) < 3:
        return False
    if CODE.search(s2.strip()):
        return False
    toks = s2.split()
    if toks and all(t in CLASS for t in toks):
        return False
    if " " not in s2.strip():
        # one word: a name (Goods, Households) or nothing
        return bool(re.fullmatch(r"[A-Z][A-Za-z’'\-]+[.:]?", s2.strip()))
    return True


def main():
    os.makedirs(os.path.join(ROOT, "i18n"), exist_ok=True)
    for g, files in GROUPS.items():
        seen, rows = set(), []
        for f in files:
            path = os.path.join(ROOT, f)
            if not os.path.exists(path):
                continue
            text = open(path, encoding="utf-8").read()
            # the strings handed to t() inside a template's ${...}, which literals() passes over
            calls = [(text.count("\n", 0, m.start()) + 1, m.group(2), True) for m in T_CALL.finditer(text)]
            for line, val, called in [(ln, v, False) for ln, v, _ in literals(text)] + calls:
                if not called and not is_text(val):
                    continue
                k = key_of(val)
                if k in seen:
                    continue
                seen.add(k)
                rows.append({"key": k, "file": f, "line": line})
        for k in MANUAL.get(g, []):
            if k not in seen:
                seen.add(k)
                rows.append({"key": k, "file": "(built at run time)", "line": 0})
        out = os.path.join(ROOT, "i18n", "strings-%s.json" % g)
        with open(out, "w", encoding="utf-8") as fh:
            json.dump(rows, fh, ensure_ascii=False, indent=0)
        print("%-11s %4d strings  %6d chars -> %s" % (g, len(rows), sum(len(r["key"]) for r in rows), os.path.relpath(out, ROOT)))


if __name__ == "__main__":
    main()

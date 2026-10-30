"""
build_isotype.py -- style B: Isotype pictograms as extruded solids.

    blender -b --factory-startup -P tools/blender/styles/build_isotype.py

After Otto Neurath / Gerd Arntz: each agent is one flat frontal silhouette, extruded to a
modest depth with softened (3-step bevelled) edges. Interior marks are negative space: a
through-opening backed by a recessed `shade` plate. Writes styles/B/<name>.glb for the seven
agents plus person_crowd.glb and firm_crowd.glb (<= 2000 tris), and styles/B/tris.json.

Silhouettes are drawn in the front plane (x right, z up) and extruded along y (front = -y).
"""

import os
import sys
from math import asin, sqrt, pi

sys.path.insert(0, os.path.dirname(os.path.abspath(sys.argv[sys.argv.index("-P") + 1])))
import common as C   # noqa: E402
from common import P, S, MB, fillet, circle, rect, offset_poly   # noqa: E402

OUT = os.path.join(C.HERE, "B")
# Chosen style (2026-10-31). Slabs are thicker than a printed pictogram so that
# they keep their mass when the view is turned (docs/world.md).
DEPTH = 0.40                 # building slabs (unit width)
HERO = dict(arc=6, circ=40, bevel=0.013, segs=3)
CROWD = dict(arc=2, circ=16, bevel=0.012, segs=1)


def outline(spec, q):
    """spec: [(x, z, r), ...] -> filleted polygon."""
    return fillet([(x, z) for x, z, _ in spec], [r for _, _, r in spec], q["arc"])


def pictogram(name, outer, holes, insets, q, depth=DEPTH):
    """outer: polygon; holes: [(poly, recess)], recess = depth of the shade plate behind
    the front face; insets: extra plaster solids [(poly, holes, y0, y1)] (e.g. a coin)."""
    y0, y1 = -depth / 2, depth / 2
    mb = MB()
    mb.slab(outer, [h for h, _ in holes], y0, y1, P)
    body = C.part(mb, name, q["bevel"], q["segs"], angle=30.0)
    parts = [body]
    if holes:
        plates = MB()
        for h, rec in holes:
            plates.slab(offset_poly(h, 0.004), [], y0 + rec, y1 - 0.012, S)
        parts.append(plates.to_object(name + "_plates"))
    for poly, hs, a0, a1 in insets:
        mb2 = MB()
        mb2.slab(poly, hs, a0, a1, P)
        parts.append(C.part(mb2, name + "_inset", q["bevel"] * 0.6, q["segs"], angle=30.0))
    return [C.join(parts, name)]


def rrect(x0, z0, x1, z1, r, q):
    """Openings keep square corners (the bevel softens them); r is kept for big openings."""
    return fillet(rect(x0, z0, x1, z1), r if r >= 0.01 else 0.0, q["arc"])


# --------------------------------------------------------------------------- person

def person(q, crowd=False):
    hr, hc, nw, zs = 0.088, 0.885, 0.033, 0.775
    zn = hc - sqrt(hr * hr - nw * nw)
    a = asin(nw / hr)
    head = circle(0, hc, hr, q["circ"] - 4, -pi / 2 + a, 3 * pi / 2 - a)
    right = [(-0.122, 0.0, 0.012), (-0.016, 0.0, 0.006), (-0.016, 0.395, 0.016), (0.016, 0.395, 0.016),
             (0.016, 0.0, 0.006), (0.122, 0.0, 0.012), (0.130, 0.44, 0.0), (0.133, 0.675, 0.0125),
             (0.159, 0.675, 0.0125), (0.159, 0.43, 0.025), (0.209, 0.43, 0.025), (0.209, zs, 0.075),
             (nw, zs, 0.008)]
    spec = right + [(x, z, 0.0) for x, z in head] + \
        [(-nw, zs, 0.008), (-0.209, zs, 0.075), (-0.209, 0.43, 0.025), (-0.159, 0.43, 0.025),
         (-0.159, 0.675, 0.0125), (-0.133, 0.675, 0.0125), (-0.130, 0.44, 0.0)]
    return pictogram("person", outline(spec, q), [], [], q, depth=0.2)


# --------------------------------------------------------------------------- household

def household(q):
    pitch = 0.43 / 0.48
    zr = lambda x: 0.47 + (0.48 - abs(x)) * pitch
    spec = [(-0.36, 0.0, 0.01), (0.36, 0.0, 0.01), (0.36, 0.44, 0.0), (0.48, 0.44, 0.01),
            (0.48, 0.47, 0.01), (0.27, zr(0.27), 0.0), (0.27, 0.84, 0.01), (0.165, 0.84, 0.01),
            (0.165, zr(0.165), 0.0), (0.0, 0.90, 0.02), (-0.48, 0.47, 0.01), (-0.48, 0.44, 0.01),
            (-0.36, 0.44, 0.0)]
    holes = [(rrect(-0.075, 0.035, 0.075, 0.28, 0.01, q), 0.05),
             (rrect(0.165, 0.18, 0.275, 0.31, 0.008, q), 0.035),
             (rrect(-0.275, 0.18, -0.165, 0.31, 0.008, q), 0.035)]
    return pictogram("household", outline(spec, q), holes, [], q)


# --------------------------------------------------------------------------- firm

def firm(q, crowd=False):
    x = [-0.5, -0.5 + 0.8 / 3, -0.5 + 1.6 / 3, 0.30]
    lo, hi = 0.40, 0.58
    spec = [(-0.5, 0.0, 0.01), (0.43, 0.0, 0.01), (0.415, 0.935, 0.0), (0.428, 0.95, 0.004),
            (0.428, 1.0, 0.008), (0.302, 1.0, 0.008), (0.302, 0.95, 0.004), (0.315, 0.935, 0.0),
            (x[3], hi, 0.0), (x[2], lo, 0.0), (x[2], hi, 0.006), (x[1], lo, 0.0), (x[1], hi, 0.006),
            (x[0], lo, 0.0)]
    holes = []
    for k in range(3):
        holes.append((rrect(x[k] + 0.055, 0.15, x[k + 1] - 0.055, 0.29, 0.008, q), 0.04))
    return pictogram("firm", outline(spec, q), holes, [], q)


# --------------------------------------------------------------------------- bank (pediment)

def bank(q):
    spec = [(-0.5, 0.0, 0.006), (0.5, 0.0, 0.006), (0.5, 0.045, 0.004), (0.46, 0.045, 0.0),
            (0.46, 0.09, 0.004), (0.40, 0.09, 0.0), (0.40, 0.47, 0.0), (0.42, 0.50, 0.0),
            (0.44, 0.50, 0.0), (0.44, 0.60, 0.0), (0.47, 0.60, 0.004), (0.47, 0.63, 0.004),
            (0.0, 0.85, 0.01), (-0.47, 0.63, 0.004), (-0.47, 0.60, 0.004), (-0.44, 0.60, 0.0),
            (-0.44, 0.50, 0.0), (-0.42, 0.50, 0.0), (-0.40, 0.47, 0.0), (-0.40, 0.09, 0.0),
            (-0.46, 0.09, 0.004), (-0.46, 0.045, 0.0), (-0.5, 0.045, 0.004)]
    w, g = 0.10, (0.80 - 0.40) / 3
    holes = []
    for k in range(3):
        xa = -0.40 + w + k * (w + g)
        xb = xa + g
        holes.append(([(xa, 0.09), (xb, 0.09), (xb, 0.465), (xb - 0.016, 0.485),
                       (xa + 0.016, 0.485), (xa, 0.465)], 0.10))
    # recessed tympanum inside the raking cornice
    holes.append(([(-0.37, 0.655), (0.37, 0.655), (0.0, 0.80)], 0.03))
    return pictogram("bank", outline(spec, q), holes, [], q)


# --------------------------------------------------------------------------- government (dome)

def government(q):
    rx, rz, zc = 0.21, 0.25, 0.53
    a_top = 1.38                                   # dome arc ends where x ~ 0.04
    dome = circle(0, 0, 1, q["circ"] // 2, 0.0, a_top)
    dome = [(rx * x, zc + rz * z) for x, z in dome]
    xl = dome[-1][0]
    spec = [(-0.5, 0.0, 0.006), (0.5, 0.0, 0.006), (0.5, 0.05, 0.004), (0.47, 0.05, 0.0),
            (0.47, 0.31, 0.0), (0.49, 0.31, 0.004), (0.49, 0.35, 0.004), (0.235, 0.35, 0.0),
            (0.235, 0.50, 0.004), (0.25, 0.50, 0.004), (0.25, 0.53, 0.004)]
    spec += [(x, z, 0.0) for x, z in dome]
    spec += [(xl, 0.80, 0.0), (0.06, 0.80, 0.004), (0.06, 0.83, 0.004), (0.013, 0.83, 0.0),
             (0.013, 0.89, 0.006), (-0.013, 0.89, 0.006), (-0.013, 0.83, 0.0), (-0.06, 0.83, 0.004),
             (-0.06, 0.80, 0.004), (-xl, 0.80, 0.0)]
    spec += [(-x, z, 0.0) for x, z in reversed(dome)]
    spec += [(-0.25, 0.53, 0.004), (-0.25, 0.50, 0.004), (-0.235, 0.50, 0.004), (-0.235, 0.35, 0.0),
             (-0.49, 0.35, 0.004), (-0.49, 0.31, 0.004), (-0.47, 0.31, 0.0), (-0.47, 0.05, 0.0),
             (-0.5, 0.05, 0.004)]
    holes = [(rrect(-0.05, 0.065, 0.05, 0.24, 0.008, q), 0.05)]
    for xc in (-0.36, -0.24, -0.12, 0.12, 0.24, 0.36):
        holes.append((rrect(xc - 0.027, 0.12, xc + 0.027, 0.25, 0.006, q), 0.035))
    for xc in (-0.12, 0.0, 0.12):
        holes.append((rrect(xc - 0.02, 0.38, xc + 0.02, 0.47, 0.006, q), 0.035))
    return pictogram("government", outline(spec, q), holes, [], q)


# --------------------------------------------------------------------------- central bank (vault / coin)

def central_bank(q):
    spec = [(-0.5, 0.0, 0.006), (0.5, 0.0, 0.006), (0.5, 0.045, 0.004), (0.46, 0.045, 0.0),
            (0.46, 0.09, 0.004), (0.42, 0.09, 0.0), (0.42, 0.70, 0.0), (0.46, 0.70, 0.004),
            (0.46, 0.76, 0.004), (0.38, 0.76, 0.0), (0.38, 0.80, 0.006), (-0.38, 0.80, 0.006),
            (-0.38, 0.76, 0.0), (-0.46, 0.76, 0.004), (-0.46, 0.70, 0.004), (-0.42, 0.70, 0.0),
            (-0.42, 0.09, 0.0), (-0.46, 0.09, 0.004), (-0.46, 0.045, 0.0), (-0.5, 0.045, 0.004)]
    zc, R = 0.405, 0.225
    door = circle(0, zc, R, q["circ"] + 8)
    rec = 0.07
    # a cash coin (round, square hole) set inside the round vault opening
    coin = circle(0, zc, R - 0.05, q["circ"] + 4)
    sq = rect(-0.052, zc - 0.052, 0.052, zc + 0.052)[::-1]
    y0 = -DEPTH / 2
    return pictogram("central_bank", outline(spec, q), [(door, rec)],
                     [(coin, [sq], y0 + 0.022, y0 + rec + 0.004)], q)


# --------------------------------------------------------------------------- rest of world (ship)

def rest_of_world(q):
    spec = [(-0.42, 0.0, 0.01), (0.32, 0.0, 0.01), (0.50, 0.23, 0.006), (0.43, 0.23, 0.0),
            (0.41, 0.20, 0.0), (0.36, 0.20, 0.0), (0.36, 0.30, 0.004), (0.26, 0.30, 0.0),
            (0.26, 0.40, 0.004), (-0.18, 0.40, 0.004), (-0.18, 0.30, 0.0), (-0.20, 0.30, 0.004),
            (-0.20, 0.20, 0.0), (-0.25, 0.20, 0.0), (-0.25, 0.43, 0.0), (-0.23, 0.43, 0.004),
            (-0.23, 0.47, 0.004), (-0.31, 0.47, 0.0), (-0.33, 0.60, 0.006), (-0.42, 0.60, 0.006),
            (-0.40, 0.47, 0.0), (-0.44, 0.47, 0.004), (-0.44, 0.43, 0.004), (-0.42, 0.43, 0.0),
            (-0.42, 0.20, 0.0), (-0.47, 0.20, 0.004), (-0.47, 0.08, 0.02)]
    holes = [(rrect(-0.40, 0.045, 0.27, 0.08, 0.008, q), 0.03),          # waterline
             (rrect(-0.40, 0.35, -0.27, 0.395, 0.008, q), 0.03)]         # bridge windows
    for xc in (-0.07, 0.04, 0.15):
        holes.append((rrect(xc - 0.012, 0.22, xc + 0.012, 0.38, 0.006, q), 0.03))   # box seams
    holes.append((rrect(0.288, 0.22, 0.312, 0.28, 0.006, q), 0.03))
    return pictogram("rest_of_world", outline(spec, q), holes, [], q, depth=0.36)


BUILDERS = {
    "household": (lambda: household(HERO), "footprint"),
    "firm": (lambda: firm(HERO), "footprint"),
    "bank": (lambda: bank(HERO), "footprint"),
    "government": (lambda: government(HERO), "footprint"),
    "central_bank": (lambda: central_bank(HERO), "footprint"),
    "rest_of_world": (lambda: rest_of_world(HERO), "footprint"),
    "person": (lambda: person(HERO), "height"),
    "person_crowd": (lambda: person(CROWD, True), "height"),
    "firm_crowd": (lambda: firm(CROWD, True), "footprint"),
}

if __name__ == "__main__":
    only = C.arg("--only")
    b = {k: v for k, v in BUILDERS.items() if not only or k in only.split(",")}
    C.build_set(b, OUT, sharp_for={k: 25.0 for k in BUILDERS})

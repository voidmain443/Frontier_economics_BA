"""
build_pieces.py -- style C: abstract board-game pieces.

    blender -b --factory-startup -P tools/blender/styles/build_pieces.py

Turned (lathe) and faceted solids. Every piece except the pawn stands on the same turned
base (diameter 1, with a recessed `shade` ring); each type has its own silhouette plus one
identifying feature:

    person         pawn (ball head on a collar)
    household      gabled house block (the roof notch)
    firm           hexagonal block + tall offset chimney with a dark flue
    bank           four-column temple with a pediment (dark cella and tympanum)
    government     drum + dome + lantern
    central_bank   milled coin stack + an upright cash coin (square hole)
    rest_of_world  globe on a stem with a tilted equator band

Writes styles/C/<name>.glb, person_crowd.glb / firm_crowd.glb (<= 2000 tris), tris.json.
"""

import os
import sys
from math import radians, sin, cos, pi

from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(sys.argv[sys.argv.index("-P") + 1])))
import common as C   # noqa: E402
from common import P, S, MB, circle, rect, axis_matrix   # noqa: E402

OUT = os.path.join(C.HERE, "C")
HERO = dict(segs=48, fine=True)
CROWD = dict(segs=20, fine=False)
ZB = 0.125                       # top of the common base


def base(q, R=0.5):
    """The shared turned base: chamfered disc, a dark ring, a second shallow step."""
    mb = MB()
    if q["fine"]:
        prof = [(0, 0), (R - 0.03, 0), (R, 0.026), (R, 0.062), (R - 0.02, 0.08), (R - 0.055, 0.08),
                (R - 0.055, 0.094), (R - 0.04, 0.10), (R - 0.04, 0.112), (R - 0.06, ZB), (0, ZB)]
        seg_m = [P, P, P, P, P, S, P, P, P, P]
    else:
        prof = [(0, 0), (R - 0.03, 0), (R, 0.03), (R, 0.075), (R - 0.05, 0.08), (R - 0.05, 0.10),
                (R - 0.07, ZB), (0, ZB)]
        seg_m = [P, P, P, P, S, P, P]
    mb.lathe(prof, q["segs"], seg_m=seg_m)
    return mb.to_object("base")


# --------------------------------------------------------------------------- person (pawn)

def person(q):
    mb = MB()
    if q["fine"]:
        prof = [(0, 0), (0.200, 0), (0.215, 0.014), (0.215, 0.05), (0.198, 0.066), (0.182, 0.066),
                (0.182, 0.078), (0.19, 0.084), (0.19, 0.096), (0.168, 0.112)]
        seg_m = [P] * 5 + [S] + [P] * 4
        n_body, n_head = 9, 11
    else:
        prof = [(0, 0), (0.200, 0), (0.215, 0.016), (0.215, 0.06), (0.19, 0.08), (0.19, 0.095),
                (0.168, 0.112)]
        seg_m = [P, P, P, P, S, P]
        n_body, n_head = 4, 6
    for i in range(1, n_body + 1):                  # concave cone of the body
        t = i / n_body
        prof.append((0.068 + 0.092 * (1 - t) ** 1.8, 0.112 + (0.55 - 0.112) * t))
        seg_m.append(P)
    collar = [(0.125, 0.565), (0.13, 0.585), (0.104, 0.60), (0.062, 0.61)]
    prof += collar if q["fine"] else [(0.13, 0.57), (0.12, 0.598), (0.062, 0.61)]
    seg_m += [P] * (len(collar) if q["fine"] else 3)
    zc, rH = 0.765, 0.155
    a0 = radians(-68)
    for i in range(n_head + 1):
        a = a0 + (pi / 2 - a0) * i / n_head
        prof.append((max(0.0, rH * cos(a)), zc + rH * sin(a)))
        seg_m.append(P)
    prof[-1] = (0.0, zc + rH)
    mb.lathe(prof, q["segs"] if q["fine"] else 18, seg_m=seg_m[:len(prof) - 1])
    return [C.join([mb.to_object("pawn")], "person")]


# --------------------------------------------------------------------------- household

def household(q):
    W, D, zw, za = 0.31, 0.26, 0.46, 0.75
    body = MB()
    body.slab([(-W, ZB - 0.01), (W, ZB - 0.01), (W, zw), (0, za), (-W, zw)], [], -D, D, P)
    door = MB()
    door.box(-0.055, 0.055, -D - 0.05, -D + 0.022, ZB - 0.03, 0.32, S)
    o_body = C.part(body, "house", 0.012, 1, cutter=door)
    slope = (za - zw) / W
    ov, t = 0.045, 0.05
    xe = W + ov
    ze = zw - ov * slope
    roof = MB()
    roof.slab([(-xe, ze), (0, za), (xe, ze), (xe, ze + t), (0, za + t), (-xe, ze + t)], [],
              -D - 0.03, D + 0.03, P)
    o_roof = C.part(roof, "roof", 0.008, 1)
    return [C.join([base(q), o_body, o_roof], "household")]


# --------------------------------------------------------------------------- firm

def firm(q):
    hexa = [(0.38 * cos(radians(60 * k)), 0.38 * sin(radians(60 * k))) for k in range(6)]
    blk = MB()
    blk.slab(hexa, [], ZB - 0.01, 0.42, P, axis="Z")
    o_blk = C.part(blk, "hex", 0.016 if q["fine"] else 0.014, 1)
    ch = MB()
    cx, cy = 0.13, 0.11
    seg = 32 if q["fine"] else 12
    prof = [(0.092, 0.41), (0.068, 0.98), (0.082, 0.985), (0.082, 1.035), (0.056, 1.035),
            (0.056, 0.995), (0.0, 0.995)]
    ch.lathe(prof, seg, axis_matrix("Z", (cx, cy, 0)), seg_m=[P, P, P, P, S, S])
    o_ch = ch.to_object("chimney")
    return [C.join([base(q), o_blk, o_ch], "firm")]


# --------------------------------------------------------------------------- bank (temple)

def bank(q):
    pl = MB()
    pl.box(-0.32, 0.32, -0.30, 0.30, ZB - 0.01, 0.165)
    pl.box(-0.29, 0.29, -0.27, 0.27, 0.16, 0.19)
    o_pl = C.part(pl, "plinth", 0.008, 1)
    cols = MB()                                  # four faceted columns with turned caps
    seg = 16 if q["fine"] else 10
    for cx in (-0.2, 0.2):
        for cy in (-0.18, 0.18):
            M = axis_matrix("Z", (cx, cy, 0))
            cols.lathe([(0, 0.185), (0.068, 0.185), (0.068, 0.205), (0.056, 0.215), (0.049, 0.50),
                        (0.07, 0.525), (0.07, 0.54), (0, 0.54)], seg, M, phase=pi / seg)
    o_cols = cols.to_object("columns")
    cella = MB()                                 # dark interior the columns stand against
    cella.box(-0.16, 0.16, -0.12, 0.2, 0.185, 0.54, S)
    o_cella = cella.to_object("cella")
    ent = MB()
    ent.box(-0.29, 0.29, -0.27, 0.27, 0.535, 0.60)
    o_ent = C.part(ent, "entablature", 0.008, 1)
    ped = MB()
    ped.slab([(-0.31, 0.595), (0.31, 0.595), (0.0, 0.74)], [], -0.29, 0.29, P)
    tym = MB()
    tym.slab([(-0.22, 0.618), (0.22, 0.618), (0.0, 0.72)], [], -0.33, -0.272, S)
    o_ped = C.part(ped, "pediment", 0.008, 1, cutter=tym)
    return [C.join([base(q), o_pl, o_cols, o_cella, o_ent, o_ped], "bank")]


# --------------------------------------------------------------------------- government (dome)

def government(q):
    mb = MB()
    prof = [(0, ZB - 0.01), (0.34, ZB - 0.01), (0.34, 0.15), (0.305, 0.165), (0.305, 0.205),
            (0.285, 0.21), (0.285, 0.35), (0.305, 0.355), (0.305, 0.395), (0.325, 0.40),
            (0.325, 0.43), (0.29, 0.43)]
    seg_m = [P, P, P, P, P, S, P, P, P, P, P]
    zc, R = 0.43, 0.29
    for i in range(1, 11):
        a = radians(78) * i / 10
        prof.append((R * cos(a), zc + R * sin(a)))
        seg_m.append(P)
    zt = prof[-1][1]
    prof += [(0.06, zt + 0.06), (0.078, zt + 0.065), (0.078, zt + 0.082), (0.03, zt + 0.09)]
    seg_m += [P, P, P, P]
    zf, rf = zt + 0.115, 0.032
    for i in range(1, 8):
        a = radians(-50) + radians(140) * i / 7
        prof.append((max(0.0, rf * cos(a)), zf + rf * sin(a)))
        seg_m.append(P)
    prof[-1] = (0.0, zf + rf)
    mb.lathe(prof, q["segs"], seg_m=seg_m)
    return [C.join([base(q), mb.to_object("dome")], "government")]


# --------------------------------------------------------------------------- central bank (coins)

def central_bank(q):
    n = 44
    stack, core = MB(), MB()
    milled = [((0.37 if k % 2 == 0 else 0.356) * cos(pi * k / n),
               (0.37 if k % 2 == 0 else 0.356) * sin(pi * k / n)) for k in range(2 * n)]
    z, th, gap = ZB - 0.005, 0.055, 0.009
    for k in range(3):
        stack.slab(milled, [], z, z + th, P, axis="Z")
        z += th + gap
    ztop = z - gap
    core.lathe([(0, ZB - 0.01), (0.335, ZB - 0.01), (0.335, ztop - 0.01), (0, ztop - 0.01)], 48, m=S)
    o_stack = stack.to_object("stack")
    o_core = core.to_object("core")
    # upright cash coin: disc with a square hole, raised rims, sunk a little into the stack
    Rc, hs = 0.29, 0.07
    zc = ztop - 0.035 + Rc
    coin = MB()
    sq = rect(-hs, zc - hs, hs, zc + hs)[::-1]
    coin.slab(circle(0, zc, Rc - 0.004, 72), [sq], -0.032, 0.032, P)
    rims = MB()
    rims.slab(circle(0, zc, Rc, 72), [circle(0, zc, Rc - 0.04, 72)[::-1]], -0.045, 0.045, P)
    rims.slab(rect(-hs - 0.03, zc - hs - 0.03, hs + 0.03, zc + hs + 0.03),
              [sq], -0.045, 0.045, P)
    o_coin = C.part(coin, "coin", 0.006, 1)
    o_rims = C.part(rims, "rims", 0.008, 1)
    return [C.join([base(q), o_core, o_stack, o_coin, o_rims], "central_bank")]


# --------------------------------------------------------------------------- rest of world (globe)

def rest_of_world(q):
    st = MB()
    st.lathe([(0, ZB - 0.01), (0.11, ZB - 0.01), (0.10, ZB + 0.02), (0.055, ZB + 0.05),
              (0.045, 0.21), (0.07, 0.235), (0.0, 0.25)], 32)
    o_st = st.to_object("stem")
    R, zc = 0.32, 0.235 + 0.305
    sp = MB()
    prof = [(0, zc - R)]
    for i in range(1, 24):
        a = -pi / 2 + pi * i / 24
        prof.append((R * cos(a), zc + R * sin(a)))
    prof.append((0, zc + R))
    sp.lathe(prof, 48)
    o_sp = sp.to_object("sphere")
    tilt = Matrix.Translation((0, 0, zc)) @ Matrix.Rotation(radians(23.4), 4, "X") @ \
        Matrix.Rotation(radians(-20), 4, "Y")
    band = MB()
    band.torus(R + 0.004, 0.02, 64, 10, M=tilt, m=S)
    pins = MB()
    pins.lathe([(0, R - 0.02), (0.022, R - 0.02), (0.022, R + 0.035), (0.0, R + 0.05)], 16, M=tilt)
    pins.lathe([(0, -R + 0.02), (0.022, -R + 0.02), (0.022, -R - 0.03), (0.0, -R - 0.04)], 16, M=tilt)
    return [C.join([base(q), o_st, o_sp, band.to_object("band"), pins.to_object("pins")],
                   "rest_of_world")]


BUILDERS = {
    "household": (lambda: household(HERO), "footprint"),
    "firm": (lambda: firm(HERO), "footprint"),
    "bank": (lambda: bank(HERO), "footprint"),
    "government": (lambda: government(HERO), "footprint"),
    "central_bank": (lambda: central_bank(HERO), "footprint"),
    "rest_of_world": (lambda: rest_of_world(HERO), "footprint"),
    "person": (lambda: person(HERO), "height"),
    "person_crowd": (lambda: person(CROWD), "height"),
    "firm_crowd": (lambda: firm(CROWD), "footprint"),
}

if __name__ == "__main__":
    only = C.arg("--only")
    b = {k: v for k, v in BUILDERS.items() if not only or k in only.split(",")}
    C.build_set(b, OUT, sharp_for={"bank": 20.0})

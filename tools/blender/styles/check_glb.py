"""
check_glb.py -- verifies the GLB contract and counts triangles (system Python, no deps).

    python3 tools/blender/styles/check_glb.py [files...]

Default: styles/A/*.glb, styles/B/*.glb, styles/C/*.glb. Checks: one mesh node; attributes
POSITION + NORMAL only; indexed triangles; materials named plaster / shade, one primitive
each; base at y = 0; centred on x = z = 0; footprint max(X, Z) == 1 (person*: height == 1);
no cameras, lights, skins, animations, textures.
"""

import glob
import json
import os
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def load(path):
    with open(path, "rb") as fh:
        data = fh.read()
    magic, ver, length = struct.unpack_from("<4sII", data, 0)
    assert magic == b"glTF" and ver == 2, "not a glTF 2 binary"
    clen, ctype = struct.unpack_from("<I4s", data, 12)
    assert ctype == b"JSON"
    return json.loads(data[20:20 + clen])


def check(path):
    g = load(path)
    name = os.path.basename(path)[:-4]
    errs = []
    for k in ("cameras", "skins", "animations", "textures", "images", "samplers"):
        if g.get(k):
            errs.append("has " + k)
    if any("KHR_lights_punctual" in json.dumps(n) for n in g.get("nodes", [])):
        errs.append("has lights")
    mesh_nodes = [n for n in g["nodes"] if "mesh" in n]
    if len(mesh_nodes) != 1:
        errs.append("%d mesh nodes" % len(mesh_nodes))
    mats = [m.get("name") for m in g.get("materials", [])]
    tris, lo, hi = 0, [1e9] * 3, [-1e9] * 3
    seen = []
    for mesh in g["meshes"]:
        for p in mesh["primitives"]:
            attrs = set(p["attributes"])
            if attrs != {"POSITION", "NORMAL"}:
                errs.append("attributes %s" % sorted(attrs))
            if p.get("mode", 4) != 4 or "indices" not in p:
                errs.append("not indexed triangles")
            tris += g["accessors"][p["indices"]]["count"] // 3
            acc = g["accessors"][p["attributes"]["POSITION"]]
            lo = [min(a, b) for a, b in zip(lo, acc["min"])]
            hi = [max(a, b) for a, b in zip(hi, acc["max"])]
            seen.append(mats[p["material"]] if "material" in p else None)
    if sorted(set(seen)) != sorted(seen) or not set(seen) <= {"plaster", "shade"}:
        errs.append("materials %s" % seen)
    n = mesh_nodes[0] if mesh_nodes else {}
    if any(k in n for k in ("translation", "rotation", "scale", "matrix")):
        errs.append("node transform %s" % {k: n[k] for k in n if k != "mesh"})
    ex, ey, ez = (hi[i] - lo[i] for i in range(3))
    if abs(lo[1]) > 1e-4:
        errs.append("base y=%.4f" % lo[1])
    if abs(lo[0] + hi[0]) > 1e-3 or abs(lo[2] + hi[2]) > 1e-3:
        errs.append("not centred")
    if name.startswith("person"):
        if abs(ey - 1) > 1e-3:
            errs.append("height %.4f" % ey)
    elif abs(max(ex, ez) - 1) > 1e-3:
        errs.append("footprint %.4f" % max(ex, ez))
    return name, tris, (ex, ey, ez), seen, errs


if __name__ == "__main__":
    files = sys.argv[1:] or sorted(glob.glob(os.path.join(HERE, "[ABC]", "*.glb")))
    bad = 0
    for f in files:
        name, tris, ext, seen, errs = check(f)
        bad += bool(errs)
        print("%-3s %-15s tris=%5d  ext x=%.3f y=%.3f z=%.3f  %-17s %s" % (
            os.path.basename(os.path.dirname(f)), name, tris, *ext, "+".join(seen),
            "OK" if not errs else "FAIL: " + "; ".join(errs)))
    sys.exit(1 if bad else 0)

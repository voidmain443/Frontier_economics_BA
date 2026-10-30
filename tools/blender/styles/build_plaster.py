"""
build_plaster.py -- style A (the current plaster maquettes): crowd variants only.

    blender -b --factory-startup -P tools/blender/styles/build_plaster.py

Reads prototype/traditional/assets/agents/{person,firm}.glb (read-only) and writes
styles/A/person_crowd.glb (collapse-decimated to <= 2000 tris) and styles/A/firm_crowd.glb
(the current firm is already 1218 tris, so it is re-exported unchanged).
The hero models of style A are the current assets themselves; nothing is copied.
"""

import bpy
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(sys.argv[sys.argv.index("-P") + 1])))
import common as C   # noqa: E402

OUT = os.path.join(C.HERE, "A")
BUDGET = 2000


def import_asset(name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(C.ASSET_DIR, name + ".glb"))
    new = [o for o in bpy.data.objects if o not in before]
    ob = next(o for o in new if o.type == "MESH")
    ob.data.transform(ob.matrix_world)
    for o in new:
        if o is not ob:
            bpy.data.objects.remove(o)
    ob.matrix_world.identity()
    plaster, shade = C.export_materials()
    me = ob.data
    for i, m in enumerate(me.materials):
        me.materials[i] = plaster if (m is None or m.name.split(".")[0] == "plaster") else shade
    return ob


def main():
    os.makedirs(OUT, exist_ok=True)
    tris = {}
    for name, src, mode, sharp in (("person_crowd", "person", "height", 180.0),
                                   ("firm_crowd", "firm", "footprint", 30.0)):
        C.reset_scene()
        ob = import_asset(src)
        t0 = C.tri_count(ob)
        if t0 > BUDGET:
            mod = ob.modifiers.new("decimate", "DECIMATE")
            mod.decimate_type = "COLLAPSE"
            mod.ratio = (BUDGET * 0.92) / t0
            C.apply_modifiers(ob)
        C.normalize([ob], mode)
        ob.name = name
        C.finish(ob, sharp)
        C.export_glb([ob], os.path.join(OUT, name + ".glb"))
        tris[name] = C.tri_count(ob)
        print("[styles] A %-14s %5d -> %5d tris" % (name, t0, tris[name]))
    with open(os.path.join(OUT, "tris.json"), "w") as fh:
        json.dump(tris, fh, indent=1)


main()

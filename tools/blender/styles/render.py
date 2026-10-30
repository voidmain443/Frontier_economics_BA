"""
render.py -- renders one style's sheet, crowd shot and close-up.

    blender -b --factory-startup -P tools/blender/styles/render.py -- --style B
    blender -b --factory-startup -P tools/blender/styles/render.py -- --style B --only sheet

Sources: style A reads the current assets (read-only) from prototype/traditional/assets/agents
plus its crowd variants from styles/A; styles B and C read styles/<B|C>/*.glb.
Writes styles/<S>-crowd.png, styles/<S>-close.png and styles/_raw/<S>-sheet.png (+ .json label
anchors); compose.py adds the labels and builds compare.png.

Light, as on the site: one key straight overhead with soft contact shadows, a pale sky,
and a dim fill from the viewer; ground #E8ECE6, plaster #F2F1EB, shade = the site's SHADE.
Calibrated so an unshadowed up-facing surface shows exactly its albedo.
"""

import bpy
import bmesh
import os
import sys
import json
import random
import time
from math import radians, sin, cos, tan, pi, sqrt
from mathutils import Vector, Matrix

sys.path.insert(0, os.path.dirname(os.path.abspath(sys.argv[sys.argv.index("-P") + 1])))
import common as C   # noqa: E402

STYLE = C.arg("--style", "A")
ONLY = C.arg("--only", "sheet,crowd,close").split(",")
AZ = radians(35)


def src(name):
    if STYLE == "A" and not name.endswith("_crowd"):
        return os.path.join(C.ASSET_DIR, name + ".glb")
    return os.path.join(C.HERE, STYLE, name + ".glb")


# --------------------------------------------------------------------------- stage

def setup_stage(el):
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    ee = sc.eevee
    ee.taa_render_samples = 64
    for attr, val in (("use_shadows", True), ("use_raytracing", True), ("use_fast_gi", True),
                      ("fast_gi_method", "GLOBAL_ILLUMINATION"), ("fast_gi_distance", 0.8),
                      ("shadow_ray_count", 2), ("shadow_step_count", 8)):
        try:
            setattr(ee, attr, val)
        except Exception as e:
            print("[render] eevee.%s: %s" % (attr, e))
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.view_settings.exposure = 0.0
    sc.render.film_transparent = False
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"

    world = bpy.data.worlds.get("paper") or bpy.data.worlds.new("paper")
    sc.world = world
    if world.node_tree is None:
        world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.96, 0.98, 1.0, 1.0)
    bg.inputs[1].default_value = 0.36                       # sky: 0.36 of up-facing light

    gm = C.make_material("r_ground", C.hex_lin(C.PAPER), 1.0, 0.0)
    me = bpy.data.meshes.new("ground")
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=400)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(gm)
    g = bpy.data.objects.new("ground", me)
    sc.collection.objects.link(g)

    key = bpy.data.lights.new("key", "SUN")                 # straight overhead
    key.energy = 0.56 * pi                                  # key: 0.56
    key.angle = radians(22)
    if hasattr(key, "use_shadow_jitter"):
        key.use_shadow_jitter = True
    ko = bpy.data.objects.new("key", key)
    ko.rotation_euler = (0, 0, 0)
    sc.collection.objects.link(ko)

    fill = bpy.data.lights.new("fill", "SUN")               # dim, from the viewer, no shadow
    fill.energy = 0.08 * pi / max(0.2, sin(el))            # fill: 0.08
    fill.use_shadow = False
    fo = bpy.data.objects.new("fill", fill)
    view = Vector((-sin(AZ) * cos(el), cos(AZ) * cos(el), -sin(el)))
    fo.rotation_euler = view.to_track_quat("-Z", "Y").to_euler()
    sc.collection.objects.link(fo)


def view_basis(az, el):
    dirv = Vector((sin(az) * cos(el), -cos(az) * cos(el), sin(el)))   # towards the camera
    fwd = -dirv
    q = fwd.to_track_quat("-Z", "Y")
    return dirv, fwd, q, q @ Vector((1, 0, 0)), q @ Vector((0, 1, 0))


def camera_ortho(points, az, el, res, margin=1.06):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = res
    dirv, fwd, q, right, up = view_basis(az, el)
    xs = [Vector(p).dot(right) for p in points]
    ys = [Vector(p).dot(up) for p in points]
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    aspect = res[0] / res[1]
    cd = bpy.data.cameras.new("cam")
    cd.type = "ORTHO"
    cd.sensor_fit = "HORIZONTAL"
    cd.ortho_scale = max(w, h * aspect) * margin
    cd.clip_start, cd.clip_end = 0.1, 400
    cam = bpy.data.objects.new("cam", cd)
    sc.collection.objects.link(cam)
    sc.camera = cam
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    centre_depth = sum(Vector(p).dot(fwd) for p in points) / len(points)
    cam.location = right * cx + up * cy + fwd * centre_depth + dirv * 60
    cam.rotation_euler = q.to_euler()
    return cam


def camera_persp(points, az, el, lens, res, margin=1.08):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = res
    dirv, fwd, q, right, up = view_basis(az, el)
    cd = bpy.data.cameras.new("cam")
    cd.lens = lens
    cd.sensor_fit = "HORIZONTAL"
    cd.sensor_width = 36
    cd.clip_start, cd.clip_end = 0.1, 400
    cam = bpy.data.objects.new("cam", cd)
    sc.collection.objects.link(cam)
    sc.camera = cam
    lo = Vector([min(p[i] for p in points) for i in range(3)])
    hi = Vector([max(p[i] for p in points) for i in range(3)])
    target = (lo + hi) / 2
    tx = 18.0 / lens
    ty = tx * res[1] / res[0]

    def fits(D):
        Cm = target + dirv * D
        for p in points:
            d = Vector(p) - Cm
            z = d.dot(fwd)
            if z <= 0 or abs(d.dot(right)) / z > tx / margin or abs(d.dot(up)) / z > ty / margin:
                return False
        return True
    a, b = 0.1, 300.0
    for _ in range(60):
        mid = (a + b) / 2
        a, b = (a, mid) if fits(mid) else (mid, b)
    Cm = target + dirv * b
    xs, ys = [], []
    for p in points:
        d = Vector(p) - Cm
        z = d.dot(fwd)
        xs.append(d.dot(right) / z)
        ys.append(d.dot(up) / z)
    cd.shift_x = ((max(xs) + min(xs)) / 2) / (2 * tx)
    cd.shift_y = ((max(ys) + min(ys)) / 2) / (2 * tx)
    cam.location = Cm
    cam.rotation_euler = q.to_euler()
    return cam


def to_px(cam, co):
    from bpy_extras.object_utils import world_to_camera_view
    sc = bpy.context.scene
    v = world_to_camera_view(sc, cam, Vector(co))
    return (v.x * sc.render.resolution_x, (1 - v.y) * sc.render.resolution_y)


# --------------------------------------------------------------------------- models

_mesh_cache = {}


def load_mesh(name):
    """Import a GLB once; return a mesh datablock (world transform baked, render materials)."""
    if name in _mesh_cache:
        return _mesh_cache[name]
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=src(name))
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    assert len(meshes) == 1, (name, [o.name for o in new])
    ob = meshes[0]
    me = ob.data
    me.transform(ob.matrix_world)
    plaster, shade = C.render_materials()
    for i, m in enumerate(me.materials):
        base = m.name.split(".")[0] if m else "plaster"
        me.materials[i] = plaster if base == "plaster" else shade
    for o in new:
        bpy.data.objects.remove(o)
    me.calc_loop_triangles()
    _mesh_cache[name] = me
    return me


def place(name, loc=(0, 0, 0), yaw=0.0, scale=1.0):
    me = load_mesh(name)
    ob = bpy.data.objects.new(name, me)
    ob.location = loc
    ob.rotation_euler = (0, 0, yaw)
    ob.scale = (scale, scale, scale)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def world_corners(ob):
    return [ob.matrix_world @ Vector(c) for c in ob.bound_box]


def render_to(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.context.scene.render.filepath = path
    t = time.time()
    bpy.ops.render.render(write_still=True)
    print("[render] %s in %.1fs" % (path, time.time() - t))


# --------------------------------------------------------------------------- shots

def fresh():
    C.reset_scene()
    _mesh_cache.clear()


def shot_sheet():
    fresh()
    el = radians(24)
    setup_stage(el)
    right = Vector((cos(AZ), sin(AZ), 0))
    toward = Vector((sin(AZ), -cos(AZ), 0))
    gap = 1.62
    obs, pts = [], []
    for i, n in enumerate(C.AGENTS):
        c = right * (i - (len(C.AGENTS) - 1) / 2) * gap
        ob = place(n, c)
        obs.append(ob)
        bpy.context.view_layer.update()
        pts += world_corners(ob)
        pts.append(c + toward * 0.95)                # room for the label under each model
    cam = camera_ortho(pts, AZ, el, (3200, 720), margin=1.04)
    bpy.context.view_layer.update()
    anchors = []
    for n, ob in zip(C.AGENTS, obs):
        px = [to_px(cam, p) for p in world_corners(ob)]
        cx = to_px(cam, ob.location)[0]
        anchors.append({"name": n, "x": cx, "bottom": max(p[1] for p in px)})
    out = os.path.join(C.RAW_DIR, STYLE + "-sheet.png")
    render_to(out)
    with open(out[:-4] + ".json", "w") as fh:
        json.dump({"size": [3200, 720], "labels": anchors}, fh, indent=1)


def scatter(seed=11):
    """120 people in loose groups and 40 firms over a 17 x 14 floor (same layout for every style)."""
    rnd = random.Random(seed)
    W, D = 8.5, 7.0
    people, firms = [], []

    def free(p, r, pool):
        return all((p - q).length >= r for q, _ in pool)
    while len(firms) < 40:
        p = Vector((rnd.uniform(-W, W), rnd.uniform(-D, D), 0))
        if free(p, 1.9, firms):
            firms.append((p, radians(rnd.uniform(-20, 20))))
    centres = [Vector((rnd.uniform(-W + 2, W - 2), rnd.uniform(-D + 1.5, D - 1.5), 0)) for _ in range(9)]
    tries = 0
    while len(people) < 120 and tries < 200000:
        tries += 1
        c = rnd.choice(centres) if rnd.random() < 0.75 else Vector((rnd.uniform(-W, W), rnd.uniform(-D, D), 0))
        p = c + Vector((rnd.gauss(0, 1.5), rnd.gauss(0, 1.1), 0))
        if abs(p.x) > W or abs(p.y) > D:
            continue
        if free(p, 0.5, people) and all((p - q).length >= 0.95 for q, _ in firms):
            people.append((p, radians(rnd.uniform(-30, 30))))
    # turn the floor so its long side runs across the frame
    R = Matrix.Rotation(AZ, 3, "Z")
    return [(R @ p, y) for p, y in people], [(R @ p, y) for p, y in firms]


def shot_crowd():
    fresh()
    el = radians(28)
    setup_stage(el)
    people, firms = scatter()
    pts = []
    for p, yaw in people:
        place("person_crowd", p, yaw)
    for p, yaw in firms:
        place("firm_crowd", p, yaw)
    for x in (-9.0, 9.0):
        for y in (-7.5, 7.5):
            c = Matrix.Rotation(AZ, 3, "Z") @ Vector((x, y, 0))
            pts += [c, c + Vector((0, 0, 1.1))]
    res = (1800, 1000)
    lens = 50
    cam = camera_persp(pts, AZ, el, lens, res, margin=1.02)
    bpy.context.view_layer.update()
    # model size relative to frame width, at the centre of the floor
    R = Matrix.Rotation(AZ, 3, "Z")
    pct = lambda q: 100 / (2 * (cam.location - R @ Vector(q)).length * 18 / lens)
    print("[render] crowd: firm footprint = %.1f%% of frame width at centre (front %.1f%%, back %.1f%%)" % (
        pct((0, 0, 0.5)), pct((0, -7, 0.5)), pct((0, 7, 0.5))))
    render_to(os.path.join(C.HERE, STYLE + "-crowd.png"))


def shot_close():
    fresh()
    el = radians(20)
    setup_stage(el)
    right = Vector((cos(AZ), sin(AZ), 0))
    pts = []
    for n, s in (("household", -0.66), ("bank", 0.66)):
        ob = place(n, right * s)
        bpy.context.view_layer.update()
        pts += world_corners(ob)
    camera_persp(pts, AZ, el, 85, (1800, 1100), margin=1.12)
    render_to(os.path.join(C.HERE, STYLE + "-close.png"))


t0 = time.time()
if "sheet" in ONLY:
    shot_sheet()
if "crowd" in ONLY:
    shot_crowd()
if "close" in ONLY:
    shot_close()
print("[render] style %s done in %.1fs" % (STYLE, time.time() - t0))

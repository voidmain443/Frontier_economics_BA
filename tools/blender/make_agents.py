"""
make_agents.py -- white "architectural maquette" agents for the WebGPU economics textbook.

Builds nine small study models entirely from code (no downloads), exports one GLB
each, and renders preview PNGs plus a contact sheet.

    Blender -b --factory-startup -P tools/blender/make_agents.py
    Blender -b --factory-startup -P tools/blender/make_agents.py -- --only firm,bank
    Blender -b --factory-startup -P tools/blender/make_agents.py -- --no-previews

Output contract (read by the hand-written WebGPU loader):
  * GLB, +Y up, metres; POSITION + NORMAL + indices only (no UVs, colours, textures,
    animations, cameras or lights).
  * Footprint: max(X extent, Z extent) == 1.0, base at y = 0, centred on x = z = 0.
    `person` is 1.0 tall instead; `valve` is 1.0 long along X.
  * Materials named exactly `plaster` (main white mass) and `shade` (recesses).
  * One mesh node per asset with one primitive per material. `valve` has two nodes,
    `body` and `wheel`; the wheel is centred on the vertical axis x = z = 0, so it
    can spin about +Y whether or not the loader applies node transforms.
  * Front faces point to glTF +Z (Blender -Y).

Modelling is done in Blender's Z-up frame: X = width, Y = depth (front = -Y), Z = up.
"""

import bpy
import bmesh
import os
import sys
import time
from math import radians, sin, cos, tan, pi, asin, sqrt, atan2
from mathutils import Vector, Matrix


# --------------------------------------------------------------------------- paths

def _script_dir():
    p = globals().get("__file__")
    if not p:
        for flag in ("-P", "--python"):
            if flag in sys.argv:
                p = sys.argv[sys.argv.index(flag) + 1]
                break
    return os.path.dirname(os.path.abspath(p))


HERE = _script_dir()
REPO = os.path.normpath(os.path.join(HERE, "..", ".."))
OUT_DIR = os.path.join(REPO, "prototype", "traditional", "assets", "agents")
PREVIEW_DIR = os.path.join(HERE, "previews")

ORDER = ["household", "firm", "government", "central_bank", "bank",
         "rest_of_world", "person", "valve", "pivot",
         "market_hall", "exchange", "globe", "containers", "power_plant",
         "farm", "city", "coins", "university", "crate"]

P, S = 0, 1                 # material slots: plaster, shade
BEVEL = 0.009               # main masses, ~1% of the unit footprint
BEVEL_MID = 0.006
BEVEL_FINE = 0.0035
SHARP_ANGLE = 30.0          # auto-smooth threshold (degrees)


# --------------------------------------------------------------------------- materials

def make_material(name, rgb, rough):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1.0)
    m.roughness = rough
    m.metallic = 0.0
    if m.node_tree is None:
        try:
            m.use_nodes = True
        except Exception:
            pass
    if m.node_tree is not None:
        for n in m.node_tree.nodes:
            if n.type == "BSDF_PRINCIPLED":
                n.inputs["Base Color"].default_value = (*rgb, 1.0)
                n.inputs["Roughness"].default_value = rough
                n.inputs["Metallic"].default_value = 0.0
    return m


def materials():
    return (make_material("plaster", (0.86, 0.85, 0.82), 0.75),
            make_material("shade", (0.075, 0.08, 0.095), 0.8))


# --------------------------------------------------------------------------- mesh builder

def axis_matrix(axis="Z", origin=(0, 0, 0)):
    """Matrix that maps local +Z (the lathe / extrusion axis) onto `axis`."""
    if axis == "Z":
        R = Matrix.Identity(4)
    elif axis == "X":
        R = Matrix.Rotation(pi / 2, 4, "Y")      # (0,0,h) -> (h,0,0)
    elif axis == "Y":
        R = Matrix.Rotation(-pi / 2, 4, "X")     # (0,0,h) -> (0,h,0)
    else:
        raise ValueError(axis)
    return Matrix.Translation(Vector(origin)) @ R


class MB:
    """Small bmesh builder; every primitive is a closed shell."""

    def __init__(self):
        self.bm = bmesh.new()

    def v(self, co):
        return self.bm.verts.new(co)

    def f(self, verts, m):
        face = self.bm.faces.new(verts)
        face.material_index = m
        return face

    # axis-aligned box from min/max, optionally transformed
    def box(self, x0, x1, y0, y1, z0, z1, m=P, M=None):
        vs = []
        for z in (z0, z1):
            for y in (y0, y1):
                for x in (x0, x1):
                    co = Vector((x, y, z))
                    vs.append(self.v(M @ co if M is not None else co))
        V = lambda xi, yi, zi: vs[zi * 4 + yi * 2 + xi]
        for quad in ((V(0, 0, 0), V(0, 1, 0), V(1, 1, 0), V(1, 0, 0)),
                     (V(0, 0, 1), V(1, 0, 1), V(1, 1, 1), V(0, 1, 1)),
                     (V(0, 0, 0), V(1, 0, 0), V(1, 0, 1), V(0, 0, 1)),
                     (V(0, 1, 0), V(0, 1, 1), V(1, 1, 1), V(1, 1, 0)),
                     (V(0, 0, 0), V(0, 0, 1), V(0, 1, 1), V(0, 1, 0)),
                     (V(1, 0, 0), V(1, 1, 0), V(1, 1, 1), V(1, 0, 1))):
            self.f(quad, m)

    # polygon `pts` extruded between a0 and a1 along an axis.
    # axis 'Y': pts are (x, z); 'X': (y, z); 'Z': (x, y)
    def prism(self, pts, axis, a0, a1, m=P, side_m=None, M=None):
        def to3(p, a):
            u, w = p
            co = {"Y": (u, a, w), "X": (a, u, w), "Z": (u, w, a)}[axis]
            co = Vector(co)
            return M @ co if M is not None else co
        b = [self.v(to3(p, a0)) for p in pts]
        t = [self.v(to3(p, a1)) for p in pts]
        self.f(b, m)
        self.f(t[::-1], m)
        n = len(pts)
        for i in range(n):
            j = (i + 1) % n
            self.f([b[i], b[j], t[j], t[i]], side_m[i] if side_m else m)

    # surface of revolution around local Z; prof = [(r, h), ...]
    def lathe(self, prof, segs=32, M=None, m=P, seg_m=None, closed=False, phase=0.0):
        M = M if M is not None else Matrix.Identity(4)
        rings = []
        for r, h in prof:
            if r <= 1e-9:
                rings.append([self.v(M @ Vector((0, 0, h)))])
            else:
                ring = []
                for i in range(segs):
                    a = 2 * pi * i / segs + phase
                    ring.append(self.v(M @ Vector((r * cos(a), r * sin(a), h))))
                rings.append(ring)
        nseg = len(prof) if closed else len(prof) - 1
        for k in range(nseg):
            a, b = rings[k], rings[(k + 1) % len(rings)]
            mk = seg_m[k] if seg_m else m
            if len(a) == 1 and len(b) == 1:
                continue
            for i in range(segs):
                j = (i + 1) % segs
                if len(a) == 1:
                    self.f([a[0], b[j], b[i]], mk)
                elif len(b) == 1:
                    self.f([a[i], a[j], b[0]], mk)
                else:
                    self.f([a[i], a[j], b[j], b[i]], mk)
        if not closed:
            if len(rings[0]) > 1:
                self.f(rings[0][::-1], seg_m[0] if seg_m else m)
            if len(rings[-1]) > 1:
                self.f(rings[-1], seg_m[-1] if seg_m else m)

    def cylinder(self, r, z0, z1, x=0.0, y=0.0, segs=32, m=P, axis="Z", r1=None):
        """Straight (or tapered) cylinder along an axis, from a0 to a1 on that axis."""
        r1 = r if r1 is None else r1
        org = {"Z": (x, y, 0), "X": (0, x, y), "Y": (x, 0, y)}[axis]
        self.lathe([(r, z0), (r1, z1)], segs, axis_matrix(axis, org), m)

    def rod(self, a, b, r, segs=12, m=P):
        a, b = Vector(a), Vector(b)
        d = b - a
        q = d.to_track_quat("Z", "Y")
        M = Matrix.Translation(a) @ q.to_matrix().to_4x4()
        self.lathe([(r, 0.0), (r, d.length)], segs, M, m)

    def torus(self, R, r, segs=32, tube=10, M=None, m=P):
        M = M if M is not None else Matrix.Identity(4)
        grid = []
        for i in range(segs):
            u = 2 * pi * i / segs
            row = []
            for k in range(tube):
                w = 2 * pi * k / tube
                rr = R + r * cos(w)
                row.append(self.v(M @ Vector((rr * cos(u), rr * sin(u), r * sin(w)))))
            grid.append(row)
        for i in range(segs):
            for k in range(tube):
                i2, k2 = (i + 1) % segs, (k + 1) % tube
                self.f([grid[i][k], grid[i2][k], grid[i2][k2], grid[i][k2]], m)

    def to_object(self, name):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces[:])
        me = bpy.data.meshes.new(name)
        self.bm.to_mesh(me)
        self.bm.free()
        plaster, shade = materials()
        me.materials.append(plaster)
        me.materials.append(shade)
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        return ob


# --------------------------------------------------------------------------- mesh operations

def apply_modifiers(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    bpy.data.meshes.remove(old)


def cut(ob, cutter):
    """Boolean difference; the cutter's faces keep the cutter's material."""
    c = cutter.to_object(ob.name + "_cutter")
    mod = ob.modifiers.new("cut", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.solver = "EXACT"
    mod.material_mode = "TRANSFER"
    mod.object = c
    apply_modifiers(ob)
    me = c.data
    bpy.data.objects.remove(c)
    bpy.data.meshes.remove(me)
    return ob


def bevel(ob, width=BEVEL, angle=SHARP_ANGLE):
    mod = ob.modifiers.new("bevel", "BEVEL")
    mod.width = width
    mod.segments = 1
    mod.limit_method = "ANGLE"
    mod.angle_limit = radians(angle)
    mod.use_clamp_overlap = True
    mod.harden_normals = False
    apply_modifiers(ob)
    return ob


def part(mb, name, bevel_w=BEVEL, cutter=None):
    ob = mb.to_object(name)
    if cutter is not None:
        cut(ob, cutter)
    if bevel_w:
        bevel(ob, bevel_w)
    return ob


def join(obs, name):
    bm = bmesh.new()
    for ob in obs:
        bm.from_mesh(ob.data)          # all parts are built in world space
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    plaster, shade = materials()
    me.materials.append(plaster)
    me.materials.append(shade)
    for ob in obs:
        old = ob.data
        bpy.data.objects.remove(ob)
        if old.users == 0:
            bpy.data.meshes.remove(old)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def bbox(obs):
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    for ob in obs:
        for v in ob.data.vertices:
            for i in range(3):
                lo[i] = min(lo[i], v.co[i])
                hi[i] = max(hi[i], v.co[i])
    return lo, hi


def normalize(obs, mode="footprint"):
    lo, hi = bbox(obs)
    d = hi - lo
    s = {"footprint": 1.0 / max(d.x, d.y), "height": 1.0 / d.z, "length_x": 1.0 / d.x}[mode]
    T = Matrix.Diagonal((s, s, s, 1.0)) @ Matrix.Translation(
        (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z))
    for ob in obs:
        ob.data.transform(T)
        ob.data.update()
    return s


def finish(ob, sharp=SHARP_ANGLE):
    me = ob.data
    me.name = ob.name                      # glTF mesh name == node name
    for uv in list(me.uv_layers):
        me.uv_layers.remove(uv)
    for ca in list(me.color_attributes):
        me.color_attributes.remove(ca)
    # drop unused material slots so the GLB lists only what it uses
    used = {p.material_index for p in me.polygons}
    if used == {0} and len(me.materials) > 1:
        me.materials.pop(index=1)
    me.shade_smooth()
    me.set_sharp_from_angle(angle=radians(sharp))
    me.validate()
    me.update()


def tri_count(ob):
    me = ob.data
    me.calc_loop_triangles()
    return len(me.loop_triangles)


# --------------------------------------------------------------------------- assets

def build_household():
    W, D, Hw, pitch = 0.56, 0.64, 0.38, radians(40)
    hx, hy = W / 2, D / 2
    zr = Hw + hx * tan(pitch)                       # gable apex (roof underside)

    walls = MB()
    walls.prism([(-hx, 0), (hx, 0), (hx, Hw), (0, zr), (-hx, Hw)], "Y", -hy, hy)
    holes = MB()
    yf, dep = -hy, 0.024
    holes.box(-0.056, 0.056, yf - 0.05, yf + dep, -0.05, 0.25, S)               # door
    for sx in (-1, 1):                                                           # windows
        holes.box(sx * 0.168 - 0.052, sx * 0.168 + 0.052, yf - 0.05, yf + dep, 0.135, 0.25, S)
    o_walls = part(walls, "walls", BEVEL, holes)

    # roof: one chevron slab with eave and verge overhangs
    t, ov_e, ov_g = 0.036, 0.042, 0.032
    xe = hx + ov_e
    z_at = lambda x: zr - abs(x) * tan(pitch)
    dz = t / cos(pitch)
    roof = MB()
    roof.prism([(-xe, z_at(xe)), (0, zr), (xe, z_at(xe)),
                (xe, z_at(xe) + dz), (0, zr + dz), (-xe, z_at(xe) + dz)],
               "Y", -hy - ov_g, hy + ov_g)
    o_roof = part(roof, "roof", BEVEL_MID)

    # chimney on the right-hand slope, towards the back
    cx0, cx1, cy0, cy1 = 0.11, 0.19, 0.07, 0.165
    ztop = zr + dz + 0.06
    chim = MB()
    chim.box(cx0, cx1, cy0, cy1, z_at(cx1) - 0.03, ztop)
    o_chim = part(chim, "chimney", BEVEL_FINE)
    cap = MB()
    cap.box(cx0 - 0.012, cx1 + 0.012, cy0 - 0.012, cy1 + 0.012, ztop - 0.004, ztop + 0.022)
    flue = MB()
    flue.box(cx0 + 0.018, cx1 - 0.018, cy0 + 0.02, cy1 - 0.02, ztop + 0.006, ztop + 0.05, S)
    o_cap = part(cap, "cap", BEVEL_FINE, flue)

    step = MB()
    step.box(-0.085, 0.085, yf - 0.045, yf + 0.01, 0.0, 0.018)
    o_step = part(step, "step", BEVEL_FINE)

    return [join([o_walls, o_roof, o_chim, o_cap, o_step], "household")]


def build_firm():
    x0, x1, dy, Hw, n, h = -0.42, 0.30, 0.27, 0.25, 4, 0.13
    p = (x1 - x0) / n
    prof = [(x0, 0), (x1, 0), (x1, Hw + h)]
    for i in range(n):
        xl = x1 - (i + 1) * p
        prof.append((xl, Hw))
        if i < n - 1:
            prof.append((xl, Hw + h))
    hall = MB()
    hall.prism(prof, "Y", -dy, dy)

    holes = MB()
    for i in range(n):                       # north-light glazing on each vertical face
        xv = x1 - i * p
        holes.box(xv - 0.016, xv + 0.03, -dy + 0.035, dy - 0.035, Hw + 0.03, Hw + h - 0.022, S)
    yf = -dy
    holes.box(-0.30, -0.15, yf - 0.05, yf + 0.022, -0.05, 0.18, S)              # loading door
    holes.box(-0.08, 0.23, yf - 0.05, yf + 0.02, 0.125, 0.185, S)               # ribbon window
    o_hall = part(hall, "hall", BEVEL, holes)

    # tall, slightly tapered chimney on a square plinth, with a dark flue
    cx, cy = 0.405, 0.15
    plinth = MB()
    plinth.box(cx - 0.068, cx + 0.068, cy - 0.068, cy + 0.068, 0.0, 0.045)
    o_plinth = part(plinth, "plinth", BEVEL_FINE)
    chim = MB()
    prof = [(0.05, 0.04), (0.04, 0.93), (0.049, 0.93), (0.049, 0.965),
            (0.034, 0.965), (0.034, 0.935), (0.0, 0.935)]
    chim.lathe(prof, 32, axis_matrix("Z", (cx, cy, 0)), seg_m=[P, P, P, P, S, S])
    o_chim = part(chim, "chimney", BEVEL_FINE)

    return [join([o_hall, o_plinth, o_chim], "firm")]


def build_government():
    # three-step crepidoma
    steps = MB()
    rise, tread = 0.03, 0.03
    X0, Y0, Y1 = 0.5, -0.37, 0.31
    for k in range(3):
        steps.box(-X0 + k * tread, X0 - k * tread, Y0 + k * tread, Y1 - k * tread,
                  k * rise, (k + 1) * rise)
    o_steps = part(steps, "steps", BEVEL_FINE)
    zs = 3 * rise                             # stylobate top 0.09

    # six columns: base, tapered shaft, echinus; square abacus
    cols, abaci = MB(), MB()
    cy, z_ab0, z_ab1 = -0.245, 0.462, 0.477
    for i in range(6):
        cx = -0.375 + i * 0.15
        prof = [(0.045, zs - 0.004), (0.045, zs + 0.013), (0.036, zs + 0.024),
                (0.0335, zs + 0.03), (0.0275, z_ab0 - 0.022), (0.0305, z_ab0 - 0.016),
                (0.041, z_ab0 - 0.002), (0.041, z_ab0 + 0.004)]
        cols.lathe(prof, 20, axis_matrix("Z", (cx, cy, 0)))
        abaci.box(cx - 0.046, cx + 0.046, cy - 0.046, cy + 0.046, z_ab0, z_ab1)
    o_cols = part(cols, "columns", BEVEL_FINE)
    o_ab = part(abaci, "abaci", 0.003)

    # shallow block (cella) behind, with a dark doorway
    cella = MB()
    cella.box(-0.405, 0.405, -0.125, 0.245, zs - 0.004, z_ab1 + 0.004)
    door = MB()
    door.box(-0.058, 0.058, -0.17, -0.105, zs - 0.03, 0.335, S)
    o_cella = part(cella, "cella", BEVEL_MID, door)

    # entablature: architrave/frieze + projecting cornice
    ent = MB()
    ent.box(-0.425, 0.425, cy - 0.046, 0.255, z_ab1, 0.535)
    o_ent = part(ent, "entablature", BEVEL_MID)
    cor = MB()
    zc0, zc1 = 0.535, 0.558
    cxh, cyf, cyb = 0.448, cy - 0.068, 0.275
    cor.box(-cxh, cxh, cyf, cyb, zc0, zc1)
    o_cor = part(cor, "cornice", BEVEL_FINE)

    # pediment with a recessed tympanum framed by the raking cornice
    slope = radians(14)
    apex = zc1 + cxh * tan(slope)
    ped = MB()
    ped.prism([(-cxh, zc1), (cxh, zc1), (0, apex)], "Y", cyf, cyb)
    frame = 0.027
    zb = zc1 + 0.011
    xin = cxh - (zb - zc1 + frame / cos(slope)) / tan(slope)
    tym = MB()
    tym.prism([(-xin, zb), (xin, zb), (0, apex - frame / cos(slope))], "Y", cyf - 0.05, cyf + 0.013, P)
    o_ped = part(ped, "pediment", BEVEL_FINE, tym)

    return [join([o_steps, o_cols, o_ab, o_cella, o_ent, o_cor, o_ped], "government")]


def build_central_bank():
    plinth = MB()
    plinth.box(-0.5, 0.5, -0.5, 0.5, 0.0, 0.05)
    plinth.box(-0.47, 0.47, -0.47, 0.47, 0.05, 0.08)
    o_plinth = part(plinth, "plinth", BEVEL_FINE)

    B, z0, z1 = 0.42, 0.08, 0.425
    block = MB()
    block.box(-B, B, -B, B, z0 - 0.004, z1)
    holes = MB()
    dep = 0.022
    # same pattern on all four faces; the front (-Y) gets a door in the centre bay
    for rot in range(4):
        R = Matrix.Rotation(rot * pi / 2, 4, "Z")
        for u in (-0.22, 0.0, 0.22):
            if rot == 0 and u == 0.0:
                holes.box(u - 0.048, u + 0.048, -B - 0.05, -B + dep, z0 - 0.04, 0.30, S, M=R)
            else:
                holes.box(u - 0.036, u + 0.036, -B - 0.05, -B + dep, 0.165, 0.335, S, M=R)
    o_block = part(block, "block", BEVEL_MID, holes)

    pil = MB()
    for rot in range(4):
        R = Matrix.Rotation(rot * pi / 2, 4, "Z")
        for u in (-0.33, -0.11, 0.11, 0.33):
            pil.box(u - 0.021, u + 0.021, -B - 0.013, -B + 0.006, z0, z1 - 0.004, P, M=R)
    o_pil = part(pil, "pilasters", 0.003)

    top = MB()
    top.box(-0.447, 0.447, -0.447, 0.447, z1, z1 + 0.026)               # cornice
    o_cor = part(top, "cornice", BEVEL_FINE)
    attic = MB()
    attic.box(-0.40, 0.40, -0.40, 0.40, z1 + 0.026 - 0.003, 0.50)
    o_attic = part(attic, "attic", BEVEL_MID)

    # rotunda: base ring, drum, drum cornice, dome, lantern
    R0, zb = 0.25, 0.50
    prof = [(0.285, zb - 0.004), (0.285, zb + 0.022), (R0, zb + 0.022),
            (R0, zb + 0.15), (0.272, zb + 0.15), (0.272, zb + 0.172), (R0 - 0.004, zb + 0.172)]
    zd = zb + 0.172
    Rd = R0 - 0.004
    ang = [radians(a) for a in (8, 18, 28, 38, 48, 58, 67, 75)]
    for a in ang:
        prof.append((Rd * cos(a), zd + Rd * sin(a)))
    zl = zd + Rd * sin(ang[-1])
    prof += [(0.05, zl), (0.05, zl + 0.055), (0.062, zl + 0.055), (0.062, zl + 0.068),
             (0.046, zl + 0.068), (0.034, zl + 0.09), (0.016, zl + 0.103), (0.0, zl + 0.107)]
    rot = MB()
    rot.lathe(prof, 40, axis_matrix("Z"))
    win = MB()
    for k in range(8):
        R = Matrix.Rotation(k * pi / 4 + pi / 8, 4, "Z")
        win.box(-0.024, 0.024, -0.32, -R0 + 0.02, zb + 0.05, zb + 0.122, S, M=R)
    o_rot = part(rot, "rotunda", BEVEL_FINE, win)

    return [join([o_plinth, o_block, o_pil, o_cor, o_attic, o_rot], "central_bank")]


def build_bank():
    base = MB()
    base.box(-0.5, 0.5, -0.36, 0.36, 0.0, 0.035)
    base.box(-0.47, 0.47, -0.33, 0.33, 0.035, 0.07)
    o_base = part(base, "base", BEVEL_FINE)

    BX, BY, zt = 0.43, 0.29, 0.64
    zc = 0.355                                   # vault-door centre height
    Ri, Ro = 0.17, 0.213                         # opening / frame radii
    block = MB()
    block.box(-BX, BX, -BY, BY, 0.066, zt)
    o_block = block.to_object("block")
    holes = MB()
    holes.cylinder(Ri, -BY - 0.05, -BY + 0.034, x=0.0, y=zc, segs=56, m=S, axis="Y")
    for sx in (-1, 1):                           # two tall windows on each side face
        lo, hi = (BX - 0.024, BX + 0.05) if sx > 0 else (-BX - 0.05, -BX + 0.024)
        for yy in (-0.125, 0.125):
            holes.box(lo, hi, yy - 0.034, yy + 0.034, 0.185, 0.505, S)
    cut(o_block, holes)
    # a shallow frieze groove under the cornice, all round (plaster)
    zf0, zf1, gd = 0.565, 0.585, 0.007
    for k in range(4):
        R = Matrix.Rotation(k * pi / 2, 4, "Z")
        half = BX if k % 2 == 0 else BY
        depth = BY if k % 2 == 0 else BX
        g = MB()
        g.box(-half - 0.05, half + 0.05, -depth - 0.05, -depth + gd, zf0, zf1, P, M=R)
        cut(o_block, g)
    bevel(o_block, BEVEL)

    course = MB()                                # projecting base course
    course.box(-BX - 0.014, BX + 0.014, -BY - 0.014, BY + 0.014, 0.066, 0.118)
    o_course = part(course, "course", BEVEL_FINE)
    cor = MB()
    cor.box(-0.452, 0.452, -0.312, 0.312, zt - 0.003, zt + 0.032)
    o_cor = part(cor, "cornice", BEVEL_FINE)

    # raised frame ring around the dark opening
    ring = MB()
    ring.lathe([(Ri, -BY + 0.006), (Ro, -BY + 0.006), (Ro, -BY - 0.016),
                (Ri, -BY - 0.016)], 56, axis_matrix("Y", (0, 0, zc)), closed=True)
    o_ring = part(ring, "frame", BEVEL_FINE)

    # handle: hub + three spokes with grips (plaster), and two hinge blocks
    hdl = MB()
    yh = -BY - 0.004
    hdl.cylinder(0.032, -BY + 0.03, yh - 0.02, x=0.0, y=zc, segs=24, axis="Y")
    for k in range(3):
        a = pi / 2 + k * 2 * pi / 3
        e = Vector((0.108 * cos(a), yh - 0.008, zc + 0.108 * sin(a)))
        hdl.rod((0, yh - 0.008, zc), e, 0.009, 10)
        hdl.cylinder(0.018, -BY + 0.03, yh - 0.022, x=e.x, y=e.z, segs=16, axis="Y")
    for dzh in (-0.105, 0.105):
        hdl.box(Ro - 0.02, Ro + 0.03, -BY - 0.024, -BY + 0.004, zc + dzh - 0.024, zc + dzh + 0.024)
    o_hdl = part(hdl, "handle", 0.0025)

    return [join([o_base, o_block, o_course, o_cor, o_ring, o_hdl], "bank")]


def _hull_ring(z, xs, xt, xb, hb, hb_stern):
    """Plan outline at height z: starboard stern->bow tip, then port back to stern."""
    xs_ = [xs, xs + 0.03] + [xt + (xb - xt) * s for s in (0.0, 0.25, 0.45, 0.62, 0.76, 0.87, 0.95)]
    hbs = [hb_stern, hb] + [hb * (1 - s ** 2) for s in (0.0, 0.25, 0.45, 0.62, 0.76, 0.87, 0.95)]
    star = [(x, w, z) for x, w in zip(xs_, hbs)]
    tip = (xb, 0.0, z)
    port = [(x, -w, z) for x, w in reversed(list(zip(xs_, hbs)))]
    return star + [tip] + port


def build_rest_of_world():
    # hull lofted from a keel outline to a deck outline -> raked bow, flared sides
    zdeck = 0.125
    keel = dict(xs=-0.475, xt=0.10, xb=0.385, hb=0.066, hb_stern=0.05)
    deck = dict(xs=-0.50, xt=0.18, xb=0.50, hb=0.086, hb_stern=0.07)
    zs = [0.0, 0.042, 0.058, zdeck]                     # waterline band between 2nd & 3rd
    k_ring = _hull_ring(0.0, **keel)
    d_ring = _hull_ring(zdeck, **deck)
    hull = MB()
    rings = []
    for z in zs:
        t = z / zdeck
        rings.append([hull.v(Vector(a).lerp(Vector(b), t)) for a, b in zip(k_ring, d_ring)])
    n = len(k_ring)
    for k in range(len(rings) - 1):
        m = S if k == 1 else P
        for i in range(n):
            j = (i + 1) % n
            hull.f([rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]], m)
    hull.f(rings[0][::-1], P)
    hull.f(rings[-1], P)
    o_hull = part(hull, "hull", BEVEL_MID)

    # hatch coaming + container stacks with dark seams (a shade core behind gaps)
    g, bl = 0.006, 0.129
    xb0 = -0.272
    tiers = [3, 4, 4, 3]
    zc0, th = zdeck + 0.012, 0.041
    hatch = MB()
    hatch.box(xb0 - 0.008, xb0 + len(tiers) * (bl + g) + 0.002, -0.079, 0.079, zdeck - 0.004, zc0)
    o_hatch = part(hatch, "hatch", BEVEL_FINE)
    W = 0.074
    rw = (2 * W - 2 * g) / 3
    boxes, core = MB(), MB()
    for i, nt in enumerate(tiers):
        bx0 = xb0 + i * (bl + g)
        for k in range(nt):
            z0 = zc0 + k * (th + g)
            for j in range(3):
                y0 = -W + j * (rw + g)
                boxes.box(bx0, bx0 + bl, y0, y0 + rw, z0, z0 + th)
        ztop = zc0 + nt * (th + g) - g
        core.box(bx0 + 0.004, bx0 + bl - 0.004, -W + 0.004, W - 0.004, zc0 - 0.002, ztop - 0.004, S)
    o_boxes = part(boxes, "containers", 0.0016)
    o_core = part(core, "seams", 0)

    # stern superstructure: accommodation, bridge deck with wings, funnel
    acc = MB()
    ax0, ax1 = -0.455, -0.36
    acc.box(ax0, ax1, -0.066, 0.066, zdeck - 0.004, 0.335)
    holes = MB()
    for zz in (0.19, 0.245, 0.30):                    # window strips, bow-facing + sides
        holes.box(ax1 - 0.01, ax1 + 0.05, -0.05, 0.05, zz - 0.009, zz + 0.009, S)
        holes.box(ax0 + 0.012, ax1 - 0.012, -0.12, -0.066 + 0.008, zz - 0.009, zz + 0.009, S)
        holes.box(ax0 + 0.012, ax1 - 0.012, 0.066 - 0.008, 0.12, zz - 0.009, zz + 0.009, S)
    o_acc = part(acc, "accommodation", BEVEL_FINE, holes)
    br = MB()
    br.box(ax0 + 0.006, ax1 + 0.008, -0.09, 0.09, 0.335, 0.377)
    bw = MB()
    bw.box(ax1 - 0.004, ax1 + 0.05, -0.08, 0.08, 0.345, 0.366, S)
    o_br = part(br, "bridge", BEVEL_FINE, bw)
    roof = MB()
    roof.box(ax0 + 0.002, ax1 + 0.014, -0.094, 0.094, 0.377, 0.385)
    o_roof = part(roof, "bridge_roof", 0.002)
    fun = MB()
    fun.box(-0.492, -0.452, -0.03, 0.03, 0.33, 0.43)
    ftop = MB()
    ftop.box(-0.484, -0.46, -0.022, 0.022, 0.415, 0.47, S)
    o_fun = part(fun, "funnel", BEVEL_FINE, ftop)

    return [join([o_hull, o_hatch, o_boxes, o_core, o_acc, o_br, o_roof, o_fun], "rest_of_world")]


def build_person():
    """Abstract scale figure from blended metaball capsules, decimated."""
    mbd = bpy.data.metaballs.new("person_mb")
    mbd.resolution = 0.0065
    mbd.render_resolution = 0.0065
    mbd.threshold = 0.6
    stiff = 6.0
    k = 0.732                       # visible radius / influence radius for s=6, t=0.6
    ob = bpy.data.objects.new("person_mb", mbd)
    bpy.context.scene.collection.objects.link(ob)

    def ellipsoid(c, rx, ry, rz):
        e = mbd.elements.new(type="ELLIPSOID")
        R = max(rx, ry, rz) / k
        e.co = c
        e.radius = R
        e.size_x, e.size_y, e.size_z = rx / (k * R), ry / (k * R), rz / (k * R)
        e.stiffness = stiff

    def capsule(a, b, r):
        a, b = Vector(a), Vector(b)
        e = mbd.elements.new(type="CAPSULE")
        e.co = (a + b) / 2
        e.radius = r / k
        e.size_x = (b - a).length / 2
        e.rotation = (b - a).to_track_quat("X", "Z")
        e.stiffness = stiff

    ellipsoid((0, 0.004, 0.918), 0.046, 0.053, 0.063)                 # head
    capsule((0, 0.008, 0.815), (0, 0.006, 0.865), 0.024)              # neck
    ellipsoid((0, 0.0, 0.69), 0.086, 0.049, 0.13)                     # chest
    ellipsoid((0, 0.002, 0.55), 0.084, 0.05, 0.08)                    # pelvis
    for sx in (-1, 1):
        capsule((sx * 0.06, 0.002, 0.5), (sx * 0.057, 0.0, 0.29), 0.04)        # thigh
        capsule((sx * 0.055, 0.0, 0.29), (sx * 0.054, 0.006, 0.062), 0.0335)  # shin
        ellipsoid((sx * 0.056, -0.02, 0.025), 0.028, 0.055, 0.025)             # foot
        capsule((sx * 0.02, 0.004, 0.792), (sx * 0.112, 0.004, 0.762), 0.031)  # shoulder
        capsule((sx * 0.124, 0.004, 0.752), (sx * 0.146, 0.01, 0.6), 0.026)   # upper arm
        capsule((sx * 0.148, 0.01, 0.6), (sx * 0.156, -0.002, 0.468), 0.022)  # forearm
        ellipsoid((sx * 0.158, -0.004, 0.432), 0.017, 0.025, 0.036)            # hand

    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob)
    bpy.data.metaballs.remove(mbd)
    body = bpy.data.objects.new("person", me)
    bpy.context.scene.collection.objects.link(body)
    plaster, shade = materials()
    me.materials.clear()
    me.materials.append(plaster)
    for p in me.polygons:
        p.material_index = 0
    tris = tri_count(body)
    target = 5000
    if tris > target:
        mod = body.modifiers.new("decimate", "DECIMATE")
        mod.decimate_type = "COLLAPSE"
        mod.ratio = target / tris
        apply_modifiers(body)
    return [body]


def build_valve():
    zc = 0.15                                   # pipe axis height
    seg = 24
    # horizontal run: flanges with dark bores, pipe stubs, union nuts
    run = MB()
    half = [(0.0, 0.476), (0.034, 0.476), (0.034, 0.5), (0.082, 0.5), (0.082, 0.464),
            (0.054, 0.464), (0.054, 0.275), (0.066, 0.275), (0.066, 0.215),
            (0.057, 0.215), (0.057, 0.10)]
    prof = [(r, -h) for r, h in half] + [(r, h) for r, h in reversed(half)]
    mats = []
    for i in range(len(prof) - 1):
        (r0, h0), (r1, h1) = prof[i], prof[i + 1]
        bore = (abs(h0) >= 0.476 and abs(h1) >= 0.476 and max(r0, r1) <= 0.034 + 1e-6)
        mats.append(S if bore else P)
    run.lathe(prof, seg, axis_matrix("X", (0, 0, zc)), seg_m=mats)
    o_run = part(run, "run", BEVEL_FINE)

    # globe body with flat foot, bonnet, gland and stem
    bod = MB()
    Rb = 0.148
    prof = [(0.0, 0.0), (0.058, 0.0)]
    a0, a1 = -asin((zc - 0.012) / Rb), asin(0.118 / Rb)
    for i in range(1, 10):
        a = a0 + (a1 - a0) * i / 10
        prof.append((Rb * cos(a), zc + Rb * sin(a)))
    zt = zc + 0.118
    prof += [(Rb * cos(a1), zt), (0.094, zt), (0.094, zt + 0.032), (0.064, zt + 0.032),
             (0.056, zt + 0.12), (0.044, zt + 0.12), (0.044, zt + 0.16),
             (0.016, zt + 0.16), (0.016, zt + 0.215), (0.0, zt + 0.215)]
    bod.lathe(prof, 28, axis_matrix("Z"))
    o_bod = part(bod, "globe", BEVEL_FINE)
    body = join([o_run, o_bod], "body")

    # handwheel: hub, five spokes, rim -- centred on the vertical axis
    zw = zt + 0.205
    hub = MB()
    hub.lathe([(0.034, zw - 0.026), (0.034, zw + 0.02), (0.024, zw + 0.03),
              (0.024, zw + 0.036), (0.0, zw + 0.036)], 24, axis_matrix("Z"))
    o_hub = part(hub, "hub", 0.003)
    wh = MB()
    Rr = 0.165
    for k in range(5):
        a = pi / 2 + k * 2 * pi / 5
        wh.rod((0.02 * cos(a), 0.02 * sin(a), zw), (Rr * cos(a), Rr * sin(a), zw), 0.0105, 8)
    wh.torus(Rr, 0.017, 40, 8, Matrix.Translation((0, 0, zw)))
    o_wh = part(wh, "spokes_rim", 0)          # all smooth; no hard edges to bevel
    wheel = join([o_hub, o_wh], "wheel")
    return [body, wheel]


def build_pivot():
    base = MB()
    base.box(-0.31, 0.31, -0.23, 0.23, 0.0, 0.045)
    base.box(-0.27, 0.27, -0.19, 0.19, 0.045, 0.075)
    o_base = part(base, "base", BEVEL_FINE)

    zp, rt = 0.50, 0.072                      # pin height, cheek top radius
    cheeks = MB()
    prof = [(-0.115, 0.07), (0.115, 0.07), (rt, zp)]
    for i in range(1, 16):
        a = pi * i / 16
        prof.append((rt * cos(a), zp + rt * sin(a)))
    prof.append((-rt, zp))
    for sx in (-1, 1):
        cheeks.prism(prof, "X", sx * 0.095, sx * 0.155)
    o_ch = part(cheeks, "cheeks", BEVEL_MID)

    pin = MB()
    half = [(0.0, 0.265), (0.026, 0.265), (0.036, 0.255), (0.036, 0.228), (0.022, 0.228),
            (0.022, 0.10)]
    prof = [(r, -h) for r, h in half] + [(r, h) for r, h in reversed(half)]
    pin.lathe(prof, 28, axis_matrix("X", (0, 0, zp)))
    for sx in (-1, 1):                         # bearing bosses on the outer cheek faces
        a0, a1 = sorted((sx * 0.15, sx * 0.182))
        pin.lathe([(0.05, a0), (0.05, a1)], 32, axis_matrix("X", (0, 0, zp)))
    o_pin = part(pin, "pin", BEVEL_FINE)

    return [join([o_base, o_ch, o_pin], "pivot")]


# --------------------------------------------------------------------------- world-economy set

def arch_pts(u0, u1, z0, zs, segs=10):
    """Round-headed opening: rectangle from z0 to the springing line zs, semicircle on top."""
    r = (u1 - u0) / 2
    uc = (u0 + u1) / 2
    pts = [(u0, z0), (u1, z0), (u1, zs)]
    for i in range(1, segs):
        a = pi * i / segs
        pts.append((uc + r * cos(a), zs + r * sin(a)))
    pts.append((u0, zs))
    return pts


def offset_polyline(pts, t):
    """Offset an open 2D polyline to its left by t (mitred joints, square ends)."""
    out = []
    n = len(pts)
    normals = []
    for i in range(n - 1):
        d = Vector((pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])).normalized()
        normals.append(Vector((-d.y, d.x)))
    for i in range(n):
        if i == 0:
            nv = normals[0]
            k = t
        elif i == n - 1:
            nv = normals[-1]
            k = t
        else:
            nv = (normals[i - 1] + normals[i]).normalized()
            k = t / nv.dot(normals[i])
        out.append((pts[i][0] + nv.x * k, pts[i][1] + nv.y * k))
    return out


def slab_over(profile, t, axis, a0, a1, mb, m=P):
    """Roof slab of thickness t lying on an open profile (left-to-right over the top)."""
    top = offset_polyline(profile, t)
    mb.prism(list(profile) + top[::-1], axis, a0, a1, m)


def build_market_hall():
    base = MB()
    base.box(-0.5, 0.5, -0.262, 0.262, 0.0, 0.022)
    o_base = part(base, "base", BEVEL_FINE)

    L, yA, yN = 0.455, 0.215, 0.105
    z0, zE, zA, zC, zR = 0.018, 0.255, 0.318, 0.428, 0.50
    hall = MB()
    hall.prism([(-yA, z0), (yA, z0), (yA, zE), (yN, zA), (yN, zC), (0, zR),
                (-yN, zC), (-yN, zA), (-yA, zE)], "X", -L, L)
    o_hall = hall.to_object("hall")
    holes = MB()
    n, p, w = 7, 0.12, 0.074
    for i in range(n):                                   # open arcades on both long sides
        xc = -p * (n - 1) / 2 + i * p
        for sy in (-1, 1):
            a0, a1 = (-yA - 0.05, -yA + 0.068) if sy < 0 else (yA - 0.068, yA + 0.05)
            holes.prism(arch_pts(xc - w / 2, xc + w / 2, z0 - 0.04, 0.152, 10), "Y", a0, a1, S)
    for i in range(9):                                   # clerestory windows
        xc = -0.36 + i * 0.09
        for sy in (-1, 1):
            a0, a1 = (-yN - 0.03, -yN + 0.018) if sy < 0 else (yN - 0.018, yN + 0.03)
            holes.box(xc - 0.024, xc + 0.024, a0, a1, 0.362, 0.405, S)
    for sx in (-1, 1):                                   # gable ends: great arch + oculus
        a0, a1 = (-L - 0.05, -L + 0.05) if sx < 0 else (L - 0.05, L + 0.05)
        holes.prism(arch_pts(-0.065, 0.065, z0 - 0.04, 0.16, 12), "X", a0, a1, S)
        holes.cylinder(0.026, a0, a1, x=0.0, y=0.4, segs=24, m=S, axis="X")
    cut(o_hall, holes)
    bevel(o_hall, BEVEL_MID)

    roofs = MB()
    tn, ta = 0.022, 0.02
    sn = (zR - zC) / yN
    ov = 0.026
    nave = [(-yN - ov, zC - ov * sn), (0, zR), (yN + ov, zC - ov * sn)]
    slab_over(nave, tn, "X", -L - 0.022, L + 0.022, roofs)
    sa = (zA - zE) / (yA - yN)
    for sy in (-1, 1):
        prof = [(-yA - ov, zE - ov * sa), (-yN + 0.008, zA + 0.008 * sa)]
        if sy > 0:
            prof = [(yN - 0.008, zA + 0.008 * sa), (yA + ov, zE - ov * sa)]
        slab_over(prof, ta, "X", -L - 0.016, L + 0.016, roofs)
    o_roofs = part(roofs, "roofs", BEVEL_FINE)
    return [join([o_base, o_hall, o_roofs], "market_hall")]


def build_exchange():
    base = MB()
    base.box(-0.34, 0.34, -0.265, 0.265, 0.0, 0.03)
    base.box(-0.318, 0.318, -0.243, 0.243, 0.03, 0.055)
    o_base = part(base, "base", BEVEL_FINE)

    BX, BY, z0, z1 = 0.29, 0.215, 0.05, 0.955
    tower = MB()
    tower.box(-BX, BX, -BY, BY, z0, z1)
    ob = tower.to_object("tower")
    c = MB()                                              # stepped entrance: plaster reveal
    c.box(-0.112, 0.112, -BY - 0.05, -BY + 0.02, z0 - 0.05, 0.305, P)
    cut(ob, c)
    c = MB()                                              # ... then the dark doorway
    c.box(-0.08, 0.08, -BY - 0.05, -BY + 0.075, z0 - 0.05, 0.275, S)
    cut(ob, c)
    zb0, zb1, bd = 0.362, 0.412, 0.017                    # ticker frieze, all round
    for k in range(4):
        R = Matrix.Rotation(k * pi / 2, 4, "Z")
        half, depth = (BX, BY) if k % 2 == 0 else (BY, BX)
        c = MB()
        c.box(-half - 0.05, half + 0.05, -depth - 0.05, -depth + bd, zb0, zb1, S, M=R)
        cut(ob, c)
    win = MB()
    for k in range(4):                                    # vertical window strips
        R = Matrix.Rotation(k * pi / 2, 4, "Z")
        half, depth = (BX, BY) if k % 2 == 0 else (BY, BX)
        us = [-0.2, -0.1, 0.0, 0.1, 0.2] if k % 2 == 0 else [-0.135, -0.045, 0.045, 0.135]
        for u in us:
            win.box(u - 0.022, u + 0.022, -depth - 0.04, -depth + 0.02, 0.47, 0.905, S, M=R)
        low = [-0.21, 0.21] if k == 0 else (us if k % 2 == 1 else [-0.2, -0.1, 0.0, 0.1, 0.2])
        for u in low:
            win.box(u - 0.022, u + 0.022, -depth - 0.04, -depth + 0.02, 0.11, 0.30, S, M=R)
    cut(ob, win)
    bevel(ob, BEVEL_MID)

    trim = MB()
    trim.box(-BX - 0.012, BX + 0.012, -BY - 0.012, BY + 0.012, 0.338, 0.352)   # sill ledge
    trim.box(-BX - 0.012, BX + 0.012, -BY - 0.012, BY + 0.012, 0.422, 0.436)   # head ledge
    o_trim = part(trim, "ledges", 0.003)
    crown = MB()
    crown.box(-BX - 0.014, BX + 0.014, -BY - 0.014, BY + 0.014, z1 - 0.004, z1 + 0.02)
    crown.box(-0.25, 0.25, -0.175, 0.175, z1 + 0.02, 1.04)
    crown.box(-0.262, 0.262, -0.187, 0.187, 1.04, 1.056)
    o_crown = part(crown, "crown", BEVEL_FINE)
    return [join([o_base, ob, o_trim, o_crown], "exchange")]


def build_globe():
    R, zc = 0.3, 0.62
    tilt = radians(23.4)
    A = Matrix.Translation((0, 0, zc)) @ Matrix.Rotation(tilt, 4, "Y")
    ball = MB()
    prof = [(R * sin(pi * i / 16), -R * cos(pi * i / 16)) for i in range(17)]
    ball.lathe(prof, 32, A)
    o_ball = part(ball, "sphere", 0)

    lines = MB()
    w = 0.0055
    for lat in (-40, 0, 40):                               # raised parallels
        l, dl = radians(lat), w / R
        sec = [((R - 0.004) * cos(l - dl), (R - 0.004) * sin(l - dl)),
               ((R + 0.007) * cos(l - dl), (R + 0.007) * sin(l - dl)),
               ((R + 0.007) * cos(l + dl), (R + 0.007) * sin(l + dl)),
               ((R - 0.004) * cos(l + dl), (R - 0.004) * sin(l + dl))]
        lines.lathe(sec, 40 if lat == 0 else 36, A, closed=True)
    for k in range(4):                                     # raised meridians (great circles)
        M = A @ Matrix.Rotation(k * pi / 4, 4, "Z") @ Matrix.Rotation(-pi / 2, 4, "X")
        lines.lathe([(R - 0.004, -w), (R + 0.0095, -w), (R + 0.0095, w), (R - 0.004, w)],
                    40, M, closed=True)
    o_lines = part(lines, "graticule", 0)

    Rm = R + 0.05                                          # meridian mount ring (XZ plane)
    mount = MB()
    mount.lathe([(Rm - 0.009, -0.016), (Rm + 0.009, -0.016), (Rm + 0.009, 0.016),
                 (Rm - 0.009, 0.016)], 48, axis_matrix("Y", (0, 0, zc)), closed=True)
    for s in (-1, 1):                                      # pole pins and bosses
        mount.lathe([(0.011, s * (R - 0.02)), (0.011, s * (Rm + 0.004))], 16, A)
        mount.lathe([(0.024, s * (R - 0.01)), (0.024, s * (R + 0.016))], 24, A)
    o_mount = part(mount, "mount", 0.0025)

    zr = zc - Rm - 0.009
    stand = MB()
    stand.lathe([(0.0, 0.0), (0.2, 0.0), (0.2, 0.022), (0.184, 0.036), (0.07, 0.056),
                 (0.034, 0.07), (0.022, 0.085), (0.022, zr - 0.035), (0.034, zr - 0.03),
                 (0.034, zr + 0.004), (0.0, zr + 0.004)], 32, axis_matrix("Z"))
    o_stand = part(stand, "stand", BEVEL_FINE)
    return [join([o_ball, o_lines, o_mount, o_stand], "globe")]


def build_containers():
    L40, L20, W, H = 0.6, 0.294, 0.122, 0.13
    ys = (-0.13, 0.0, 0.13)
    boxes = [(0.0, ys[0], 0, L40), (0.0, ys[1], 0, L40), (0.0, ys[2], 0, L40),
             (0.022, ys[0], 1, L40), (-0.016, ys[1], 1, L40),
             (-0.153, ys[2], 1, L20), (0.153, ys[2], 1, L20),
             (0.03, ys[1], 2, L40)]
    obs = []
    for idx, (xc, yc, tier, Lc) in enumerate(boxes):
        z0 = tier * H
        mb = MB()
        mb.box(xc - Lc / 2, xc + Lc / 2, yc - W / 2, yc + W / 2, z0, z0 + H)
        ob = part(mb, "c%d" % idx, 0.004)
        g = MB()
        nr = 16 if Lc == L40 else 8
        span = Lc - 0.06
        for i in range(nr):                               # corrugation on the long sides
            x = xc - span / 2 + span * (i + 0.5) / nr
            for sy in (-1, 1):
                y0, y1 = (yc - W / 2 - 0.02, yc - W / 2 + 0.006) if sy < 0 else \
                         (yc + W / 2 - 0.006, yc + W / 2 + 0.02)
                g.box(x - 0.0045, x + 0.0045, y0, y1, z0 + 0.013, z0 + H - 0.013, S)
        for sx in (-1, 1):                                # door / end-wall ribs
            x0, x1 = (xc - Lc / 2 - 0.02, xc - Lc / 2 + 0.006) if sx < 0 else \
                     (xc + Lc / 2 - 0.006, xc + Lc / 2 + 0.02)
            for v in (-0.034, 0.0, 0.034):
                g.box(x0, x1, yc + v - 0.0045, yc + v + 0.0045, z0 + 0.013, z0 + H - 0.013, S)
        cut(ob, g)
        obs.append(ob)
    return [join(obs, "containers")]


def build_power_plant():
    # cooling tower: hyperboloid shell, dark air-inlet band, dark interior
    tx, ty = -0.215, 0.045
    a, h0, cc = 0.16, 0.55, 0.4165
    hyp = lambda h: a * sqrt(1 + ((h - h0) / cc) ** 2)
    prof = [(0.222, 0.0), (0.222, 0.05), (hyp(0.05), 0.05)]
    for h in (0.12, 0.2, 0.28, 0.36, 0.44, 0.52, 0.6, 0.66, 0.7):
        prof.append((hyp(h), h))
    rt = hyp(0.7)
    prof += [(rt - 0.014, 0.7), (rt - 0.014, 0.655), (0.0, 0.655)]
    mats = [S, P] + [P] * 9 + [P, S, S]
    tower = MB()
    tower.lathe(prof, 44, axis_matrix("Z", (tx, ty, 0)), seg_m=mats)
    o_tower = part(tower, "cooling_tower", BEVEL_FINE)

    hall = MB()
    hall.box(0.04, 0.465, -0.215, 0.07, 0.0, 0.2)
    o_hall = hall.to_object("hall")
    c = MB()
    c.box(0.07, 0.44, -0.26, -0.215 + 0.016, 0.12, 0.165, S)             # ribbon window
    c.box(0.09, 0.16, -0.26, -0.215 + 0.02, -0.04, 0.11, S)              # door
    c.box(0.465 - 0.016, 0.52, -0.19, 0.045, 0.12, 0.165, S)            # side ribbon
    cut(o_hall, c)
    bevel(o_hall, BEVEL_MID)
    upper = MB()
    upper.box(0.2, 0.465, -0.13, 0.07, 0.196, 0.31)
    o_upper = upper.to_object("upper")
    c = MB()
    for i in range(5):
        x = 0.235 + i * 0.05
        c.box(x - 0.014, x + 0.014, -0.18, -0.13 + 0.016, 0.225, 0.285, S)
    cut(o_upper, c)
    bevel(o_upper, BEVEL_MID)
    duct = MB()
    duct.box(0.355, 0.41, 0.06, 0.15, 0.2, 0.255)
    o_duct = part(duct, "duct", BEVEL_FINE)

    cx, cy = 0.383, 0.19
    chim = MB()
    cp = [(0.048, 0.0), (0.048, 0.03), (0.036, 0.03), (0.029, 0.78), (0.026, 0.78),
          (0.026, 0.81), (0.0285, 0.81), (0.0275, 0.85), (0.025, 0.85), (0.025, 0.88),
          (0.027, 0.88), (0.026, 0.925), (0.033, 0.925), (0.033, 0.952), (0.021, 0.952),
          (0.021, 0.93), (0.0, 0.93)]
    cm = [P, P, P, S, S, S, P, S, S, S, P, P, P, P, S, S]
    chim.lathe(cp, 28, axis_matrix("Z", (cx, cy, 0)), seg_m=cm)
    o_chim = part(chim, "chimney", 0.003)
    return [join([o_tower, o_hall, o_upper, o_duct, o_chim], "power_plant")]


def build_farm():
    # gambrel barn, gable to the front
    bx, hw, D = -0.30, 0.15, 0.42
    zw, xk, zk, zr = 0.165, 0.112, 0.262, 0.322
    barn = MB()
    barn.prism([(bx - hw, 0), (bx + hw, 0), (bx + hw, zw), (bx + xk, zk), (bx, zr),
                (bx - xk, zk), (bx - hw, zw)], "Y", -D / 2, D / 2)
    ob = barn.to_object("barn")
    c = MB()
    yf = -D / 2
    c.box(bx - 0.066, bx + 0.066, yf - 0.05, yf + 0.02, -0.05, 0.142, S)      # main doors
    c.box(bx - 0.034, bx + 0.034, yf - 0.05, yf + 0.018, 0.196, 0.25, S)      # hayloft
    for yy in (-0.11, 0.0, 0.11):                                               # side windows
        for sx in (-1, 1):
            x0, x1 = (bx + hw - 0.016, bx + hw + 0.05) if sx > 0 else (bx - hw - 0.05, bx - hw + 0.016)
            c.box(x0, x1, yy - 0.022, yy + 0.022, 0.085, 0.125, S)
    cut(ob, c)
    bevel(ob, BEVEL_MID)
    roof = MB()
    ov = 0.022
    lower = Vector((hw - xk, zk - zw)).normalized()      # left eave -> left knee
    eL = Vector((bx - hw, zw)) - lower * ov
    eR = Vector((bx + hw, zw)) - Vector((-lower.x, lower.y)) * ov
    slab_over([(eL.x, eL.y), (bx - xk, zk), (bx, zr), (bx + xk, zk), (eR.x, eR.y)],
              0.02, "Y", -D / 2 - 0.02, D / 2 + 0.02, roof)
    o_roof = part(roof, "barn_roof", BEVEL_FINE)

    # silo with hoops and a domed cap
    sx_, sy_ = -0.066, 0.12
    rs = 0.068
    sp = [(rs + 0.01, 0.0), (rs + 0.01, 0.022), (rs, 0.022)]
    for hh in (0.15, 0.29, 0.43):
        sp += [(rs, hh), (rs + 0.0045, hh), (rs + 0.0045, hh + 0.013), (rs, hh + 0.013)]
    sp += [(rs, 0.5), (rs + 0.006, 0.5)]
    for i in range(1, 7):
        aa = pi / 2 * i / 7
        sp.append(((rs + 0.006) * cos(aa), 0.5 + (rs + 0.006) * 0.85 * sin(aa)))
    sp += [(0.012, 0.5 + (rs + 0.006) * 0.85 + 0.002), (0.012, 0.5 + (rs + 0.006) * 0.85 + 0.018),
           (0.0, 0.5 + (rs + 0.006) * 0.85 + 0.018)]
    silo = MB()
    silo.lathe(sp, 32, axis_matrix("Z", (sx_, sy_, 0)))
    o_silo = part(silo, "silo", 0.003)

    # field: plate, furrow ridges, post-and-rail fence with a gate gap
    fx0, fx1, fy0, fy1 = 0.03, 0.5, -0.24, 0.24
    field = MB()
    field.box(fx0, fx1, fy0, fy1, 0.0, 0.014)
    o_field = part(field, "field", 0.003)
    furrows = MB()
    nf = 9
    for i in range(nf):
        xc = fx0 + 0.05 + i * (fx1 - fx0 - 0.1) / (nf - 1)
        furrows.prism([(xc - 0.021, 0.012), (xc + 0.021, 0.012), (xc, 0.034)], "Y",
                      fy0 + 0.04, fy1 - 0.04)
    o_furrows = part(furrows, "furrows", 0)
    fence = MB()
    px0, px1, py0, py1 = fx0 + 0.012, fx1 - 0.012, fy0 + 0.012, fy1 - 0.012
    posts = []
    for i in range(6):
        posts.append((px0 + (px1 - px0) * i / 5, py0))
        posts.append((px0 + (px1 - px0) * i / 5, py1))
    for j in range(1, 5):
        posts.append((px1, py0 + (py1 - py0) * j / 5))
        if j not in (2, 3):
            posts.append((px0, py0 + (py1 - py0) * j / 5))
    gate0, gate1 = py0 + (py1 - py0) * 0.4, py0 + (py1 - py0) * 0.6
    posts += [(px0, gate0), (px0, gate1)]
    for (x, y) in posts:
        fence.box(x - 0.0065, x + 0.0065, y - 0.0065, y + 0.0065, 0.01, 0.088)
    for zz in (0.047, 0.074):
        fence.box(px0, px1, py0 - 0.003, py0 + 0.003, zz - 0.004, zz + 0.004)
        fence.box(px0, px1, py1 - 0.003, py1 + 0.003, zz - 0.004, zz + 0.004)
        fence.box(px1 - 0.003, px1 + 0.003, py0, py1, zz - 0.004, zz + 0.004)
        fence.box(px0 - 0.003, px0 + 0.003, py0, gate0, zz - 0.004, zz + 0.004)
        fence.box(px0 - 0.003, px0 + 0.003, gate1, py1, zz - 0.004, zz + 0.004)
    o_fence = part(fence, "fence", 0)
    return [join([ob, o_roof, o_silo, o_field, o_furrows, o_fence], "farm")]


def build_city():
    plate = MB()
    plate.box(-0.5, 0.5, -0.5, 0.5, 0.0, 0.03)
    o_plate = part(plate, "plate", BEVEL_FINE)
    cells = (-0.33, 0.0, 0.33)
    # (x index, y index): (half width, half depth, height, style, setback)
    spec = {
        (0, 0): (0.12, 0.115, 0.27, "bands", False),
        (1, 0): (0.115, 0.12, 0.33, "strips", False),
        (2, 0): (0.12, 0.11, 0.22, "bands", False),
        (0, 1): (0.115, 0.12, 0.40, "strips", True),
        (1, 1): (0.125, 0.125, 0.64, "bands", True),
        (2, 1): (0.11, 0.12, 0.31, "strips", False),
        (0, 2): (0.12, 0.12, 0.48, "bands", False),
        (1, 2): (0.11, 0.115, 0.53, "strips", True),
        (2, 2): (0.12, 0.12, 0.42, "bands", False),
    }
    obs = [o_plate]
    zb = 0.028
    for (i, j), (hx, hy, hgt, style, setback) in sorted(spec.items()):
        cx, cy = cells[i], cells[j]
        top = zb + hgt - (0.06 if setback else 0.0)
        mb = MB()
        mb.box(cx - hx, cx + hx, cy - hy, cy + hy, zb, top)
        ob = part(mb, "blk%d%d" % (i, j), BEVEL_FINE)
        c = MB()
        for k in range(4):
            R = Matrix.Translation((cx, cy, 0)) @ Matrix.Rotation(k * pi / 2, 4, "Z")
            half, depth = (hx, hy) if k % 2 == 0 else (hy, hx)
            if style == "bands":                       # ribbon window per floor
                z = zb + 0.05
                while z + 0.03 < top - 0.025:
                    c.box(-half + 0.022, half - 0.022, -depth - 0.03, -depth + 0.012,
                          z, z + 0.026, S, M=R)
                    z += 0.06
            else:                                      # vertical window strips
                for u in (-half * 0.55, 0.0, half * 0.55):
                    c.box(u - 0.016, u + 0.016, -depth - 0.03, -depth + 0.012,
                          zb + 0.05, top - 0.035, S, M=R)
        cut(ob, c)
        obs.append(ob)
        if setback:                                    # stepped crown
            mb = MB()
            mb.box(cx - hx + 0.03, cx + hx - 0.03, cy - hy + 0.03, cy + hy - 0.03,
                   top - 0.004, top + 0.06)
            obs.append(part(mb, "crown%d%d" % (i, j), BEVEL_FINE))
    return [join(obs, "city")]


def build_coins():
    import random
    rnd = random.Random(7)
    ro, ri, th, gap, nt = 0.15, 0.1458, 0.031, 0.004, 40
    star = []
    for i in range(2 * nt):
        r = ro if i % 2 == 0 else ri
        a = pi * i / nt
        star.append((r * cos(a), r * sin(a)))
    obs = []
    for s, count in enumerate((6, 4, 2)):           # back, front-left, front-right
        ang = radians(90 + 120 * s)
        cx, cy = 0.19 * cos(ang), 0.19 * sin(ang)
        coins = MB()
        z = 0.0
        for k in range(count):
            dx, dy = rnd.uniform(-0.003, 0.003), rnd.uniform(-0.003, 0.003)
            M = Matrix.Translation((cx + dx, cy + dy, 0)) @ \
                Matrix.Rotation(rnd.uniform(0, 2 * pi), 4, "Z")
            coins.prism(star, "Z", z, z + th, P, M=M)
            z += th + gap
        ztop = z - gap
        ob = coins.to_object("stack%d" % s)
        rec = MB()                                     # recessed field on the top coin
        rec.cylinder(0.122, ztop - 0.005, ztop + 0.05, x=cx, y=cy, segs=36, m=P)
        cut(ob, rec)
        obs.append(ob)
        core = MB()                                    # dark seams between the coins
        core.cylinder(0.139, 0.004, ztop - 0.006, x=cx, y=cy, segs=40, m=S)
        obs.append(core.to_object("core%d" % s))
    return [join(obs, "coins")]


def build_university():
    obs = []
    hy, zw = 0.11, 0.2
    pitch = radians(42)
    zr = zw + hy * tan(pitch)
    for sx in (-1, 1):
        x0, x1 = sorted((sx * 0.07, sx * 0.47))
        wing = MB()
        wing.prism([(-hy, 0), (hy, 0), (hy, zw), (0, zr), (-hy, zw)], "X", x0, x1)
        ob = wing.to_object("wing%d" % sx)
        c = MB()
        for k in range(4):                              # arched windows, both long faces
            xc = sx * (0.135 + k * 0.088)
            for sy in (-1, 1):
                a0, a1 = (-hy - 0.04, -hy + 0.018) if sy < 0 else (hy - 0.018, hy + 0.04)
                c.prism(arch_pts(xc - 0.02, xc + 0.02, 0.05, 0.13, 8), "Y", a0, a1, S)
        xe = sx * 0.47                                   # gable-end window
        a0, a1 = sorted((xe - sx * 0.018, xe + sx * 0.04))
        c.prism(arch_pts(-0.026, 0.026, 0.07, 0.17, 8), "X", a0, a1, S)
        cut(ob, c)
        bevel(ob, BEVEL_MID)
        obs.append(ob)
        roof = MB()
        ov = 0.02
        xa, xb = sorted((sx * 0.06, sx * 0.485))
        slab_over([(-hy - ov, zw - ov * tan(pitch)), (0, zr), (hy + ov, zw - ov * tan(pitch))],
                  0.02, "X", xa, xb, roof)
        obs.append(part(roof, "wroof%d" % sx, BEVEL_FINE))

    # central tower: gate arch, clock stage, belfry, spire with corner pinnacles
    tx, ty = 0.088, 0.13
    tower = MB()
    tower.box(-tx, tx, -ty, ty, 0.0, 0.5)
    ob = tower.to_object("tower")
    c = MB()
    c.prism(arch_pts(-0.036, 0.036, -0.04, 0.115, 10), "Y", -ty - 0.05, -ty + 0.055, S)
    c.prism(arch_pts(-0.036, 0.036, -0.04, 0.115, 10), "Y", ty - 0.055, ty + 0.05, S)
    for k in range(4):                                  # clock faces
        R = Matrix.Rotation(k * pi / 2, 4, "Z")
        depth = ty if k % 2 == 0 else tx
        c.lathe([(0.042, -depth - 0.05), (0.042, -depth + 0.012)], 24,
                R @ axis_matrix("Y", (0, 0, 0.405)), m=S)
    cut(ob, c)
    bevel(ob, BEVEL_MID)
    obs.append(ob)
    det = MB()
    for k in range(4):                                  # clock rings + hands (10:10)
        R = Matrix.Rotation(k * pi / 2, 4, "Z")
        depth = ty if k % 2 == 0 else tx
        det.lathe([(0.042, -depth + 0.004), (0.052, -depth + 0.004), (0.052, -depth - 0.009),
                   (0.042, -depth - 0.009)], 24, R @ axis_matrix("Y", (0, 0, 0.405)), closed=True)
        for ang, ln in ((radians(30), 0.03), (radians(150), 0.022)):
            e = Vector((ln * cos(ang), -depth + 0.006, 0.405 + ln * sin(ang)))
            det.rod(R @ Vector((0, -depth + 0.006, 0.405)), R @ e, 0.0042, 6)
    obs.append(part(det, "clock", 0))
    course = MB()
    course.box(-tx - 0.01, tx + 0.01, -ty - 0.01, ty + 0.01, 0.47, 0.49)       # string course
    obs.append(part(course, "course", 0.0025))
    bel = MB()
    bx_, by_ = 0.075, 0.115
    bel.box(-bx_, bx_, -by_, by_, 0.486, 0.61)
    ob = bel.to_object("belfry")
    c = MB()
    for k in range(4):
        R = Matrix.Rotation(k * pi / 2, 4, "Z")
        depth = by_ if k % 2 == 0 else bx_
        c.prism(arch_pts(-0.024, 0.024, 0.515, 0.565, 8), "Y", -depth - 0.04, -depth + 0.03, S, M=R)
    cut(ob, c)
    bevel(ob, BEVEL_FINE)
    obs.append(ob)
    cap = MB()
    cap.box(-bx_ - 0.01, bx_ + 0.01, -by_ - 0.01, by_ + 0.01, 0.606, 0.626)
    hx_, hy_ = 0.062, 0.1
    spire = MB()
    pv = [spire.v((x, y, 0.622)) for x, y in ((-hx_, -hy_), (hx_, -hy_), (hx_, hy_), (-hx_, hy_))]
    apex = spire.v((0, 0, 0.8))
    spire.f(pv[::-1], P)
    for i in range(4):
        spire.f([pv[i], pv[(i + 1) % 4], apex], P)
    for x, y in ((-1, -1), (1, -1), (1, 1), (-1, 1)):    # corner pinnacles
        cap.lathe([(0.0145, 0.62), (0.0145, 0.655), (0.0, 0.70)], 4,
                  axis_matrix("Z", (x * (bx_ + 0.002), y * (by_ + 0.002), 0)), phase=pi / 4)
    obs.append(part(cap, "parapet", BEVEL_FINE))
    obs.append(part(spire, "spire", BEVEL_FINE))
    return [join(obs, "university")]


def build_crate():
    C, T = 0.47, 0.03                        # core half-size, board thickness
    core = MB()
    core.box(-C, C, -C, C, 0.0, 1.0)
    ob = core.to_object("core")
    g = MB()
    for k in range(4):                       # plank grooves on the sides
        R = Matrix.Rotation(k * pi / 2, 4, "Z")
        for z in (0.315, 0.5, 0.685):
            g.box(-0.36, 0.36, -C - 0.03, -C + 0.011, z - 0.0065, z + 0.0065, S, M=R)
    for y in (-0.235, 0.0, 0.235):           # and on the lid
        g.box(-C + 0.03, C - 0.03, y - 0.0065, y + 0.0065, 1.0 - 0.011, 1.05, S)
    cut(ob, g)
    bevel(ob, 0.004)
    boards = MB()
    W = 0.12
    for k in range(4):
        R = Matrix.Rotation(k * pi / 2, 4, "Z")
        if k % 2 == 0:                       # front/back own the corner columns
            for s in (-1, 1):
                x0, x1 = sorted((s * (C + T), s * (C + T - W)))
                boards.box(x0, x1, -C - T, -C, 0.0, 1.0, M=R)
        else:
            for s in (-1, 1):
                x0, x1 = sorted((s * C, s * (C + T - W)))
                boards.box(x0, x1, -C - T, -C, 0.0, 1.0, M=R)
        for z0, z1 in ((0.0, W), (1.0 - W, 1.0)):
            boards.box(-(C + T - W), C + T - W, -C - T, -C, z0, z1, M=R)
    o_boards = part(boards, "frame", 0.004)
    brace = MB()
    for k in range(4):                       # diagonal brace, sitting just behind the frame
        R = Matrix.Rotation(k * pi / 2, 4, "Z")
        a = Vector((-(C + T - W) - 0.01, 0, W - 0.01))
        b = Vector((C + T - W + 0.01, 0, 1.0 - W + 0.01))
        d = b - a
        ang = atan2(d.z, d.x)
        M = R @ Matrix.Translation(((a + b) / 2) + Vector((0, -C - 0.011, 0))) @ \
            Matrix.Rotation(-ang, 4, "Y")
        brace.box(-d.length / 2, d.length / 2, -0.011, 0.011, -0.045, 0.045, M=M)
    o_brace = part(brace, "brace", 0.004)
    return [join([ob, o_boards, o_brace], "crate")]


BUILDERS = {
    "household": (build_household, "footprint"),
    "firm": (build_firm, "footprint"),
    "government": (build_government, "footprint"),
    "central_bank": (build_central_bank, "footprint"),
    "bank": (build_bank, "footprint"),
    "rest_of_world": (build_rest_of_world, "footprint"),
    "person": (build_person, "height"),
    "valve": (build_valve, "length_x"),
    "pivot": (build_pivot, "footprint"),
    "market_hall": (build_market_hall, "footprint"),
    "exchange": (build_exchange, "footprint"),
    "globe": (build_globe, "height"),
    "containers": (build_containers, "footprint"),
    "power_plant": (build_power_plant, "footprint"),
    "farm": (build_farm, "footprint"),
    "city": (build_city, "footprint"),
    "coins": (build_coins, "footprint"),
    "university": (build_university, "footprint"),
    "crate": (build_crate, "footprint"),
}


# --------------------------------------------------------------------------- scene / export

def reset_scene():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    for coll in (bpy.data.meshes, bpy.data.curves, bpy.data.metaballs,
                 bpy.data.lights, bpy.data.cameras, bpy.data.images):
        for blk in list(coll):
            if blk.users == 0:
                coll.remove(blk)


def export_glb(obs, path):
    bpy.context.view_layer.update()
    for o in bpy.data.objects:
        if o not in obs and o.name in bpy.context.view_layer.objects:
            o.select_set(False)
    for o in obs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", use_selection=True, export_apply=True,
        export_texcoords=False, export_normals=True, export_tangents=False,
        export_materials="EXPORT", export_vertex_color="NONE", export_attributes=False,
        export_cameras=False, export_lights=False, export_animations=False,
        export_skins=False, export_morph=False, export_yup=True, export_extras=False)


def build_and_export(name):
    reset_scene()
    fn, mode = BUILDERS[name]
    obs = fn()
    normalize(obs, mode)
    for ob in obs:
        finish(ob, 180.0 if name == "person" else SHARP_ANGLE)
    path = os.path.join(OUT_DIR, name + ".glb")
    export_glb(obs, path)
    lo, hi = bbox(obs)
    tris = sum(tri_count(o) for o in obs)
    print("[agents] %-14s tris=%5d  x[%.3f,%.3f] y[%.3f,%.3f] z[%.3f,%.3f]  %s" % (
        name, tris, lo.x, hi.x, lo.y, hi.y, lo.z, hi.z, ", ".join(o.name for o in obs)))
    return path


# --------------------------------------------------------------------------- previews

def setup_stage():
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.eevee.taa_render_samples = 96
    for attr, val in (("use_shadows", True), ("use_raytracing", True), ("use_fast_gi", True),
                      ("shadow_ray_count", 3), ("shadow_step_count", 12)):
        if hasattr(sc.eevee, attr):
            try:
                setattr(sc.eevee, attr, val)
            except Exception:
                pass
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.view_settings.exposure = 0.0
    sc.render.film_transparent = False
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"

    world = bpy.data.worlds.get("bench") or bpy.data.worlds.new("bench")
    sc.world = world
    if world.node_tree is None:
        try:
            world.use_nodes = True
        except Exception:
            pass
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.80, 0.80, 0.80, 1.0)
    bg.inputs[1].default_value = 0.32

    gm = make_material("preview_ground", (0.62, 0.62, 0.62), 0.9)
    me = bpy.data.meshes.new("ground")
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(gm)
    g = bpy.data.objects.new("ground", me)
    sc.collection.objects.link(g)

    ld = bpy.data.lights.new("key", "AREA")
    ld.shape = "DISK"
    ld.size = 3.5
    ld.energy = 330
    if hasattr(ld, "use_shadow_jitter"):
        ld.use_shadow_jitter = True
    key = bpy.data.objects.new("key", ld)
    az, el, dist = radians(-50), radians(52), 5.0
    key.location = (dist * cos(el) * sin(az), -dist * cos(el) * cos(az), dist * sin(el))
    key.rotation_euler = (Vector((0, 0, 0.3)) - key.location).to_track_quat("-Z", "Y").to_euler()
    sc.collection.objects.link(key)

    ld2 = bpy.data.lights.new("fill", "AREA")
    ld2.size = 5.0
    ld2.energy = 80
    fill = bpy.data.objects.new("fill", ld2)
    az, el = radians(120), radians(35)
    fill.location = (dist * cos(el) * sin(az), -dist * cos(el) * cos(az), dist * sin(el))
    fill.rotation_euler = (Vector((0, 0, 0.3)) - fill.location).to_track_quat("-Z", "Y").to_euler()
    sc.collection.objects.link(fill)


def frame_camera(points, az=radians(35), el=radians(26), lens=60, res=(900, 900), margin=1.10):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = res
    cd = bpy.data.cameras.new("cam")
    cd.lens = lens
    cd.sensor_fit = "HORIZONTAL"
    cd.sensor_width = 36
    cam = bpy.data.objects.new("cam", cd)
    sc.collection.objects.link(cam)
    sc.camera = cam
    dirv = Vector((sin(az) * cos(el), -cos(az) * cos(el), sin(el)))
    fwd = -dirv
    q = fwd.to_track_quat("-Z", "Y")
    right = q @ Vector((1, 0, 0))
    up = q @ Vector((0, 1, 0))
    lo = Vector([min(p[i] for p in points) for i in range(3)])
    hi = Vector([max(p[i] for p in points) for i in range(3)])
    target = (lo + hi) / 2
    aspect = res[0] / res[1]
    tx = 18.0 / lens
    ty = tx / aspect

    def fits(D):
        C = target + dirv * D
        for p in points:
            d = Vector(p) - C
            z = d.dot(fwd)
            if z <= 0 or abs(d.dot(right)) / z > tx / margin or abs(d.dot(up)) / z > ty / margin:
                return False
        return True

    a, b = 0.1, 100.0
    for _ in range(60):
        mid = (a + b) / 2
        if fits(mid):
            b = mid
        else:
            a = mid
    # recentre: shift the camera sideways so the projected box is centred
    C = target + dirv * b
    xs, ys = [], []
    for p in points:
        d = Vector(p) - C
        z = d.dot(fwd)
        xs.append(d.dot(right) / z)
        ys.append(d.dot(up) / z)
    cd.shift_x = ((max(xs) + min(xs)) / 2) / (2 * tx)
    cd.shift_y = ((max(ys) + min(ys)) / 2) / (2 * tx)
    cam.location = C
    cam.rotation_euler = q.to_euler()
    return cam


def corners(lo, hi):
    return [(x, y, z) for x in (lo.x, hi.x) for y in (lo.y, hi.y) for z in (lo.z, hi.z)]


def render_preview(name, out_png, res=(900, 900), label=False):
    reset_scene()
    setup_stage()
    plaster, shade = materials()
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(OUT_DIR, name + ".glb"))
    obs = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    pts = []
    for o in obs:
        for i, slot in enumerate(o.material_slots):
            if slot.material:
                base = slot.material.name.split(".")[0]
                slot.material = plaster if base == "plaster" else shade
        for v in o.data.vertices:
            pts.append(o.matrix_world @ v.co)
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    frame_pts = corners(lo, hi)
    az = radians(35)
    if label:
        cu = bpy.data.curves.new("label", "FONT")
        cu.body = name.replace("_", " ")
        cu.size = 0.085
        cu.align_x = "CENTER"
        cu.align_y = "CENTER"
        lab = bpy.data.objects.new("label", cu)
        lab.data.materials.append(make_material("preview_ink", (0.18, 0.18, 0.2), 0.9))
        # lay the label on the bench just in front of the model, towards the camera
        toward = Vector((sin(az), -cos(az), 0.0))
        reach = max(Vector((x, y, 0)).dot(toward) for x in (lo.x, hi.x) for y in (lo.y, hi.y))
        c = toward * (reach + 0.13) + Vector((0, 0, 0.002))
        lab.location = c
        lab.rotation_euler = (0, 0, az)
        bpy.context.scene.collection.objects.link(lab)
        w = 0.05 * len(cu.body) / 2
        ax = Vector((cos(az), sin(az), 0))
        frame_pts += [c + ax * w + toward * 0.05, c - ax * w + toward * 0.05,
                      c + ax * w - toward * 0.05, c - ax * w - toward * 0.05]
    frame_camera(frame_pts, az=az, res=res, margin=1.12 if not label else 1.06)
    bpy.context.scene.render.filepath = out_png
    bpy.ops.render.render(write_still=True)


def contact_sheet(tiles, out_png, cols=3):
    import numpy as np
    imgs = [bpy.data.images.load(p, check_existing=False) for p in tiles]
    w, h = imgs[0].size
    rows = (len(imgs) + cols - 1) // cols
    sheet = np.ones((rows * h, cols * w, 4), dtype=np.float32)
    first = np.empty(w * h * 4, dtype=np.float32)
    imgs[0].pixels.foreach_get(first)
    sheet[:, :, :] = first.reshape(h, w, 4)[0:8, 0:8].reshape(-1, 4).mean(axis=0)   # bench tone
    for idx, img in enumerate(imgs):
        px = np.empty(w * h * 4, dtype=np.float32)
        img.pixels.foreach_get(px)
        px = px.reshape(h, w, 4)
        r, c = idx // cols, idx % cols
        y0 = (rows - 1 - r) * h                       # Blender images are bottom-up
        sheet[y0:y0 + h, c * w:(c + 1) * w, :] = px
    out = bpy.data.images.new("contact_sheet", cols * w, rows * h, alpha=False)
    out.pixels.foreach_set(sheet.ravel())
    out.filepath_raw = out_png
    out.file_format = "PNG"
    out.save()


# --------------------------------------------------------------------------- main

def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    only = None
    previews = "--no-previews" not in argv
    if "--only" in argv:
        only = argv[argv.index("--only") + 1].split(",")
    names = [n for n in ORDER if only is None or n in only]
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    t0 = time.time()
    for n in names:
        build_and_export(n)
    print("[agents] exported %d assets in %.1fs" % (len(names), time.time() - t0))
    if not previews:
        return
    for n in names:
        render_preview(n, os.path.join(PREVIEW_DIR, n + ".png"))
    if only is None:
        tiles = []
        for n in ORDER:
            p = os.path.join(PREVIEW_DIR, "_tile_" + n + ".png")
            render_preview(n, p, res=(500, 500), label=True)
            tiles.append(p)
        contact_sheet(tiles, os.path.join(PREVIEW_DIR, "contact_sheet.png"), cols=5)
        for p in tiles:
            os.remove(p)
    print("[agents] done in %.1fs" % (time.time() - t0))


main()

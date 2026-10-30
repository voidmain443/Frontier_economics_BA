"""
common.py -- shared helpers for the agent style studies in tools/blender/styles.

Nothing here writes outside tools/blender/styles. The current assets in
prototype/traditional/assets/agents are only ever *read* (style A).

Output contract (same as tools/blender/make_agents.py):
  * GLB, +Y up, metres; POSITION + NORMAL + indices only.
  * Footprint max(X, Z) == 1.0, base at y = 0, centred on x = z = 0.
    `person` is 1.0 tall instead (the existing exception; the site places person
    and firm at the same `scale`, so a footprint-normalised person would be ~3x too tall).
  * Materials named exactly `plaster` and `shade`; one mesh node, one primitive per material.
  * Front faces glTF +Z (Blender -Y).

Modelling is in Blender's Z-up frame: X = width, Y = depth (front = -Y), Z = up.
"""

import bpy
import bmesh
import os
import sys
import json
import random
from math import radians, sin, cos, tan, pi, atan2, sqrt
from mathutils import Vector, Matrix, geometry

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
ASSET_DIR = os.path.join(REPO, "prototype", "traditional", "assets", "agents")   # read-only
RAW_DIR = os.path.join(HERE, "_raw")
AGENTS = ["household", "firm", "bank", "government", "central_bank", "rest_of_world", "person"]
P, S = 0, 1

# site colours (fold.js PLASTER / SHADE) and the brief's paper + plaster
PAPER = "#E8ECE6"
PLASTER_HEX = "#F2F1EB"
SHADE_SRGB = (0.70, 0.73, 0.72)


def args():
    return sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default=None):
    a = args()
    return a[a.index(name) + 1] if name in a else default


def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_lin(h):
    h = h.lstrip("#")
    return tuple(srgb_to_lin(int(h[i:i + 2], 16) / 255.0) for i in (0, 2, 4))


# --------------------------------------------------------------------------- materials

def make_material(name, rgb_lin, rough=0.85, spec=0.2):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = (*rgb_lin, 1.0)
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
                n.inputs["Base Color"].default_value = (*rgb_lin, 1.0)
                n.inputs["Roughness"].default_value = rough
                n.inputs["Metallic"].default_value = 0.0
                if "Specular IOR Level" in n.inputs:
                    n.inputs["Specular IOR Level"].default_value = spec
    return m


def export_materials():
    """The two contract materials (their base colours are the site's PLASTER / SHADE)."""
    return (make_material("plaster", tuple(srgb_to_lin(c) for c in (0.95, 0.945, 0.92))),
            make_material("shade", tuple(srgb_to_lin(c) for c in SHADE_SRGB)))


def render_materials():
    return (make_material("r_plaster", hex_lin(PLASTER_HEX), 0.9, 0.15),
            make_material("r_shade", tuple(srgb_to_lin(c) for c in SHADE_SRGB), 0.9, 0.1))


# --------------------------------------------------------------------------- 2D outline helpers

def fillet(pts, r, segs=6):
    """Round the corners of a closed polygon. r: float or per-vertex list (0 = sharp)."""
    n = len(pts)
    rs = r if isinstance(r, (list, tuple)) else [r] * n
    out = []
    for i in range(n):
        B = Vector(pts[i])
        ri = rs[i]
        if ri <= 0:
            out.append((B.x, B.y))
            continue
        A, C = Vector(pts[i - 1]), Vector(pts[(i + 1) % n])
        u, v = (A - B), (C - B)
        la, lc = u.length, v.length
        u.normalize()
        v.normalize()
        cosang = max(-1.0, min(1.0, u.dot(v)))
        ang = atan2(abs(u.x * v.y - u.y * v.x), cosang)      # angle between edges (0..pi)
        if ang < 1e-3 or ang > pi - 1e-3:
            out.append((B.x, B.y))
            continue
        half = ang / 2
        d = ri / tan(half)
        dmax = 0.5 * min(la, lc)
        if d > dmax:
            d = dmax
            ri = d * tan(half)
        T1, T2 = B + u * d, B + v * d
        bis = (u + v).normalized()
        Cc = B + bis * (ri / sin(half))
        a1 = atan2(T1.y - Cc.y, T1.x - Cc.x)
        a2 = atan2(T2.y - Cc.y, T2.x - Cc.x)
        da = a2 - a1
        while da > pi:
            da -= 2 * pi
        while da < -pi:
            da += 2 * pi
        k = max(1, segs)
        for j in range(k + 1):
            a = a1 + da * j / k
            out.append((Cc.x + ri * cos(a), Cc.y + ri * sin(a)))
    return out


def circle(cx, cy, r, n=32, a0=0.0, a1=None, cw=False):
    """Points on a circle (closed, n points) or an arc a0..a1 inclusive."""
    if a1 is None:
        pts = [(cx + r * cos(a0 + 2 * pi * i / n), cy + r * sin(a0 + 2 * pi * i / n)) for i in range(n)]
    else:
        pts = [(cx + r * cos(a0 + (a1 - a0) * i / n), cy + r * sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]
    return pts[::-1] if cw else pts


def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def area2(pts):
    return sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1]
               for i in range(len(pts))) / 2


def offset_poly(pts, d):
    """Offset a simple polygon by d (positive = outward), mitred."""
    if area2(pts) < 0:
        return offset_poly(pts[::-1], d)[::-1]
    n = len(pts)
    out = []
    for i in range(n):
        A, B, C = Vector(pts[i - 1]), Vector(pts[i]), Vector(pts[(i + 1) % n])
        e1, e2 = (B - A).normalized(), (C - B).normalized()
        n1, n2 = Vector((e1.y, -e1.x)), Vector((e2.y, -e2.x))     # outward for CCW
        m = (n1 + n2)
        if m.length < 1e-6:
            m = n1
        m.normalize()
        k = d / max(0.3, m.dot(n1))
        P_ = B + m * k
        out.append((P_.x, P_.y))
    return out


def dedupe(pts, eps=1e-6):
    out = []
    for p in pts:
        if not out or (abs(p[0] - out[-1][0]) > eps or abs(p[1] - out[-1][1]) > eps):
            out.append(p)
    if len(out) > 1 and abs(out[0][0] - out[-1][0]) < eps and abs(out[0][1] - out[-1][1]) < eps:
        out.pop()
    return out


# --------------------------------------------------------------------------- mesh builder

def axis_matrix(axis="Z", origin=(0, 0, 0)):
    if axis == "Z":
        R = Matrix.Identity(4)
    elif axis == "X":
        R = Matrix.Rotation(pi / 2, 4, "Y")
    elif axis == "Y":
        R = Matrix.Rotation(-pi / 2, 4, "X")
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

    def slab(self, outer, holes=(), y0=-0.1, y1=0.1, m=P, M=None, axis="Y"):
        """A flat outline (u, w) with holes, extruded between a0 and a1.
        axis 'Y': (u, w) = (x, z), extruded along y (a front-facing silhouette).
        axis 'Z': (u, w) = (x, y), extruded along z (a plan shape)."""
        loops = [dedupe(outer)] + [dedupe(h) for h in holes]

        def co(p, a):
            c = Vector((p[0], a, p[1])) if axis == "Y" else Vector((p[0], p[1], a))
            return M @ c if M is not None else c
        A = [[self.v(co(p, y0)) for p in L] for L in loops]
        B = [[self.v(co(p, y1)) for p in L] for L in loops]
        fa = [v for L in A for v in L]
        fb = [v for L in B for v in L]
        if len(loops) == 1:
            self.f(A[0], m)
            self.f(B[0][::-1], m)
        else:
            tris = geometry.tessellate_polygon([[(p[0], p[1], 0.0) for p in L] for L in loops])
            for a, b, c in tris:
                self.f([fa[a], fa[b], fa[c]], m)
                self.f([fb[c], fb[b], fb[a]], m)
        for k, L in enumerate(loops):
            n = len(L)
            for i in range(n):
                j = (i + 1) % n
                self.f([A[k][i], A[k][j], B[k][j], B[k][i]], m)

    def lathe(self, prof, segs=32, M=None, m=P, seg_m=None, closed=False, phase=0.0):
        M = M if M is not None else Matrix.Identity(4)
        rings = []
        for r, h in prof:
            if r <= 1e-9:
                rings.append([self.v(M @ Vector((0, 0, h)))])
            else:
                rings.append([self.v(M @ Vector((r * cos(2 * pi * i / segs + phase),
                                                 r * sin(2 * pi * i / segs + phase), h)))
                              for i in range(segs)])
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
        r1 = r if r1 is None else r1
        org = {"Z": (x, y, 0), "X": (0, x, y), "Y": (x, 0, y)}[axis]
        self.lathe([(r, z0), (r1, z1)], segs, axis_matrix(axis, org), m)

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
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts[:], dist=1e-7)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces[:])
        me = bpy.data.meshes.new(name)
        self.bm.to_mesh(me)
        self.bm.free()
        plaster, shade = export_materials()
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


def bevel(ob, width, segments=1, angle=30.0, profile=0.5):
    if width <= 0:
        return ob
    mod = ob.modifiers.new("bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.profile = profile
    mod.limit_method = "ANGLE"
    mod.angle_limit = radians(angle)
    mod.use_clamp_overlap = True
    mod.harden_normals = False
    apply_modifiers(ob)
    return ob


def cut(ob, mb_cutter):
    c = mb_cutter.to_object(ob.name + "_cutter")
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


def part(mb, name, bevel_w=0.0, segments=1, cutter=None, angle=30.0):
    ob = mb.to_object(name)
    if cutter is not None:
        cut(ob, cutter)
    if bevel_w:
        bevel(ob, bevel_w, segments, angle)
    return ob


def join(obs, name):
    bm = bmesh.new()
    for ob in obs:
        bm.from_mesh(ob.data)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    plaster, shade = export_materials()
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
            co = ob.matrix_world @ v.co
            for i in range(3):
                lo[i] = min(lo[i], co[i])
                hi[i] = max(hi[i], co[i])
    return lo, hi


def normalize(obs, mode="footprint"):
    lo, hi = bbox(obs)
    d = hi - lo
    s = {"footprint": 1.0 / max(d.x, d.y), "height": 1.0 / d.z}[mode]
    T = Matrix.Diagonal((s, s, s, 1.0)) @ Matrix.Translation(
        (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z))
    for ob in obs:
        ob.data.transform(T)
        ob.data.update()
    return s


def finish(ob, sharp=30.0):
    me = ob.data
    me.name = ob.name
    for uv in list(me.uv_layers):
        me.uv_layers.remove(uv)
    for ca in list(me.color_attributes):
        me.color_attributes.remove(ca)
    used = {p.material_index for p in me.polygons}
    if used == {0} and len(me.materials) > 1:
        me.materials.pop(index=1)
    me.shade_smooth()
    me.set_sharp_from_angle(angle=radians(sharp))
    harden_flat(me)
    me.validate()
    me.update()


def harden_flat(me, eps=1e-4, tol=radians(3)):
    """Keep axis-aligned flat faces (fronts, tops, bottoms) flat-shaded: mark sharp every edge
    between such a face and a face that turns away from it. Without this, a bevel step that
    meets a big triangulated cap at a shallow angle tilts the cap's border normals and the
    long cap triangles shade as visible facets."""
    bm = bmesh.new()
    bm.from_mesh(me)
    axes = [Vector(a) for a in ((1, 0, 0), (0, 1, 0), (0, 0, 1))]

    def flat(f):
        n = f.normal
        return any(abs(abs(n.dot(a)) - 1.0) < eps for a in axes)
    for e in bm.edges:
        if len(e.link_faces) != 2 or not e.smooth:
            continue
        f1, f2 = e.link_faces
        if (flat(f1) or flat(f2)) and f1.normal.angle(f2.normal, 0.0) > tol:
            e.smooth = False
    bm.to_mesh(me)
    bm.free()


def tri_count(ob):
    me = ob.data
    me.calc_loop_triangles()
    return len(me.loop_triangles)


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
        if o.name in bpy.context.view_layer.objects:
            o.select_set(o in obs)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", use_selection=True, export_apply=True,
        export_texcoords=False, export_normals=True, export_tangents=False,
        export_materials="EXPORT", export_vertex_color="NONE", export_attributes=False,
        export_cameras=False, export_lights=False, export_animations=False,
        export_skins=False, export_morph=False, export_yup=True, export_extras=False)


def build_set(builders, out_dir, sharp_for=None):
    """builders: {name: (fn, mode)}. Exports <out_dir>/<name>.glb, returns {name: tris}."""
    os.makedirs(out_dir, exist_ok=True)
    tris = {}
    for name, (fn, mode) in builders.items():
        reset_scene()
        obs = fn()
        normalize(obs, mode)
        for ob in obs:
            ob.name = name
            finish(ob, (sharp_for or {}).get(name, 30.0))
        export_glb(obs, os.path.join(out_dir, name + ".glb"))
        lo, hi = bbox(obs)
        t = sum(tri_count(o) for o in obs)
        tris[name] = t
        print("[styles] %-20s tris=%5d  x[%.3f,%.3f] y[%.3f,%.3f] z[%.3f,%.3f]" % (
            name, t, lo.x, hi.x, lo.y, hi.y, lo.z, hi.z))
    with open(os.path.join(out_dir, "tris.json"), "w") as fh:
        json.dump(tris, fh, indent=1)
    return tris

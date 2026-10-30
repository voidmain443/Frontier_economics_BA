"""
compose.py -- labels the contact sheets and builds compare.png (system Python + Pillow).

    python3 tools/blender/styles/compose.py

Reads styles/_raw/<S>-sheet.png + .json (written by render.py) and styles/<S>-crowd.png;
writes styles/<S>-sheet.png and styles/compare.png. Labels are set in Futura, the face
the Isotype pictograms were published with.
"""

import json
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "_raw")
FUTURA = "/System/Library/Fonts/Supplemental/Futura.ttc"
INK = (52, 58, 55)
MUTED = (120, 128, 123)
PAPER = (232, 236, 230)
STYLES = {
    "A": ("A  Plaster maquettes", "current assets, unchanged"),
    "B": ("B  Isotype", "extruded pictogram silhouettes"),
    "C": ("C  Pieces", "turned and faceted game pieces"),
}


def font(size, index=0):
    try:
        return ImageFont.truetype(FUTURA, size, index=index)
    except Exception:
        return ImageFont.load_default()


def sheet(style):
    im = Image.open(os.path.join(RAW, style + "-sheet.png")).convert("RGB")
    meta = json.load(open(os.path.join(RAW, style + "-sheet.json")))
    d = ImageDraw.Draw(im)
    f_lab = font(30)
    for lab in meta["labels"]:
        text = lab["name"].replace("_", " ")
        w = d.textlength(text, font=f_lab)
        d.text((lab["x"] - w / 2, lab["bottom"] + 30), text, font=f_lab, fill=INK)
    title, sub = STYLES[style]
    d.text((56, 44), title, font=font(46, 0), fill=INK)
    d.text((58, 104), sub, font=font(28), fill=MUTED)
    out = os.path.join(HERE, style + "-sheet.png")
    im.save(out)
    return im


def compare(sheets):
    H, gap, pad = 560, 24, 40
    rows = []
    for s, sh in sheets.items():
        crowd = Image.open(os.path.join(HERE, s + "-crowd.png")).convert("RGB")
        a = sh.resize((round(sh.width * H / sh.height), H), Image.LANCZOS)
        b = crowd.resize((round(crowd.width * H / crowd.height), H), Image.LANCZOS)
        rows.append((a, b))
    W = max(a.width + gap + b.width for a, b in rows) + 2 * pad
    head = 110
    out = Image.new("RGB", (W, head + len(rows) * (H + gap) - gap + pad), (250, 250, 247))
    d = ImageDraw.Draw(out)
    d.text((pad, 34), "Agent maquettes: three style options", font=font(44), fill=INK)
    d.text((W - pad - d.textlength("sheet at contract scale  |  crowd: 120 person + 40 firm crowd variants",
                                   font=font(26)), 48),
           "sheet at contract scale  |  crowd: 120 person + 40 firm crowd variants", font=font(26), fill=MUTED)
    y = head
    for a, b in rows:
        out.paste(a, (pad, y))
        out.paste(b, (pad + a.width + gap, y))
        y += H + gap
    out.save(os.path.join(HERE, "compare.png"))


if __name__ == "__main__":
    done = {}
    for s in STYLES:
        if os.path.exists(os.path.join(RAW, s + "-sheet.png")):
            done[s] = sheet(s)
    compare(done)
    print("composed", ", ".join(done))

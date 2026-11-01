"""Draws the Halal-O app icons. Run: python3 assets/make_icons.py (from apps/mobile)."""
from PIL import Image, ImageDraw

GREEN = (27, 127, 75, 255)
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)
S = 4  # supersampling


def art(size, fg, mark_bg, mark_fg, scale=1.0):
    """Barcode bars with a check-mark badge, drawn in a transparent square."""
    n = size * S
    im = Image.new("RGBA", (n, n), CLEAR)
    d = ImageDraw.Draw(im)
    u = n * scale / 100  # 1 unit = 1% of the drawable area
    ox = oy = (n - n * scale) / 2
    bars = [(18, 5), (26, 3), (32, 7), (42, 3), (48, 5), (56, 3), (62, 7), (72, 4)]
    for x, w in bars:
        d.rounded_rectangle([ox + x * u, oy + 22 * u, ox + (x + w) * u, oy + 70 * u], radius=w * u / 2, fill=fg)
    cx, cy, r = ox + 70 * u, oy + 68 * u, 19 * u
    d.ellipse([cx - r - 3 * u, cy - r - 3 * u, cx + r + 3 * u, cy + r + 3 * u], fill=CLEAR if mark_bg == CLEAR else mark_fg)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=mark_bg if mark_bg != CLEAR else fg)
    tick = [(cx - 9 * u, cy + 1 * u), (cx - 2.5 * u, cy + 7.5 * u), (cx + 10 * u, cy - 6 * u)]
    d.line(tick, fill=mark_fg if mark_bg != CLEAR else CLEAR, width=int(5 * u), joint="curve")
    for x, y in (tick[0], tick[2]):
        rr = 2.5 * u
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=mark_fg if mark_bg != CLEAR else CLEAR)
    return im.resize((size, size), Image.LANCZOS)


def on(bg, layer):
    base = Image.new("RGBA", layer.size, bg)
    base.alpha_composite(layer)
    return base


# iOS / store icon: full-bleed square, no transparency (the OS rounds the corners).
on(GREEN, art(1024, WHITE, WHITE, GREEN)).convert("RGB").save("assets/icon.png")
# Android adaptive icon: art kept inside the central safe zone.
art(512, WHITE, WHITE, GREEN, scale=0.62).save("assets/android-icon-foreground.png")
Image.new("RGBA", (512, 512), GREEN).save("assets/android-icon-background.png")
art(432, WHITE, CLEAR, WHITE, scale=0.62).save("assets/android-icon-monochrome.png")
# Splash: green art on the white splash background.
art(1024, GREEN, GREEN, WHITE).save("assets/splash-icon.png")
on(GREEN, art(48, WHITE, WHITE, GREEN)).save("assets/favicon.png")
print("icons written")

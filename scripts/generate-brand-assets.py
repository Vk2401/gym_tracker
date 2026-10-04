"""Generates every app icon / splash image from resources/logo-source.png (the brand logo on
black). Run after changing the logo:  python3 scripts/generate-brand-assets.py  (needs Pillow).

Outputs: public/ (favicon, apple-touch, PWA + maskable icons, transparent logo for the web
splash), Android launcher + splash drawables, iOS AppIcon + launch image.
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
BG = (0, 0, 0, 255)  # the logo is drawn for a black background
# App icon background: diagonal brand-blue gradient (light top-left → deep bottom-right).
ICON_TOP_LEFT = (74, 156, 246)
ICON_BOTTOM_RIGHT = (30, 74, 206)
RES = ROOT / 'android/app/src/main/res'
IOS = ROOT / 'ios/App/App/Assets.xcassets'


def load_logo() -> Image.Image:
    """Source logo with the black background keyed out, trimmed to its artwork."""
    src = Image.open(ROOT / 'resources/logo-source.png').convert('RGBA')
    r, g, b, _ = src.split()
    # Alpha ramps from 0 (pure black) to 1 at brightness 40, so the dark-blue outline stays solid.
    peak = ImageChops.lighter(ImageChops.lighter(r, g), b)
    alpha = peak.point(lambda v: 0 if v <= 6 else min(255, (v - 6) * 255 // 34))
    out = Image.merge('RGBA', (r, g, b, alpha))
    return out.crop(out.getbbox())


def place(logo: Image.Image, w: int, h: int, frac: float, bg=BG) -> Image.Image:
    """Logo centred on a w×h canvas, its longer side = frac × the canvas' shorter side."""
    canvas = bg.copy() if isinstance(bg, Image.Image) else Image.new('RGBA', (w, h), bg)
    s = frac * min(w, h) / max(logo.size)
    lw, lh = round(logo.width * s), round(logo.height * s)
    canvas.alpha_composite(logo.resize((lw, lh), Image.LANCZOS), ((w - lw) // 2, (h - lh) // 2))
    return canvas


def gradient(size: int) -> Image.Image:
    """Square diagonal gradient, ICON_TOP_LEFT → ICON_BOTTOM_RIGHT."""
    ramp = Image.linear_gradient('L').resize((size * 2, size * 2)).rotate(45, Image.BICUBIC)
    t = ramp.crop((size // 2, size // 2, size // 2 + size, size // 2 + size))
    a = Image.new('RGBA', (size, size), ICON_TOP_LEFT + (255,))
    b = Image.new('RGBA', (size, size), ICON_BOTTOM_RIGHT + (255,))
    return Image.composite(b, a, t)


def icon(logo: Image.Image, size: int, frac: float) -> Image.Image:
    """App icon: logo centred on the blue gradient."""
    return place(logo, size, size, frac, bg=gradient(size))


def rounded(img: Image.Image, radius_frac: float) -> Image.Image:
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, img.width - 1, img.height - 1), round(img.width * radius_frac), fill=255
    )
    out = img.copy()
    out.putalpha(mask)
    return out


def circle(img: Image.Image) -> Image.Image:
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, img.width - 1, img.height - 1), fill=255)
    out = img.copy()
    out.putalpha(mask)
    return out


def save(img: Image.Image, path: Path, opaque=False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    (img.convert('RGB') if opaque else img).save(path, optimize=True)
    print(path.relative_to(ROOT))


def main() -> None:
    logo = load_logo()
    pub = ROOT / 'public'

    # Web / PWA
    web_logo = logo.resize((512, round(512 * logo.height / logo.width)), Image.LANCZOS)
    save(web_logo, pub / 'logo.png')
    save(rounded(icon(logo, 64, 0.84), 0.22), pub / 'favicon.png')
    save(icon(logo, 180, 0.74), pub / 'apple-touch-icon.png', opaque=True)
    for size in (192, 512):
        save(icon(logo, size, 0.8), pub / f'icon-{size}.png', opaque=True)
    save(icon(logo, 512, 0.6), pub / 'icon-maskable-512.png', opaque=True)

    # Android launcher (legacy square + round; adaptive = this foreground on
    # drawable/ic_launcher_background.xml, the same gradient)
    for density, px in (('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)):
        d = RES / f'mipmap-{density}'
        save(rounded(icon(logo, px, 0.78), 0.18), d / 'ic_launcher.png')
        save(circle(icon(logo, px, 0.68)), d / 'ic_launcher_round.png')
        fg = round(px * 108 / 48)
        save(place(logo, fg, fg, 0.52, bg=(0, 0, 0, 0)), d / 'ic_launcher_foreground.png')

    # Android launch image (pre-Android 12; 12+ uses the adaptive icon on black, styles.xml)
    save(place(logo, 480, 480, 0.4), RES / 'drawable/splash.png', opaque=True)
    for density, (w, h) in {
        'mdpi': (320, 480), 'hdpi': (480, 800), 'xhdpi': (720, 1280),
        'xxhdpi': (960, 1600), 'xxxhdpi': (1280, 1920),
    }.items():
        save(place(logo, w, h, 0.42), RES / f'drawable-port-{density}/splash.png', opaque=True)
        save(place(logo, h, w, 0.42), RES / f'drawable-land-{density}/splash.png', opaque=True)

    # iOS: App Store icon must be opaque; launch image is aspect-filled so the logo sits in
    # the middle 22 % (≈ 40 % of a phone's width).
    save(icon(logo, 1024, 0.76), IOS / 'AppIcon.appiconset/AppIcon-512@2x.png', opaque=True)
    splash = place(logo, 2732, 2732, 0.22)
    for name in ('splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'):
        save(splash, IOS / 'Splash.imageset' / name, opaque=True)


if __name__ == '__main__':
    main()

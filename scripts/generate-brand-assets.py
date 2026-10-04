"""Generates every app icon / splash image from resources/logo-source.png (the brand logo on
black). Run after changing the logo:  python3 scripts/generate-brand-assets.py  (needs Pillow).

Outputs: public/ (favicon, apple-touch, PWA + maskable icons, transparent logo for the web
splash), Android launcher icons + splash logo, iOS AppIcon + light/dark launch images.
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
BG = (0, 0, 0, 255)  # the logo is drawn for a black background
# PD-20 launch screens use the app's ground: light / dark (Android values[-night]/splash_colors.xml,
# index.html .splash).
SPLASH_LIGHT = (0xEB, 0xF1, 0xFE, 255)
SPLASH_DARK = (0x0A, 0x14, 0x30, 255)
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

    # Android launch screen: drawable/splash.xml layers this logo on @color/gt_splash_bg, which
    # follows the phone's light/dark mode (12+ uses the adaptive icon on the same colour).
    save(web_logo, RES / 'drawable-nodpi/gt_splash_logo.png')

    # iOS: App Store icon must be opaque; launch image is aspect-filled so the logo sits in
    # the middle 22 % (≈ 40 % of a phone's width).
    save(icon(logo, 1024, 0.76), IOS / 'AppIcon.appiconset/AppIcon-512@2x.png', opaque=True)
    # Light and dark variants; Splash.imageset/Contents.json picks by the phone's appearance.
    save(place(logo, 2732, 2732, 0.22, bg=SPLASH_LIGHT), IOS / 'Splash.imageset/splash-light.png', opaque=True)
    save(place(logo, 2732, 2732, 0.22, bg=SPLASH_DARK), IOS / 'Splash.imageset/splash-dark.png', opaque=True)


if __name__ == '__main__':
    main()

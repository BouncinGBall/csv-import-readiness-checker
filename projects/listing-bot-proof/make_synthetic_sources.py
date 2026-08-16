from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


WIDTH, HEIGHT = 1200, 1500
INK = "#12233A"
DENIM = "#255FA4"
DENIM_DARK = "#164477"
STITCH = "#E9B86A"
PAPER = "#F4EFE7"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        Path("C:/Windows/Fonts") / ("arialbd.ttf" if bold else "arial.ttf"),
        Path("/usr/share/fonts/truetype/dejavu") / ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"),
    ]
    for candidate in candidates:
        if candidate.is_file():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default(size=size)


def jacket(draw: ImageDraw.ImageDraw, view: str) -> None:
    draw.rounded_rectangle((190, 175, 1010, 1325), radius=46, fill="#FFFFFF")
    draw.text((230, 215), "SYNTHETIC INPUT", font=font(34, True), fill="#B44A2C")
    draw.text((230, 262), f"Test Atelier - {view}", font=font(27), fill="#6A625A")

    if view == "detail":
        draw.rounded_rectangle((310, 410, 890, 1110), radius=56, fill=DENIM)
        draw.rounded_rectangle((420, 540, 780, 910), radius=34, outline=STITCH, width=10)
        draw.line((430, 670, 770, 670), fill=STITCH, width=8)
        draw.ellipse((565, 700, 635, 770), fill="#E2D7C7", outline=INK, width=4)
        draw.text((420, 1010), "Pocket and stitching detail", font=font(28, True), fill="#FFFFFF")
        return

    body = [(370, 430), (830, 430), (915, 1190), (285, 1190)]
    draw.polygon(body, fill=DENIM, outline=DENIM_DARK)
    draw.polygon([(370, 450), (255, 545), (135, 1040), (315, 1090)], fill=DENIM, outline=DENIM_DARK)
    draw.polygon([(830, 450), (945, 545), (1065, 1040), (885, 1090)], fill=DENIM, outline=DENIM_DARK)
    draw.polygon([(450, 430), (600, 610), (750, 430)], fill="#E7EEF5", outline=STITCH)
    draw.line((600, 610, 600, 1180), fill=STITCH, width=8)
    for y in range(700, 1110, 105):
        draw.ellipse((580, y, 620, y + 40), fill="#E2D7C7", outline=INK, width=3)
    draw.rounded_rectangle((390, 700, 545, 875), radius=18, outline=STITCH, width=7)
    draw.rounded_rectangle((655, 700, 810, 875), radius=18, outline=STITCH, width=7)
    draw.line((300, 1138, 900, 1138), fill=STITCH, width=7)
    if view == "back":
        draw.rectangle((360, 425, 840, 1190), fill=DENIM)
        draw.line((600, 460, 600, 1150), fill=STITCH, width=7)
        draw.line((385, 590, 815, 590), fill=STITCH, width=7)


def main() -> None:
    target = Path(__file__).resolve().parent
    for view in ("front", "back", "detail"):
        canvas = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
        draw = ImageDraw.Draw(canvas)
        jacket(draw, view)
        draw.text((190, 1380), "Code-generated image - no real product or seller data", font=font(25), fill="#6A625A")
        canvas.save(target / f"synthetic-source-{view}.png", "PNG", optimize=True)


if __name__ == "__main__":
    main()

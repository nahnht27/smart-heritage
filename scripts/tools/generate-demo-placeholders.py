#!/usr/bin/env python3
"""Generate original placeholder illustrations for the demo artifact media.

Output is purely programmatic geometric artwork created for this project
(no third-party imagery). Requires Pillow and DejaVu Sans fonts.
Usage: python3 scripts/tools/generate-demo-placeholders.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'src',
                   'main', 'resources', 'static', 'demo-media', 'artifacts')
FONT_DIR = '/usr/share/fonts/truetype/dejavu/'
W, H = 1200, 800

SITES = {
    '01': ('Hoàng thành Thăng Long', (122, 46, 46)),
    '02': ('Đại Nội Huế', (46, 74, 122)),
    '03': ('Văn Miếu - Quốc Tử Giám', (46, 110, 78)),
    '04': ('Thành nhà Hồ', (110, 84, 40)),
}

ITEMS = {
    'artifact_01_01_kinh_thien_stone_dragon.jpg': 'Rồng đá thềm điện Kính Thiên',
    'artifact_01_02_thang_long_ancient_ceramics.jpg': 'Đồ gốm khai quật tại Hoàng thành Thăng Long',
    'artifact_01_03_ly_phoenix_bodhi_leaf.jpg': 'Hình tượng phượng trên lá đề',
    'artifact_01_04_early_le_white_dragon_bowl.jpg': 'Bát gốm men trắng',
    'artifact_01_05_thang_long_doan_mon.jpg': 'Đoan môn Hoàng thành Thăng Long',
    'artifact_02_01_hue_nine_dynastic_urns.jpg': 'Cửu đỉnh Đại Nội Huế',
    'artifact_02_02_nguyen_dynasty_nine_holy_cannons.jpg': 'Cửu vị thần công',
    'artifact_02_03_minh_mang_ngo_mon_bell.jpg': 'Chuông Ngọ Môn',
    'artifact_02_04_minh_mang_stone_relief.jpg': 'Phù điêu đá thời Minh Mạng',
    'artifact_02_05_hue_ngo_mon_gate.jpg': 'Cổng Ngọ Môn',
    'artifact_03_01_van_mieu_khue_van_cac.jpg': 'Khuê Văn Các',
    'artifact_03_02_van_mieu_doctoral_steles.jpg': 'Bia Tiến sĩ',
    'artifact_03_03_van_mieu_thien_quang_well.jpg': 'Giếng Thiên Quang',
    'artifact_03_04_van_mieu_dai_thanh_hall.jpg': 'Đại Thành môn',
    'artifact_03_05_van_mieu_thai_hoc_house.jpg': 'Nhà Thái Học',
    'artifact_04_01_ho_citadel_south_gate.jpg': 'Cổng Nam Thành nhà Hồ',
    'artifact_04_02_ho_citadel_north_gate.jpg': 'Cổng Bắc Thành nhà Hồ',
    'artifact_04_03_ho_citadel_east_gate.jpg': 'Cổng Đông Thành nhà Hồ',
    'artifact_04_04_ho_citadel_west_gate.jpg': 'Cổng Tây Thành nhà Hồ',
    'artifact_04_05_ho_citadel_stone_walls.jpg': 'Tường thành đá Thành nhà Hồ',
}


def font(bold, size):
    return ImageFont.truetype(
        FONT_DIR + ('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'), size)


def wrap(draw, text, fnt, max_w):
    lines, cur = [], ''
    for word in text.split():
        trial = (cur + ' ' + word).strip()
        if draw.textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    lines.append(cur)
    return lines


def center(draw, y, text, fnt, fill):
    w = draw.textlength(text, font=fnt)
    draw.text(((W - w) / 2, y), text, font=fnt, fill=fill)


def render(name, title, number):
    site_name, base = SITES[name.split('_')[1]]
    light = tuple(min(255, c + 150) for c in base)
    img = Image.new('RGB', (W, H), tuple(min(255, c + 185) for c in base))
    d = ImageDraw.Draw(img)
    # simple abstract pattern, offset by item number
    for i in range(-H, W, 60):
        d.line([(i, 0), (i + H, H)], fill=light, width=2)
    d.rectangle([0, 0, W, 120], fill=base)
    d.rectangle([0, H - 90, W, H], fill=base)
    d.rectangle([60, 170, W - 60, H - 130], fill=(255, 255, 255),
                outline=base, width=6)
    d.ellipse([W / 2 - 40 - 0, 205, W / 2 + 40, 285], outline=base, width=6)
    d.polygon([(W / 2 - 25, 265), (W / 2, 225), (W / 2 + 25, 265)], fill=base)
    center(d, 28, 'ẢNH MINH HỌA', font(True, 56), (255, 255, 255))
    y = 320
    f_title = font(True, 50)
    for line in wrap(d, title, f_title, W - 200):
        center(d, y, line, f_title, base)
        y += 66
    center(d, y + 10, site_name, font(False, 34), (70, 70, 70))
    center(d, H - 250, 'Hình minh họa do dự án tự tạo,', font(False, 28), (70, 70, 70))
    center(d, H - 215, 'không phải ảnh chụp hiện vật hay di tích thật', font(False, 28), (70, 70, 70))
    center(d, H - 70, 'Smart Heritage demo placeholder #%02d' % number,
           font(False, 30), (255, 255, 255))
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    for index, (name, title) in enumerate(sorted(ITEMS.items()), 1):
        render(name, title, index).save(
            os.path.join(OUT, name), 'JPEG', quality=85, optimize=True)
        print('wrote', name)


if __name__ == '__main__':
    main()

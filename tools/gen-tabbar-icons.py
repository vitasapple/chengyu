#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成 tabBar 图标（81x81 PNG，透明底）

无第三方依赖，自己实现最小 PNG 编码器 + 4x 超采样抗锯齿。
用法：python3 tools/gen-tabbar-icons.py
输出：static/tabbar/{index,hub,me}.png 与对应的 -active.png

配色与页面一致：
  未选中 #b8ac93  选中 #6b4f2a
"""

import os
import zlib

SIZE = 81          # 微信建议 81x81
SS = 4             # 超采样倍数（内部按 324x324 绘制再降采样）
HI = SIZE * SS

COLOR_NORMAL = (0xB8, 0xAC, 0x93)
COLOR_ACTIVE = (0x6B, 0x4F, 0x2A)

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'static', 'tabbar')

SCALE = HI / SIZE


# ---------- 形状（坐标均以 81 逻辑像素表达，命中返回 True） ----------

def rounded_rect(x, y, x0, y0, x1, y1, r):
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r or (x0 <= x <= x1 and y0 <= y <= y1 and
            (x0 + r <= x <= x1 - r or y0 + r <= y <= y1 - r))


def circle(x, y, cx, cy, r):
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def shape_index(x, y):
    """闯关：2x2 宫格"""
    return (rounded_rect(x, y, 12, 12, 38, 38, 7) or
            rounded_rect(x, y, 43, 12, 69, 38, 7) or
            rounded_rect(x, y, 12, 43, 38, 69, 7) or
            rounded_rect(x, y, 43, 43, 69, 69, 7))


def shape_hub(x, y):
    """合集：拼图块（圆角方块 + 右上、右下两个凸点）"""
    body = rounded_rect(x, y, 13, 17, 62, 66, 10)
    bump_top = circle(x, y, 37, 15, 8)
    bump_right = circle(x, y, 64, 42, 8)
    # 中间镂一个圆角方孔，避免与「闯关」宫格观感重复
    hole = rounded_rect(x, y, 27, 31, 49, 53, 6)
    return (body or bump_top or bump_right) and not hole


def shape_me(x, y):
    """我的：头像 + 肩部"""
    return (circle(x, y, 40.5, 27, 13.5) or
            rounded_rect(x, y, 16, 46, 65, 76, 15))


# ---------- 渲染 ----------

def render(shape, rgb):
    """按 4x 超采样算覆盖率，降采样成 81x81 的 alpha 通道"""
    pixels = bytearray()
    for py in range(SIZE):
        row = bytearray()
        for px in range(SIZE):
            hit = 0
            for sy in range(SS):
                for sx in range(SS):
                    x = px * SS + sx + 0.5
                    y = py * SS + sy + 0.5
                    if shape(x / SCALE, y / SCALE):
                        hit += 1
            alpha = int(round(hit / (SS * SS) * 255))
            r, g, b = rgb if alpha else (0, 0, 0)   # 全透明处 RGB 归零，避免预览色噪声
            row += bytes((r, g, b, alpha))
        pixels += row
    return bytes(pixels)


def write_png(path, rgba, size=SIZE):
    def chunk(tag, data):
        c = tag + data
        return (len(data)).to_bytes(4, 'big') + c + zlib.crc32(c).to_bytes(4, 'big')

    stride = size * 4
    raw = b''.join(b'\x00' + rgba[(y * stride):(y * stride + stride)] for y in range(size))
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', size.to_bytes(4, 'big') + size.to_bytes(4, 'big') + bytes((8, 6, 0, 0, 0)))
           + chunk(b'IDAT', zlib.compress(raw, 9))
           + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, shape in (('index', shape_index), ('hub', shape_hub), ('me', shape_me)):
        write_png(os.path.join(OUT_DIR, name + '.png'), render(shape, COLOR_NORMAL))
        write_png(os.path.join(OUT_DIR, name + '-active.png'), render(shape, COLOR_ACTIVE))
        print('生成', name + '.png /', name + '-active.png')
    print('输出目录：', OUT_DIR)


if __name__ == '__main__':
    main()

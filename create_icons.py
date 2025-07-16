#!/usr/bin/env python3
"""
Simple script to create extension icons without PIL dependency
"""
import os
import subprocess

# Create icons directory
os.makedirs('icons', exist_ok=True)

# SVG template for the icon
svg_template = '''<svg width="{size}" height="{size}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="{center}" cy="{center}" r="{radius}" fill="#677eea" stroke="#5a6fd8" stroke-width="2"/>
  <circle cx="{center}" cy="{center}" r="{inner_radius}" fill="rgba(255,255,255,0.9)" stroke="#677eea" stroke-width="1"/>
  <path d="M {check_x1} {check_y1} L {check_x2} {check_y2} L {check_x3} {check_y3}" 
        stroke="#677eea" stroke-width="{stroke_width}" fill="none" stroke-linecap="round"/>
  <text x="{center}" y="{text_y}" text-anchor="middle" font-family="Arial, sans-serif" 
        font-size="{font_size}" font-weight="bold" fill="#677eea">MW</text>
</svg>'''

def create_icon_svg(size):
    center = size // 2
    radius = size // 2 - 2
    inner_radius = size // 3
    
    # Checkmark coordinates
    check_x1 = size // 4
    check_y1 = center
    check_x2 = center - size // 8
    check_y2 = center + size // 6
    check_x3 = size - size // 4
    check_y3 = center - size // 6
    
    stroke_width = max(1, size // 16)
    font_size = size // 4
    text_y = center + font_size // 3
    
    return svg_template.format(
        size=size, center=center, radius=radius, inner_radius=inner_radius,
        check_x1=check_x1, check_y1=check_y1, check_x2=check_x2, check_y2=check_y2,
        check_x3=check_x3, check_y3=check_y3, stroke_width=stroke_width,
        font_size=font_size, text_y=text_y
    )

# Create SVG files for each size
sizes = [16, 32, 48, 128]
for size in sizes:
    svg_content = create_icon_svg(size)
    svg_path = f'icons/icon{size}.svg'
    
    with open(svg_path, 'w') as f:
        f.write(svg_content)
    
    print(f'Created {svg_path}')

print("SVG icons created successfully!")
print("Note: Browsers can use SVG icons directly, or you can convert to PNG using online tools.")
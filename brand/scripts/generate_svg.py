import os

def generate_svg(output_path='brand/svg/mark.svg'):
    """
    Pure geometric vectorization of the Lecture Whisper master brand mark.
    Coordinate system: 512x512 viewBox, centered at (256, 256).
    
    Geometry Specifications:
    - Frame Outer Dimensions: 277.5 x 356.5 px, centered at (255.75, 255.75)
    - Frame Stroke Thickness: 25.0 px constant width
    - Outer Corner Radius: 38.0 px (TL, BL, BR)
    - Top-Right Chamfer: 45.0-degree diagonal (87 px extent) with 14 px fillets
    - Top-Right Fold Cutout Flap: 41.5 x 42.5 px at (314.5, 116) with 9 px inner fillet
    - Inner Hole Corner Radius: 17.0 px (BL, BR, TL), 30.5 px fillet under fold
    - Audio Waveform: 16.5 px stroke width, round caps & joins, baseline y=234.5
    - Document Text Lines (3x): 16.5 px stroke width, round caps, spaced 31.5 px vertically
    """
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
  <!-- Document Outer Frame with Fold Cutout -->
  <path fill-rule="evenodd" d="
    M 155,77.5
    L 305,77.5
    A 14,14 0 0 1 315,83.5
    L 388.5,157
    A 14,14 0 0 1 394.5,167
    L 394.5,396
    A 38,38 0 0 1 356.5,434
    L 155,434
    A 38,38 0 0 1 117,396
    L 117,115.5
    A 38,38 0 0 1 155,77.5
    Z
    M 159,102
    L 283,102
    A 9,9 0 0 1 292,111
    L 292,151
    A 30.5,30.5 0 0 0 322.5,181.5
    L 360.5,181.5
    A 9,9 0 0 1 369.5,190.5
    L 369.5,392.5
    A 17,17 0 0 1 352.5,409.5
    L 159,409.5
    A 17,17 0 0 1 142,392.5
    L 142,119
    A 17,17 0 0 1 159,102
    Z
    M 314.5,116
    L 356,157.5
    L 356,158.5
    L 323.5,158.5
    A 9,9 0 0 1 314.5,149.5
    Z
  "/>

  <!-- Waveform (Audio Pulse) -->
  <path fill="none" stroke="currentColor" stroke-width="16.5" stroke-linecap="round" stroke-linejoin="round" d="
    M 179,234.5
    L 196.5,234.5
    L 212.2,257
    L 232.3,193.5
    L 255.8,275.5
    L 278.7,206.5
    L 298.2,257
    L 313.5,234.5
    L 333,234.5
  "/>

  <!-- Document Line 1 -->
  <line x1="179" y1="307.75" x2="333" y2="307.75" stroke="currentColor" stroke-width="16.5" stroke-linecap="round" />

  <!-- Document Line 2 -->
  <line x1="179" y1="339.25" x2="333" y2="339.25" stroke="currentColor" stroke-width="16.5" stroke-linecap="round" />

  <!-- Document Line 3 (Short) -->
  <line x1="179" y1="371.25" x2="280.25" y2="371.25" stroke="currentColor" stroke-width="16.5" stroke-linecap="round" />
</svg>'''

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        f.write(svg.strip() + '\n')
    print(f'Generated {output_path}')

if __name__ == '__main__':
    generate_svg()

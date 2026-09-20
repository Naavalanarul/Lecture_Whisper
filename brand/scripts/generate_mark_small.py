import os

def generate_mark_small(output_path='brand/svg/mark-small.svg'):
    """
    Optically tuned mark for micro sizes (16px, 24px, 32px favicon/dock/notification).
    - Thicker document frame (stroke 32px instead of 25px)
    - Thicker waveform & document lines (24px stroke instead of 16.5px)
    - Slightly expanded dog-ear fold for distinct silhouette at 16px
    - 2 bolder text lines (or 3 bold lines) so lines don't blend into a blur
    """
    # Outer frame with 32px wall:
    # Outer: Left=114, Right=398, Top=74, Bottom=438 (radius=42)
    # Inner: Left=146, Right=366, Top=106, Bottom=406 (radius=20)
    # Waveform: stroke-width 24
    # 2 Document lines: stroke-width 24, at y=328 and y=374
    
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
  <!-- Document Outer Frame with Fold Cutout (Micro-optimized) -->
  <path fill-rule="evenodd" d="
    M 156,74
    L 302,74
    A 16,16 0 0 1 313.5,80.5
    L 391.5,158.5
    A 16,16 0 0 1 398,170
    L 398,396
    A 42,42 0 0 1 356,438
    L 156,438
    A 42,42 0 0 1 114,396
    L 114,116
    A 42,42 0 0 1 156,74
    Z
    M 160,106
    L 278,106
    A 12,12 0 0 1 290,118
    L 290,154
    A 32,32 0 0 0 322,186
    L 354,186
    A 12,12 0 0 1 366,198
    L 366,390
    A 20,20 0 0 1 346,410
    L 166,410
    A 20,20 0 0 1 146,390
    L 146,120
    A 14,14 0 0 1 160,106
    Z
    M 314,118
    L 358,162
    L 326,162
    A 12,12 0 0 1 314,150
    Z
  "/>

  <!-- Waveform (Thicker 24px stroke for micro clarity) -->
  <path fill="none" stroke="currentColor" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" d="
    M 182,236
    L 198,236
    L 213,257
    L 232,196
    L 256,274
    L 278,208
    L 297,257
    L 312,236
    L 330,236
  "/>

  <!-- Document Line 1 (Bolder 22px stroke) -->
  <line x1="182" y1="324" x2="330" y2="324" stroke="currentColor" stroke-width="22" stroke-linecap="round" />

  <!-- Document Line 2 (Bolder 22px stroke) -->
  <line x1="182" y1="366" x2="276" y2="366" stroke="currentColor" stroke-width="22" stroke-linecap="round" />
</svg>'''

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        f.write(svg.strip() + '\n')
    print(f'Generated {output_path}')

if __name__ == '__main__':
    generate_mark_small()

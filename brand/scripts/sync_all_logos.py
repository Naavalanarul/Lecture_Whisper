#!/usr/bin/env python3
"""
Synchronizes the official Lecture Whisper logo and favicon across the entire repository.
Sources from: logo/logo-master.png and logo/mark.svg
"""
import os
import shutil
from pathlib import Path
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
LOGO_MASTER = PROJECT_ROOT / "logo" / "logo-master.png"

def make_icons():
    # Load 1024x1024 master
    img = Image.open(LOGO_MASTER).convert("RGBA")
    
    # 1. Favicon PNG (64x64 & 128x128)
    fav64 = img.resize((64, 64), Image.Resampling.LANCZOS)
    fav128 = img.resize((128, 128), Image.Resampling.LANCZOS)
    fav32 = img.resize((32, 32), Image.Resampling.LANCZOS)
    fav16 = img.resize((16, 16), Image.Resampling.LANCZOS)
    
    # Save logo/favicon.png
    fav128.save(PROJECT_ROOT / "logo" / "favicon.png", format="PNG")
    
    # Save logo/favicon.ico multi-resolution
    img.save(
        PROJECT_ROOT / "logo" / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
    )
    print("✓ Created logo/favicon.png and logo/favicon.ico")

    # Destinations to update:
    destinations = [
        PROJECT_ROOT / "ui" / "public",
        PROJECT_ROOT / "server" / "static",
        PROJECT_ROOT / "server" / "src" / "lecturewhisper" / "static",
        PROJECT_ROOT / "docs" / "assets",
        Path.home() / ".lecturewhisper" / "static",
    ]

    for dest in destinations:
        dest.mkdir(parents=True, exist_ok=True)
        # Copy 1024x1024 logo.png
        img.save(dest / "logo.png", format="PNG")
        # Copy favicon.png
        fav128.save(dest / "favicon.png", format="PNG")
        # Copy favicon.ico
        img.save(dest / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
        print(f"✓ Synced logo and favicons to {dest}")

    # Also update mobile/android/app/src/main/res/drawable/app_logo.png
    mobile_drawable = PROJECT_ROOT / "mobile" / "android" / "app" / "src" / "main" / "res" / "drawable"
    mobile_drawable.mkdir(parents=True, exist_ok=True)
    img.resize((512, 512), Image.Resampling.LANCZOS).save(mobile_drawable / "app_logo.png", format="PNG")
    print(f"✓ Synced app_logo.png to {mobile_drawable}")

if __name__ == "__main__":
    make_icons()

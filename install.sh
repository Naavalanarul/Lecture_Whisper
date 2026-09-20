#!/usr/bin/env bash
#
# 🎙️ Lecture Whisper Installer for macOS (Apple Silicon)
#
# Quick Install:
#   curl -fsSL https://raw.githubusercontent.com/Naavalanarul/Lecture_Whisper/main/install.sh | bash
#
set -euo pipefail

# ANSI Colors
BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
YELLOW="\033[33m"
RED="\033[31m"
CYAN="\033[36m"
RESET="\033[0m"

echo -e "${BOLD}${CYAN}"
cat << 'EOF'
  _               _                    __          ___     _                     
 | |             | |                   \ \        / / |   (_)                    
 | |     ___  ___| |_ _   _ _ __ ___    \ \  /\  / /| |__  _ ___ _ __   ___ _ __ 
 | |    / _ \/ __| __| | | | '__/ _ \    \ \/  \/ / | '_ \| / __| '_ \ / _ \ '__|
 | |___|  __/ (__| |_| |_| | | |  __/     \  /\  /  | | | | \__ \ |_) |  __/ |   
 |______\___|\___|\__|\__,_|_|  \___|      \/  \/   |_| |_|_|___/ .__/ \___|_|   
                                                                 | |              
                                                                 |_|              
EOF
echo -e "${RESET}"
echo -e "${BOLD}🎙️ Installing Lecture Whisper for Apple Silicon macOS...${RESET}\n"

# 1. Architecture & OS Verification
OS="$(uname -s)"
ARCH="$(uname -m)"

if [[ "$OS" != "Darwin" ]]; then
  echo -e "${RED}❌ Error: Lecture Whisper is engineered for macOS (Apple Silicon). Detected OS: $OS${RESET}"
  exit 1
fi

if [[ "$ARCH" != "arm64" ]]; then
  echo -e "${YELLOW}⚠️ Warning: Lecture Whisper is optimized for Apple Silicon (M1/M2/M3/M4). Detected architecture: $ARCH.${RESET}"
  echo -e "   Performance with MLX Whisper and Apple Metal may be degraded or unavailable."
fi

# Ensure ~/.local/bin is in PATH for current session and future shells
export PATH="$HOME/.local/bin:$PATH"

# 2. Check for Homebrew & ffmpeg
echo -e "${BLUE}▶ Checking system dependencies...${RESET}"
if command -v brew >/dev/null 2>&1; then
  if ! command -v ffmpeg >/dev/null 2>&1; then
    echo -e "  Installing ${BOLD}ffmpeg${RESET} via Homebrew..."
    brew install ffmpeg
  else
    echo -e "  ${GREEN}✓${RESET} ffmpeg is already installed"
  fi
else
  if ! command -v ffmpeg >/dev/null 2>&1; then
    echo -e "  ${YELLOW}⚠️ Notice:${RESET} Homebrew is not installed. Please ensure 'ffmpeg' is installed on your system."
  fi
fi

# 3. Check / Install Astral uv
echo -e "\n${BLUE}▶ Checking Python package manager (uv)...${RESET}"
if ! command -v uv >/dev/null 2>&1; then
  echo -e "  Installing ${BOLD}uv${RESET} via official installer..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$PATH"
else
  echo -e "  ${GREEN}✓${RESET} uv is already installed ($(uv --version))"
fi

# 4. Install Lecture Whisper
echo -e "\n${BLUE}▶ Installing Lecture Whisper executable & web dashboard...${RESET}"

# If running inside the repo checkout, install from local path; otherwise install from GitHub
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || echo "")"
if [[ -n "$SCRIPT_DIR" && -f "$SCRIPT_DIR/server/pyproject.toml" ]]; then
  echo -e "  Detected local repository at ${CYAN}$SCRIPT_DIR${RESET}."
  uv tool install --force --python 3.12 --reinstall "$SCRIPT_DIR/server"
else
  echo -e "  Installing latest release from GitHub..."
  uv tool install --force --python 3.12 --reinstall "git+https://github.com/Naavalanarul/Lecture_Whisper.git#subdirectory=server"
fi

# 5. Verify Installation
echo -e "\n${BLUE}▶ Verifying installation...${RESET}"
if command -v lecturewhisper >/dev/null 2>&1; then
  VERSION="$(lecturewhisper --help | grep -i "Usage:" || echo "Installed")"
  echo -e "  ${GREEN}✓${RESET} Lecture Whisper installed successfully!"
else
  echo -e "  ${YELLOW}⚠️ Notice:${RESET} lecturewhisper was installed to ~/.local/bin/."
  echo -e "  Make sure ~/.local/bin is in your PATH by adding this to your ~/.zshrc:"
  echo -e "    ${BOLD}export PATH=\"\$HOME/.local/bin:\$PATH\"${RESET}"
fi

# 6. Ensure shell config has ~/.local/bin
SHELL_RC=""
if [[ -f "$HOME/.zshrc" ]]; then
  SHELL_RC="$HOME/.zshrc"
elif [[ -f "$HOME/.bash_profile" ]]; then
  SHELL_RC="$HOME/.bash_profile"
elif [[ -f "$HOME/.bashrc" ]]; then
  SHELL_RC="$HOME/.bashrc"
fi

if [[ -n "$SHELL_RC" ]] && ! grep -q '\.local/bin' "$SHELL_RC"; then
  echo -e "\nexport PATH=\"\$HOME/.local/bin:\$PATH\"" >> "$SHELL_RC"
  echo -e "  ${GREEN}✓${RESET} Added ~/.local/bin to $SHELL_RC"
fi

# 7. Success Banner & Quick Start
echo -e "\n${BOLD}${GREEN}======================================================${RESET}"
echo -e "${BOLD}${GREEN}  🎉 Lecture Whisper is ready to use!                ${RESET}"
echo -e "${BOLD}${GREEN}======================================================${RESET}\n"
echo -e "To start the local server and modern web dashboard:"
echo -e "  ${BOLD}${CYAN}lecturewhisper serve${RESET}\n"
echo -e "Then open your browser to:"
echo -e "  ${BOLD}http://localhost:8420${RESET}\n"
echo -e "Useful Commands:"
echo -e "  ${BOLD}lecturewhisper pair${RESET}              # Pair with Android app (Google Pixel 8a)"
echo -e "  ${BOLD}lecturewhisper doctor${RESET}            # Run hardware & ML diagnostics"
echo -e "  ${BOLD}lecturewhisper service install${RESET}   # Enable autostart on macOS boot (LaunchAgent)"
echo ""

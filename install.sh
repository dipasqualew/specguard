#!/usr/bin/env bash

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
GITHUB_REPO="dipasqualew/specguard"
INSTALL_NAME="specguard"
CUSTOM_INSTALL_PATH=""
LOCAL_SOURCE=""
VERSION="${SPECGUARD_VERSION:-latest}"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --install-path)
            CUSTOM_INSTALL_PATH="$2"
            shift 2
            ;;
        --local-source)
            LOCAL_SOURCE="$2"
            shift 2
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: install.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --install-path PATH    Install to specific path (for testing)"
            echo "  --local-source FILE    Use local file instead of downloading (for testing)"
            echo "  --version VERSION      Install specific version (default: latest)"
            echo "  -h, --help            Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Run 'install.sh --help' for usage"
            exit 1
            ;;
    esac
done

# Detect platform and architecture
detect_platform() {
    local os
    local arch
    
    os=$(uname -s | tr '[:upper:]' '[:lower:]')
    arch=$(uname -m)
    
    case "$os" in
        linux*)
            os="linux"
            ;;
        darwin*)
            os="darwin"
            ;;
        *)
            echo -e "${RED}Error: Unsupported operating system: $os${NC}"
            exit 1
            ;;
    esac
    
    case "$arch" in
        x86_64|amd64)
            arch="x64"
            ;;
        arm64|aarch64)
            arch="arm64"
            ;;
        *)
            echo -e "${RED}Error: Unsupported architecture: $arch${NC}"
            exit 1
            ;;
    esac
    
    echo "${os}-${arch}"
}

PLATFORM=$(detect_platform)

echo "Installing specguard..."
echo ""

# Determine install location
if [[ -n "$CUSTOM_INSTALL_PATH" ]]; then
    # step("Parse command line arguments for custom install path")
    INSTALL_PATH="$CUSTOM_INSTALL_PATH"
    INSTALL_DIR=$(dirname "$INSTALL_PATH")
    NEEDS_SUDO=false
    
    # step("Create custom install directory if needed")
    mkdir -p "$INSTALL_DIR"
else
    # step("Determine default install location")
    # Prefer ~/.local/bin (no sudo needed), fallback to /usr/local/bin
    if [[ -d "$HOME/.local/bin" ]] || mkdir -p "$HOME/.local/bin" 2>/dev/null; then
        INSTALL_DIR="$HOME/.local/bin"
        NEEDS_SUDO=false
    else
        INSTALL_DIR="/usr/local/bin"
        NEEDS_SUDO=true
        
        if [[ ! -w "$INSTALL_DIR" ]]; then
            echo -e "${YELLOW}Note: Installing to $INSTALL_DIR requires sudo${NC}"
        fi
    fi
    INSTALL_PATH="$INSTALL_DIR/$INSTALL_NAME"
fi

# Determine download URL
if [[ "$VERSION" == "latest" ]]; then
    DOWNLOAD_URL="https://github.com/${GITHUB_REPO}/releases/latest/download/specguard-${PLATFORM}"
else
    DOWNLOAD_URL="https://github.com/${GITHUB_REPO}/releases/download/${VERSION}/specguard-${PLATFORM}"
fi

# Download or copy the binary
if [[ -n "$LOCAL_SOURCE" ]]; then
    # step("Use local source file for installation")
    echo "Using local source: $LOCAL_SOURCE"
    TMP_FILE=$(mktemp)
    cp "$LOCAL_SOURCE" "$TMP_FILE"
else
    # step("Download binary from GitHub")
    echo "Downloading specguard ${VERSION} for ${PLATFORM}..."
    if command -v curl >/dev/null 2>&1; then
        TMP_FILE=$(mktemp)
        if ! curl -fsSL "$DOWNLOAD_URL" -o "$TMP_FILE"; then
            echo -e "${RED}Error: Failed to download specguard${NC}"
            echo -e "${RED}URL: $DOWNLOAD_URL${NC}"
            rm -f "$TMP_FILE"
            exit 1
        fi
    elif command -v wget >/dev/null 2>&1; then
        TMP_FILE=$(mktemp)
        if ! wget -q "$DOWNLOAD_URL" -O "$TMP_FILE"; then
            echo -e "${RED}Error: Failed to download specguard${NC}"
            echo -e "${RED}URL: $DOWNLOAD_URL${NC}"
            rm -f "$TMP_FILE"
            exit 1
        fi
    else
        echo -e "${RED}Error: Neither curl nor wget found. Please install one of them.${NC}"
        exit 1
    fi
fi

# step("Copy binary to install location")
echo "Installing to $INSTALL_PATH..."
if [[ "$NEEDS_SUDO" == true ]]; then
    sudo mv "$TMP_FILE" "$INSTALL_PATH"
    sudo chmod +x "$INSTALL_PATH"
else
    mv "$TMP_FILE" "$INSTALL_PATH"
    chmod +x "$INSTALL_PATH"
fi

# step("Make binary executable")
# (handled above in the copy step)

# step("Verify installation succeeded")
if [[ -x "$INSTALL_PATH" ]]; then
    echo -e "${GREEN}✓${NC} specguard installed successfully!"
    echo ""
    echo "Installation location: $INSTALL_PATH"
    
    # step("Check if install directory is in PATH")
    if [[ -z "$CUSTOM_INSTALL_PATH" ]] && [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
        echo ""
        echo -e "${YELLOW}Warning: $INSTALL_DIR is not in your PATH${NC}"
        echo "Add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
        echo ""
        echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
        echo ""
    else
        echo ""
        if [[ -z "$CUSTOM_INSTALL_PATH" ]]; then
            echo "You can now run: specguard --help"
        fi
    fi
else
    echo -e "${RED}Error: Installation failed${NC}"
    exit 1
fi

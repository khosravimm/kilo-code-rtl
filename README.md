# Kilo Code RTL Support

Adds automatic RTL (Right-to-Left) text support for Persian/Farsi, Arabic, and Hebrew to the Kilo Code chat panel, while keeping code blocks LTR.

## Features

- Automatic RTL detection for Persian/Arabic/Hebrew text in chat messages
- Toggle button (⇄) to enable/disable RTL on demand
- Code blocks, thinking blocks, and Monaco editor stay LTR
- List markers and blockquotes properly mirrored in RTL mode
- Persistent toggle state via localStorage
- Status bar indicator showing Active/Inactive state

## Installation

### From .vsix file
1. Build the extension: `build.bat`
2. Install: `code --install-extension kilo-code-rtl.vsix`
3. Reload VS Code

### Development
1. Open this folder in VS Code
2. Press F5 to launch Extension Development Host
3. Run "Kilo RTL: Activate" command

## Usage

- **Activate**: Runs "Kilo RTL: Activate" from Command Palette
- **Deactivate**: Runs "Kilo RTL: Deactivate" from Command Palette
- **Toggle**: Click the ⇄ button in the top-right corner of the Kilo Code panel
- **Status**: Check status bar indicator or run "Kilo RTL: Check Status"

## How it works

The extension patches Kilo Code's webview assets (`dist/webview.css` and `dist/webview.js`) by appending:
1. CSS rules that flip `direction: rtl` for message containers
2. A MutationObserver script that auto-detects RTL characters and toggles a `.kiloRtl` class

A `.bak` backup is created on first patch, and a corruption guard prevents overwriting if the file size shrinks unexpectedly.

## Known Limitations

- Patches are wiped when Kilo Code updates (re-run Activate)
- Detection depends on Kilo Code keeping semantic HTML tags (`<p>`, `<li>`, etc.)

## License

MIT

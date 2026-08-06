# Kilo Code RTL Support

Adds automatic RTL (Right-to-Left) text support for Persian/Farsi, Arabic, and Hebrew to the **Kilo Code** chat panel, the **Claude Code** chat panel, and **Markdown preview**, while keeping code blocks, tool output, and diffs LTR.

## Features

- Automatic RTL detection for Persian/Arabic/Hebrew text in chat messages and Markdown preview, using a first-strong-character heuristic (same idea as native `dir="auto"`) so parentheses, digits, and punctuation anywhere in the text never trigger or block a direction flip
- Works on both Kilo Code and Claude Code chat panels (auto-detects which are installed)
- Markdown preview RTL support - no activation needed, works out of the box
- Toggle button (⇄) to enable/disable chat-panel RTL on demand
- Code blocks, thinking blocks, tool/diff panels, and Monaco editor always stay LTR
- The live chat input box is never touched - direction is never toggled on focused/editable regions, which previously could scramble the caret position while typing (see Known Limitations history below)
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

- **Activate**: Runs "Kilo RTL: Activate" from Command Palette - patches whichever of Kilo Code / Claude Code is installed
- **Deactivate**: Runs "Kilo RTL: Deactivate" from Command Palette
- **Toggle**: Click the ⇄ button in the top-right corner of the chat panel
- **Status**: Check status bar indicator or run "Kilo RTL: Check Status"
- **Markdown preview**: RTL is auto-detected per block, no command needed - just open the built-in Markdown preview on a Persian/Arabic/Hebrew `.md` file

## How it works

**Chat panels (Kilo Code / Claude Code):** the extension patches each installed target's webview assets by appending:
1. CSS rules that flip `direction: rtl` for message containers
2. A MutationObserver script that auto-detects RTL text per block and toggles a `.kiloRtl` class

Both apps' webviews use CSS-module class names with a random hash suffix (e.g. `userMessage_07S1Yg`); the injected selectors use `[class*="x"]` substring matching so the same script works on both without hardcoding any hash, and keeps working across app updates that only change the hash.

A `.bak` backup is created on first patch, and a corruption guard prevents overwriting if the file size shrinks unexpectedly.

**Markdown preview:** uses VS Code's official `contributes.markdown.previewStyles` / `previewScripts` extension points - no file patching, no activation step, always on.

## Known Limitations

- Chat-panel patches are wiped when Kilo Code or Claude Code updates (re-run Activate)
- Detection depends on the target app keeping semantic HTML tags (`<p>`, `<li>`, etc.)

## License

MIT

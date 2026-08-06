# Changelog

## 0.2.0 - 2026-08-06

### Fixed
- **Typing bug:** the live chat input box could get its `direction`/`text-align` toggled mid-typing whenever the RTL detector re-ran on a `characterData` mutation (i.e. on every keystroke while streaming/typing). Changing direction on a focused editable region resets the caret position, which scrambled further keystrokes - this was the "parentheses / certain characters wreck the text" bug. The input is now explicitly excluded (any `[contenteditable]`, not just `[contenteditable="false"]`, plus a runtime check against `document.activeElement`).
- **Detection heuristic:** switched from "does this block contain any RTL character" to a first-strong-character scan (same idea as native HTML `dir="auto"`), so a stray `(`, digit, or punctuation mark can no longer by itself flip or block the detected direction for a block.

### Added
- **Claude Code support:** the extension now patches whichever of Kilo Code and Claude Code is installed (previously Kilo Code only). Detection uses hash-agnostic `[class*="x"]` selectors so no per-version class name maintenance is needed.
- **Markdown preview support:** Persian/Arabic/Hebrew `.md` files now get automatic RTL in VS Code's built-in Markdown preview, via the official `markdown.previewStyles`/`markdown.previewScripts` extension points (no activation step, no file patching).

## 0.1.0

Initial release - RTL support for the Kilo Code chat panel only.

# Changelog

## 0.2.2 - 2026-08-06

### Fixed
- **Word-order-looking scrambling in streamed messages containing mixed Persian/English inline text** (e.g. a bullet line mentioning `push`, `Commit`, and a URL among Persian text rendering with chunks visually out of order once the message finished streaming). Root cause: assistant replies stream in token-by-token, firing a `characterData` DOM mutation on nearly every token; the script was recomputing and toggling `direction`/`text-align` on every ancestor of a paragraph/list on *every single one* of those mutations, i.e. dozens of times per second on text that was still being appended to. Toggling direction on an ancestor while a browser is mid-layout for a text node that's itself still growing is a known way to get a stale/incorrect bidi visual reorder that can stick even after the text is fully settled - the underlying DOM text was never actually corrupted, only the paint was wrong. Mutation bursts are now coalesced and re-applied once ~120ms after they pause, instead of on every token.

## 0.2.1 - 2026-08-06

### Fixed
- **Numbered lists losing markers (e.g. "3." disappearing):** each `<li>` was judged independently by its own first-strong-character, so a list with an English-first item ("**Kilo Code** ...") next to a Persian-first item ("**پیش‌نمایش** ...") ended up with mismatched per-item `direction` inside the same `<ol>` - which breaks the browser's marker/counter rendering for that list. List items now inherit their parent `<ol>`/`<ul>`'s direction instead of deciding on their own; the list itself is judged by a majority-of-strong-characters vote across all its items combined (not just item #1's first character), so a mostly-Persian list reads RTL as a whole even if item #1 happens to open with an English term.
- **Toggle button overlapping the app's own header icons (e.g. "New Chat"):** moved from top-right (both Kilo Code and Claude Code have their own icon row along the top edge) to bottom-right, just above the compose box, in both apps.

## 0.2.0 - 2026-08-06

### Fixed
- **Typing bug:** the live chat input box could get its `direction`/`text-align` toggled mid-typing whenever the RTL detector re-ran on a `characterData` mutation (i.e. on every keystroke while streaming/typing). Changing direction on a focused editable region resets the caret position, which scrambled further keystrokes - this was the "parentheses / certain characters wreck the text" bug. The input is now explicitly excluded (any `[contenteditable]`, not just `[contenteditable="false"]`, plus a runtime check against `document.activeElement`).
- **Detection heuristic:** switched from "does this block contain any RTL character" to a first-strong-character scan (same idea as native HTML `dir="auto"`), so a stray `(`, digit, or punctuation mark can no longer by itself flip or block the detected direction for a block.

### Added
- **Claude Code support:** the extension now patches whichever of Kilo Code and Claude Code is installed (previously Kilo Code only). Detection uses hash-agnostic `[class*="x"]` selectors so no per-version class name maintenance is needed.
- **Markdown preview support:** Persian/Arabic/Hebrew `.md` files now get automatic RTL in VS Code's built-in Markdown preview, via the official `markdown.previewStyles`/`markdown.previewScripts` extension points (no activation step, no file patching).

## 0.1.0

Initial release - RTL support for the Kilo Code chat panel only.

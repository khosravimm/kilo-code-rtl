/* Kilo RTL Auto-Direction Script - Injected by Kilo Code RTL Support */
(function () {
	if (window.__kiloRtlInstalled) return;
	window.__kiloRtlInstalled = true;

	var RTL_CHAR = /[֐-׿؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
	// Strong LTR: Latin, Greek, Cyrillic letters. Used only to find the first
	// *strong* character (Unicode bidi P2/P3-style heuristic) so neutral
	// characters like parentheses, digits, and punctuation - anywhere in the
	// text, not just at the edges - never flip or confuse the detection.
	var STRONG_LTR_CHAR = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ]/;
	var STRONG_CHAR = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ֐-׿؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
	var CLS = "kiloRtl";
	var STORAGE_KEY = "kiloRtlEnabled";

	// Block selectors use `[class*="x"]` substring matching on purpose: both
	// Kilo Code and Claude Code webviews use CSS-module class names with a
	// random hash suffix (e.g. Claude's `userMessage_07S1Yg`, `content_xGDvVg`,
	// `messagesContainer_07S1Yg`). Substring matching means the same selector
	// list works across both apps' hashed class names without hardcoding any
	// hash, and keeps working across app updates that only change the hash.
	var BLOCK_SEL =
		'[class*="userMessage"], [class*="assistantMessage"], [class*="content_"], [class*="header_"], ' +
		'[class*="messagesContainer_"], [class*="questionBlock_"], [class*="questionHeader_"], ' +
		'[class*="answerText_"], [class*="optionText_"], [class*="optionContent_"], ' +
		'p, li, ul, ol, blockquote, h1, h2, h3, h4, h5, h6, td, th, dd, dt';
	// Anything editable must never be touched by this script: toggling
	// direction/text-align on a focused input while the user is typing
	// resets caret position mid-word and scrambles further keystrokes -
	// this is the "typing parentheses/certain characters wrecks the text"
	// bug. `[contenteditable]` (no value = defaults to true) covers rich
	// chat inputs; `[contenteditable="false"]` is kept for clarity/safety.
	// `toolUse_`/`toolBody_`/`toolResult_`/`diffEditorWrapper_`/`slashCommand`
	// are Claude Code's tool-call and diff panels - always technical/LTR
	// content, same category as code blocks.
	var SKIP_ANCESTOR_SEL =
		'pre, code, input, textarea, select, [contenteditable], [contenteditable="false"], [role="textbox"], ' +
		'.monaco-editor, [class*="codeBlock"], [class*="thinking"], [class*="toolUse_"], [class*="toolBody_"], ' +
		'[class*="toolResult_"], [class*="toolSummary_"], [class*="diffEditorWrapper_"], [class*="slashCommand"]';

	var enabled = true;
	try {
		var saved = localStorage.getItem(STORAGE_KEY);
		if (saved !== null) enabled = saved !== "0";
	} catch (e) {}

	// First-strong-character heuristic (same idea as native HTML `dir="auto"`):
	// scan for the first character that is *strongly* directional (a real
	// letter, not a paren/digit/space/punctuation mark) and decide RTL/LTR
	// from that alone. A stray "(" or ")" anywhere in the string can never
	// by itself trigger or block a direction change.
	function isRtl(text) {
		text = text || "";
		var m = STRONG_CHAR.exec(text);
		if (!m) return false;
		return !STRONG_LTR_CHAR.test(m[0]);
	}

	// Majority-vote heuristic, used only for <ol>/<ul> containers: a list is
	// judged by which script has more *strong* characters across all its
	// items combined, not just the first one. First-strong-char alone would
	// pick a list's direction off of item #1's first character (e.g. an
	// English proper noun opening the item), which mismatches the other,
	// mostly-Persian items in the same list.
	function isRtlMajority(text) {
		text = text || "";
		var rtlCount = (text.match(new RegExp(RTL_CHAR.source, "g")) || []).length;
		var ltrCount = (text.match(new RegExp(STRONG_LTR_CHAR.source, "g")) || []).length;
		return rtlCount > ltrCount;
	}

	function isEditableRegion(el) {
		if (!el) return false;
		if (el === document.activeElement) return true;
		if (el.contains && document.activeElement && el.contains(document.activeElement)) return true;
		return false;
	}

	function apply(el) {
		if (!el || el.nodeType !== 1) return;
		if (!el.matches || !el.matches(BLOCK_SEL)) return;
		if (el.closest && el.closest(SKIP_ANCESTOR_SEL)) return;
		if (isEditableRegion(el)) return;
		if (!enabled) {
			if (el.classList.contains(CLS)) el.classList.remove(CLS);
			return;
		}
		var rtl;
		var tag = el.tagName;
		if (tag === "OL" || tag === "UL") {
			rtl = isRtlMajority(el.textContent);
		} else if (tag === "LI") {
			// A list item never decides its own direction: <ol> counters and
			// marker positioning are computed per-list, not per-item, so a
			// numbered list with a mix of English-first and Persian-first
			// items would otherwise end up with mismatched item directions -
			// which silently drops list markers (e.g. "3." disappearing).
			// Every item instead inherits its parent list's direction.
			var list = el.closest("ol, ul");
			rtl = list ? isRtlMajority(list.textContent) : isRtl(el.textContent);
		} else {
			rtl = isRtl(el.textContent);
		}
		if (rtl) {
			if (!el.classList.contains(CLS)) el.classList.add(CLS);
		} else if (el.classList.contains(CLS)) {
			el.classList.remove(CLS);
		}
	}

	function scanSubtree(root) {
		if (!root || root.nodeType !== 1) return;
		apply(root);
		if (!root.querySelectorAll) return;
		var all = root.querySelectorAll(BLOCK_SEL);
		for (var i = 0; i < all.length; i++) apply(all[i]);
	}

	function reapplyAncestors(el) {
		var cur = el;
		while (cur && cur.nodeType === 1) {
			apply(cur);
			cur = cur.parentElement;
		}
	}

	// Assistant replies stream in token-by-token, which fires a
	// `characterData` mutation on nearly every token - each one
	// recomputing direction for every ancestor of a paragraph/list that is
	// still actively growing. Toggling `direction`/`text-align` on an
	// ancestor while the browser is mid-layout for a text node that is
	// itself still being appended to is a known source of stale/incorrect
	// bidi visual reordering that can stick even after the text settles
	// (the DOM text is correct - only the *paint* is wrong). Coalescing
	// bursts of mutations into one re-apply after they pause fixes this and
	// is also just cheaper than reacting on every single token.
	var pendingCharTargets = null;
	var pendingChildTargets = null;
	var flushTimer = null;
	var DEBOUNCE_MS = 120;

	function flushPending() {
		flushTimer = null;
		if (pendingChildTargets) {
			pendingChildTargets.forEach(function (nd) {
				scanSubtree(nd);
			});
			pendingChildTargets = null;
		}
		if (pendingCharTargets) {
			pendingCharTargets.forEach(function (parent) {
				reapplyAncestors(parent);
			});
			pendingCharTargets = null;
		}
	}

	function scheduleFlush() {
		if (flushTimer) clearTimeout(flushTimer);
		flushTimer = setTimeout(flushPending, DEBOUNCE_MS);
	}

	function handleMutations(muts) {
		for (var i = 0; i < muts.length; i++) {
			var m = muts[i];
			if (m.type === "childList") {
				for (var j = 0; j < m.addedNodes.length; j++) {
					var nd = m.addedNodes[j];
					if (nd.nodeType === 1) {
						if (!pendingChildTargets) pendingChildTargets = new Set();
						pendingChildTargets.add(nd);
					}
				}
			} else if (m.type === "characterData") {
				var parent = m.target.parentElement;
				if (parent) {
					if (!pendingCharTargets) pendingCharTargets = new Set();
					pendingCharTargets.add(parent);
				}
			}
		}
		scheduleFlush();
	}

	function updateButton() {
		var btn = document.getElementById("kilo-rtl-btn");
		if (!btn) return;
		btn.classList.toggle("kilo-rtl-off", !enabled);
		btn.title = enabled ? "RTL: On (click to disable)" : "RTL: Off (click to enable)";
	}

	function setEnabled(value) {
		enabled = value;
		try {
			localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
		} catch (e) {}
		if (enabled) {
			scanSubtree(document.body);
		} else {
			var flagged = document.querySelectorAll("." + CLS);
			for (var i = 0; i < flagged.length; i++) flagged[i].classList.remove(CLS);
		}
		updateButton();
	}

	function ensureButton() {
		if (document.getElementById("kilo-rtl-btn") || !document.body) return;
		var btn = document.createElement("button");
		btn.id = "kilo-rtl-btn";
		btn.type = "button";
		btn.textContent = "⇄";
		btn.addEventListener("click", function () {
			setEnabled(!enabled);
		});
		document.body.appendChild(btn);
		updateButton();
	}

	function start() {
		if (!document.body) return;
		ensureButton();
		if (enabled) scanSubtree(document.body);
		var obs = new MutationObserver(function (muts) {
			ensureButton();
			handleMutations(muts);
		});
		obs.observe(document.body, { childList: true, subtree: true, characterData: true });
	}

	if (document.readyState !== "loading") start();
	else document.addEventListener("DOMContentLoaded", start);
})();
/* End Kilo RTL Auto-Direction Script */

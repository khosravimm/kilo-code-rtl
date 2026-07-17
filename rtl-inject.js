/* Kilo RTL Auto-Direction Script - Injected by Kilo Code RTL Support */
(function () {
	if (window.__kiloRtlInstalled) return;
	window.__kiloRtlInstalled = true;

	var RTL_CHAR = /[֐-׿؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
	var CLS = "kiloRtl";
	var STORAGE_KEY = "kiloRtlEnabled";

	var BLOCK_SEL = '[class*="userMessage"], [class*="assistantMessage"], [class*="content_"], [class*="header_"], p, li, ul, ol, blockquote, h1, h2, h3, h4, h5, h6, td, th, dd, dt';
	var SKIP_ANCESTOR_SEL = 'pre, code, input, textarea, select, [contenteditable="false"], .monaco-editor, [class*="codeBlock"], [class*="thinking"]';

	var enabled = true;
	try {
		var saved = localStorage.getItem(STORAGE_KEY);
		if (saved !== null) enabled = saved !== "0";
	} catch (e) {}

	function isRtl(text) {
		return RTL_CHAR.test(text || "");
	}

	function apply(el) {
		if (!el || el.nodeType !== 1) return;
		if (!el.matches || !el.matches(BLOCK_SEL)) return;
		if (el.closest && el.closest(SKIP_ANCESTOR_SEL)) return;
		if (!enabled) {
			if (el.classList.contains(CLS)) el.classList.remove(CLS);
			return;
		}
		var rtl = isRtl(el.textContent);
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

	function handleMutations(muts) {
		for (var i = 0; i < muts.length; i++) {
			var m = muts[i];
			if (m.type === "childList") {
				for (var j = 0; j < m.addedNodes.length; j++) {
					var nd = m.addedNodes[j];
					if (nd.nodeType === 1) scanSubtree(nd);
				}
			} else if (m.type === "characterData") {
				var parent = m.target.parentElement;
				if (parent) reapplyAncestors(parent);
			}
		}
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

/* Kilo RTL - Markdown Preview auto-direction.
   VS Code reloads contributed preview scripts on every content change, so a
   single top-level scan on each load is enough - no MutationObserver needed
   here (unlike the chat webview script, this content is never editable). */
(function () {
	var STRONG_LTR_CHAR = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ]/;
	var STRONG_CHAR = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ֐-׿؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
	var CLS = "mdRtl";
	var BLOCK_SEL = "p, li, ul, ol, blockquote, h1, h2, h3, h4, h5, h6, td, th, dd, dt, table";

	// First-strong-character heuristic: a stray "(" or digit anywhere in the
	// text can never by itself flip the detected direction.
	function isRtl(text) {
		var m = STRONG_CHAR.exec(text || "");
		if (!m) return false;
		return !STRONG_LTR_CHAR.test(m[0]);
	}

	function apply(el) {
		if (isRtl(el.textContent)) el.classList.add(CLS);
		else el.classList.remove(CLS);
	}

	function scan() {
		if (!document.body) return;
		var all = document.body.querySelectorAll(BLOCK_SEL);
		for (var i = 0; i < all.length; i++) apply(all[i]);
	}

	if (document.readyState !== "loading") scan();
	else document.addEventListener("DOMContentLoaded", scan);
})();

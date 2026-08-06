"use strict";
const vscode = require("vscode");
const fs = require("fs/promises");
const path = require("path");

const CSS_BEGIN = "/* Kilo RTL Text Support - Added by Kilo Code RTL Support */";
const CSS_END = "/* End Kilo RTL Text Support */";
const JS_BEGIN = "/* Kilo RTL Auto-Direction Script - Injected by Kilo Code RTL Support */";
const JS_END = "/* End Kilo RTL Auto-Direction Script */";
const STATE_KEY = "kiloRtl.mode";

// Each installed target gets the same CSS/JS pair patched into its webview
// assets. Adding a new AI chat extension here is the only step needed to
// support it - rtl-inject.js/css already use hash-agnostic `[class*="x"]`
// selectors that work across apps built with the same CSS-module convention.
const TARGETS = [
	{ id: "kilocode.kilo-code", name: "Kilo Code", cssRel: ["dist", "webview.css"], jsRel: ["dist", "webview.js"] },
	{ id: "anthropic.claude-code", name: "Claude Code", cssRel: ["webview", "index.css"], jsRel: ["webview", "index.js"] },
];

let statusBarItem;
let outputChannel;

function getOutput() {
	if (!outputChannel) outputChannel = vscode.window.createOutputChannel("Kilo RTL");
	return outputChannel;
}

function findAllTargetPaths(log) {
	const found = [];
	for (const t of TARGETS) {
		const ext = vscode.extensions.getExtension(t.id);
		if (!ext) {
			if (log) log.push(`  ${t.name}: not installed, skipping`);
			continue;
		}
		const dir = ext.extensionPath;
		found.push({
			name: t.name,
			dir,
			cssPath: path.join(dir, ...t.cssRel),
			jsPath: path.join(dir, ...t.jsRel),
		});
	}
	return found;
}

async function exists(p) {
	try {
		await fs.access(p);
		return true;
	} catch {
		return false;
	}
}

async function atomicWrite(filePath, content) {
	const tmp = `${filePath}.rootmp.${process.pid}`;
	try {
		await fs.writeFile(tmp, content, "utf-8");
		await fs.rename(tmp, filePath);
	} catch (err) {
		await fs.rm(tmp, { force: true }).catch(() => {});
		throw err;
	}
}

async function patchFile(filePath, injected, beginMarker, endMarker, label, log) {
	try {
		if (!(await exists(filePath))) {
			log.push(`  ${label}: not found at expected path, skipping`);
			return false;
		}
		const backupPath = `${filePath}.bak`;
		if (await exists(backupPath)) {
			await fs.copyFile(backupPath, filePath);
		} else {
			await fs.copyFile(filePath, backupPath);
			log.push(`  ${label}: backup created at ${backupPath}`);
		}
		const original = await fs.readFile(filePath, "utf-8");
		if (original.includes(beginMarker)) {
			log.push(`  ${label}: already patched, skipping`);
			return false;
		}
		const patched = `${original}\n${injected}\n`;
		const backupSize = (await fs.stat(backupPath)).size;
		if (Buffer.byteLength(patched, "utf-8") < backupSize) {
			log.push(`  ${label}: corruption guard triggered, aborted`);
			return false;
		}
		await atomicWrite(filePath, patched);
		log.push(`  ${label}: RTL support injected`);
		return true;
	} catch (err) {
		log.push(`  ${label}: error - ${err.message}`);
		return false;
	}
}

async function unpatchFile(filePath, label, log) {
	const backupPath = `${filePath}.bak`;
	if (!(await exists(backupPath))) {
		log.push(`  ${label}: no backup found, nothing to restore`);
		return false;
	}
	try {
		await fs.copyFile(backupPath, filePath);
		await fs.unlink(backupPath);
		log.push(`  ${label}: restored from backup`);
		return true;
	} catch (err) {
		log.push(`  ${label}: error restoring - ${err.message}`);
		return false;
	}
}

async function isPatched(filePath, marker) {
	try {
		const content = await fs.readFile(filePath, "utf-8");
		return content.includes(marker);
	} catch {
		return false;
	}
}

async function activateRtl() {
	const out = getOutput();
	out.clear();
	const log = [];
	const targets = findAllTargetPaths(log);
	if (targets.length === 0) {
		log.forEach((l) => out.appendLine(l));
		out.show(true);
		vscode.window.showWarningMessage("Kilo RTL: none of the supported extensions (Kilo Code, Claude Code) are installed.");
		return false;
	}
	const jsInjected = `${JS_BEGIN}\n${await fs.readFile(path.join(__dirname, "rtl-inject.js"), "utf-8")}\n${JS_END}`;
	const cssInjected = `${CSS_BEGIN}\n${await fs.readFile(path.join(__dirname, "rtl-inject.css"), "utf-8")}\n${CSS_END}`;
	let anyChanged = false;
	for (const t of targets) {
		log.push(`${t.name}:`);
		const cssChanged = await patchFile(t.cssPath, cssInjected, CSS_BEGIN, CSS_END, "CSS", log);
		const jsChanged = await patchFile(t.jsPath, jsInjected, JS_BEGIN, JS_END, "JS", log);
		if (cssChanged || jsChanged) anyChanged = true;
	}
	log.forEach((l) => out.appendLine(l));
	if (anyChanged) {
		out.show(true);
		const choice = await vscode.window.showInformationMessage(
			"Kilo RTL: patched. Reload the window to apply (close any open chat panel first).",
			"Reload Now",
		);
		if (choice === "Reload Now") vscode.commands.executeCommand("workbench.action.reloadWindow");
	}
	return true;
}

async function deactivateRtl() {
	const out = getOutput();
	out.clear();
	const log = [];
	const targets = findAllTargetPaths(log);
	if (targets.length === 0) {
		log.forEach((l) => out.appendLine(l));
		out.show(true);
		vscode.window.showWarningMessage("Kilo RTL: none of the supported extensions (Kilo Code, Claude Code) are installed.");
		return;
	}
	let anyChanged = false;
	for (const t of targets) {
		log.push(`${t.name}:`);
		const cssChanged = await unpatchFile(t.cssPath, "CSS", log);
		const jsChanged = await unpatchFile(t.jsPath, "JS", log);
		if (cssChanged || jsChanged) anyChanged = true;
	}
	log.forEach((l) => out.appendLine(l));
	if (anyChanged) {
		out.show(true);
		const choice = await vscode.window.showInformationMessage("Kilo RTL: removed. Reload the window to apply.", "Reload Now");
		if (choice === "Reload Now") vscode.commands.executeCommand("workbench.action.reloadWindow");
	}
}

async function showStatus() {
	const out = getOutput();
	out.clear();
	out.appendLine(`IDE: ${vscode.env.appName}`);
	const log = [];
	const targets = findAllTargetPaths(log);
	log.forEach((l) => out.appendLine(l));
	if (targets.length === 0) {
		out.appendLine("No supported extensions (Kilo Code, Claude Code) found.");
	}
	for (const t of targets) {
		out.appendLine(`${t.name} path: ${t.dir}`);
		out.appendLine(`  CSS patched: ${await isPatched(t.cssPath, CSS_BEGIN)}`);
		out.appendLine(`  JS patched: ${await isPatched(t.jsPath, JS_BEGIN)}`);
		out.appendLine(`  CSS backup exists: ${await exists(`${t.cssPath}.bak`)}`);
		out.appendLine(`  JS backup exists: ${await exists(`${t.jsPath}.bak`)}`);
	}
	out.appendLine("Markdown preview: RTL auto-detection is always active for .md files (no patching needed).");
	out.show(true);
	updateStatusBar();
}

async function updateStatusBar() {
	if (!statusBarItem) return;
	const targets = findAllTargetPaths();
	if (targets.length === 0) {
		statusBarItem.text = "$(globe) Kilo RTL: N/A";
		statusBarItem.tooltip = "Kilo Code / Claude Code not found";
		return;
	}
	let anyPatched = false;
	for (const t of targets) {
		if (await isPatched(t.cssPath, CSS_BEGIN)) {
			anyPatched = true;
			break;
		}
	}
	statusBarItem.text = anyPatched ? "$(globe) Kilo RTL: Active" : "$(globe) Kilo RTL: Inactive";
	statusBarItem.tooltip = "Click to manage Kilo/Claude RTL support";
}

function activate(context) {
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
	statusBarItem.command = "kiloRtl.status";
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	context.subscriptions.push(
		vscode.commands.registerCommand("kiloRtl.activate", async () => {
			await activateRtl();
			await context.globalState.update(STATE_KEY, "active");
			updateStatusBar();
		}),
		vscode.commands.registerCommand("kiloRtl.deactivate", async () => {
			await deactivateRtl();
			await context.globalState.update(STATE_KEY, "inactive");
			updateStatusBar();
		}),
		vscode.commands.registerCommand("kiloRtl.status", showStatus),
	);

	const mode = context.globalState.get(STATE_KEY, "active");
	if (mode === "active") {
		activateRtl().catch((err) => getOutput().appendLine(`Auto-activation failed: ${err.message}`));
	}
	updateStatusBar();
}

function deactivate() {}

module.exports = { activate, deactivate };

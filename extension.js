"use strict";
const vscode = require("vscode");
const fs = require("fs/promises");
const path = require("path");

const KILO_EXTENSION_ID = "kilocode.kilo-code";
const CSS_BEGIN = "/* Kilo RTL Text Support - Added by Kilo Code RTL Support */";
const CSS_END = "/* End Kilo RTL Text Support */";
const JS_BEGIN = "/* Kilo RTL Auto-Direction Script - Injected by Kilo Code RTL Support */";
const JS_END = "/* End Kilo RTL Auto-Direction Script */";
const STATE_KEY = "kiloRtl.mode";

let statusBarItem;
let outputChannel;

function getOutput() {
	if (!outputChannel) outputChannel = vscode.window.createOutputChannel("Kilo RTL");
	return outputChannel;
}

function findKiloCodePaths() {
	const ext = vscode.extensions.getExtension(KILO_EXTENSION_ID);
	if (!ext) return null;
	const dir = ext.extensionPath;
	return {
		dir,
		cssPath: path.join(dir, "dist", "webview.css"),
		jsPath: path.join(dir, "dist", "webview.js"),
	};
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
	const paths = findKiloCodePaths();
	const out = getOutput();
	out.clear();
	if (!paths) {
		vscode.window.showWarningMessage("Kilo RTL: Kilo Code extension (kilocode.kilo-code) not found.");
		return false;
	}
	if (!(await exists(paths.cssPath)) || !(await exists(paths.jsPath))) {
		vscode.window.showWarningMessage(
			"Kilo RTL: Kilo Code webview assets not found at the expected path. The extension layout may have changed.",
		);
		return false;
	}
	const log = [];
	const jsInjected = `${JS_BEGIN}\n${await fs.readFile(path.join(__dirname, "rtl-inject.js"), "utf-8")}\n${JS_END}`;
	const cssInjected = `${CSS_BEGIN}\n${await fs.readFile(path.join(__dirname, "rtl-inject.css"), "utf-8")}\n${CSS_END}`;
	const cssChanged = await patchFile(paths.cssPath, cssInjected, CSS_BEGIN, CSS_END, "CSS", log);
	const jsChanged = await patchFile(paths.jsPath, jsInjected, JS_BEGIN, JS_END, "JS", log);
	log.forEach((l) => out.appendLine(l));
	if (cssChanged || jsChanged) {
		out.show(true);
		const choice = await vscode.window.showInformationMessage(
			"Kilo RTL: patched. Reload the window to apply (close any open Kilo Code panel first).",
			"Reload Now",
		);
		if (choice === "Reload Now") vscode.commands.executeCommand("workbench.action.reloadWindow");
	}
	return true;
}

async function deactivateRtl() {
	const paths = findKiloCodePaths();
	const out = getOutput();
	out.clear();
	if (!paths) {
		vscode.window.showWarningMessage("Kilo RTL: Kilo Code extension not found.");
		return;
	}
	const log = [];
	const cssChanged = await unpatchFile(paths.cssPath, "CSS", log);
	const jsChanged = await unpatchFile(paths.jsPath, "JS", log);
	log.forEach((l) => out.appendLine(l));
	if (cssChanged || jsChanged) {
		out.show(true);
		const choice = await vscode.window.showInformationMessage("Kilo RTL: removed. Reload the window to apply.", "Reload Now");
		if (choice === "Reload Now") vscode.commands.executeCommand("workbench.action.reloadWindow");
	}
}

async function showStatus() {
	const paths = findKiloCodePaths();
	const out = getOutput();
	out.clear();
	out.appendLine(`IDE: ${vscode.env.appName}`);
	if (!paths) {
		out.appendLine("Kilo Code extension not found.");
		out.show(true);
		return;
	}
	out.appendLine(`Kilo Code path: ${paths.dir}`);
	out.appendLine(`CSS patched: ${await isPatched(paths.cssPath, CSS_BEGIN)}`);
	out.appendLine(`JS patched: ${await isPatched(paths.jsPath, JS_BEGIN)}`);
	out.appendLine(`CSS backup exists: ${await exists(`${paths.cssPath}.bak`)}`);
	out.appendLine(`JS backup exists: ${await exists(`${paths.jsPath}.bak`)}`);
	out.show(true);
	updateStatusBar();
}

async function updateStatusBar() {
	if (!statusBarItem) return;
	const paths = findKiloCodePaths();
	if (!paths) {
		statusBarItem.text = "$(globe) Kilo RTL: N/A";
		statusBarItem.tooltip = "Kilo Code extension not found";
		return;
	}
	const patched = await isPatched(paths.cssPath, CSS_BEGIN);
	statusBarItem.text = patched ? "$(globe) Kilo RTL: Active" : "$(globe) Kilo RTL: Inactive";
	statusBarItem.tooltip = "Click to manage Kilo Code RTL support";
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

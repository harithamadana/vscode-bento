import * as vscode from 'vscode';
import { promises as fs } from 'fs';

/**
 * Bento contributes empty containers for the user to drag views into.
 *
 * A container only stays in the activity bar while it holds at least one
 * visible view, so each one ships with a `gettingStarted` view that holds its
 * icon open until the user has dropped something of their own in. That same
 * rule is what gates the optional containers: their view carries a `when`
 * clause tied to a setting, and when it evaluates false the whole container
 * drops out of the activity bar.
 *
 * Welcome content only renders for an *empty tree view*, which means each view
 * needs a registered provider that yields nothing — an unclaimed view id would
 * not fall through to the `viewsWelcome` contribution.
 */
const GROUP_COUNT = 6;

const emptyProvider: vscode.TreeDataProvider<never> = {
	getChildren: () => [],
	getTreeItem: (element: never) => element
};

export function activate(context: vscode.ExtensionContext): void {
	for (let group = 1; group <= GROUP_COUNT; group++) {
		context.subscriptions.push(
			vscode.window.registerTreeDataProvider(`bento${group}.gettingStarted`, emptyProvider)
		);
	}

	void syncContainerNames(context);

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration('bento.names')) {
				void syncContainerNames(context);
			}
		})
	);
}

function desiredStrings(): Record<string, string> {
	const names = vscode.workspace
		.getConfiguration('bento')
		.get<Record<string, string>>('names', {});

	const strings: Record<string, string> = {};
	for (let group = 1; group <= GROUP_COUNT; group++) {
		const custom = names[`bento${group}`];
		strings[`bento${group}.title`] =
			typeof custom === 'string' && custom.trim() ? custom.trim() : `Bento ${group}`;
	}
	return strings;
}

/**
 * Container titles are manifest entries that VS Code reads once at startup —
 * there is no API to rename one at runtime. The only way to honour
 * `bento.names` is to rewrite the string table on disk and reload the window.
 *
 * Writing `package.nls.json` rather than `package.json` keeps the manifest
 * itself untouched, so a failed write can never corrupt the extension. An
 * update reinstalls the defaults, but the next activation sees the mismatch and
 * offers to reapply, so custom names survive updates by one extra reload.
 */
async function syncContainerNames(context: vscode.ExtensionContext): Promise<void> {
	const desired = desiredStrings();
	const stringTable = vscode.Uri.joinPath(context.extensionUri, 'package.nls.json').fsPath;
	const manifest = vscode.Uri.joinPath(context.extensionUri, 'package.json').fsPath;

	try {
		const current = JSON.parse(await fs.readFile(stringTable, 'utf8')) as Record<string, string>;
		if (Object.keys(desired).every((key) => current[key] === desired[key])) {
			return;
		}

		await fs.writeFile(stringTable, `${JSON.stringify(desired, null, 2)}\n`, 'utf8');

		// The parsed manifest is cached against package.json's timestamp, so the
		// string table alone changing would not invalidate it.
		const now = new Date();
		await fs.utimes(manifest, now, now);
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		void vscode.window.showWarningMessage(
			`Bento could not rename its containers: ${reason}. The extension directory may be read-only.`
		);
		return;
	}

	const reload = 'Reload Window';
	const choice = await vscode.window.showInformationMessage(
		'Bento container names updated. Reload the window to apply them.',
		reload
	);
	if (choice === reload) {
		await vscode.commands.executeCommand('workbench.action.reloadWindow');
	}
}

export function deactivate(): void {
	// Nothing to clean up.
}

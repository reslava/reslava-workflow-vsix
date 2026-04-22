import * as vscode from 'vscode';
import { summarise } from '@reslava-loom/app/dist/summarise';
import { loadWeave } from '@reslava-loom/fs/dist';
import * as fs from 'fs-extra';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function summariseCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const weaveId = node?.weaveId ?? await vscode.window.showInputBox({
        prompt: 'Weave ID to summarise',
        placeHolder: 'e.g., payment-system',
    });
    if (!weaveId) return;

    try {
        const result = await summarise(
            { weaveId, force: false },
            {
                loadWeave,
                getActiveLoomRoot: () => workspaceRoot,
                fs,
                loomRoot: workspaceRoot,
            }
        );

        if (result.generated) {
            vscode.window.showInformationMessage(`🧵 Context summary generated: ${weaveId}-ctx.md`);
            const doc = await vscode.workspace.openTextDocument(result.ctxPath);
            vscode.window.showTextDocument(doc);
        } else {
            vscode.window.showInformationMessage(`Context summary is up to date: ${weaveId}-ctx.md`);
        }
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to summarise: ${e.message}`);
    }
}

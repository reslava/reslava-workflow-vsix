import * as vscode from 'vscode';
import { finalize } from '@reslava-loom/app/dist/finalize';
import { loadDoc, saveDoc, findDocumentById, gatherAllDocumentIds } from '@reslava-loom/fs/dist';
import * as fs from 'fs-extra';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function finalizeCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const prefilledId = node?.doc?.id?.startsWith('new-') ? node.doc.id : undefined;
    const tempId = prefilledId ?? await vscode.window.showInputBox({
        prompt: 'Temporary document ID to finalize',
        placeHolder: 'e.g., new-20260422084129-idea',
    });
    if (!tempId) return;

    try {
        const result = await finalize(
            { tempId },
            {
                loadDoc,
                saveDoc,
                getActiveLoomRoot: () => workspaceRoot,
                findDocumentById,
                gatherAllDocumentIds,
                fs,
            }
        );
        vscode.window.showInformationMessage(`🧵 Finalized: ${result.oldId} → ${result.newId}`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to finalize: ${e.message}`);
    }
}

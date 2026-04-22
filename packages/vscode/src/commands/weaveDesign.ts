import * as vscode from 'vscode';
import { weaveDesign } from '@reslava-loom/app/dist/weaveDesign';
import { saveDoc, loadDoc } from '@reslava-loom/fs/dist';
import * as fs from 'fs-extra';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function weaveDesignCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const weaveId = node?.weaveId ?? await vscode.window.showInputBox({
        prompt: 'Thread ID',
        placeHolder: 'e.g., payment-system',
    });
    if (!weaveId) return;

    // Optional custom title
    const customTitle = await vscode.window.showInputBox({
        prompt: 'Design title (optional)',
        placeHolder: 'Leave blank to use idea title or thread ID',
    });

    try {
        const result = await weaveDesign(
            { weaveId, title: customTitle || undefined },
            {
                getActiveLoomRoot: () => workspaceRoot,
                saveDoc,
                loadDoc,
                fs,
            }
        );

        if (result.autoFinalized) {
            vscode.window.showInformationMessage(`🧵 Idea auto-finalized. Design woven: ${result.id}`);
        } else {
            vscode.window.showInformationMessage(`🧵 Design woven: ${result.id}`);
        }
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to weave design: ${e.message}`);
    }
}
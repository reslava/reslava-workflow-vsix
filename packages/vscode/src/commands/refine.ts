import * as vscode from 'vscode';
import { runEvent } from '@reslava-loom/app/dist/runEvent';
import { loadWeave, saveWeave } from '@reslava-loom/fs/dist';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function refineCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const weaveId = node?.weaveId ?? await vscode.window.showInputBox({
        prompt: 'Weave ID to refine design',
        placeHolder: 'e.g., payment-system',
    });
    if (!weaveId) return;

    try {
        const loomRoot = workspaceRoot;
        const loadWeaveOrThrow = async (root: string, id: string) => {
            const weave = await loadWeave(root, id);
            if (!weave) throw new Error(`Weave '${id}' is empty or does not exist.`);
            return weave;
        };

        await runEvent(
            weaveId,
            { type: 'REFINE_DESIGN' },
            { loadWeave: loadWeaveOrThrow, saveWeave, loomRoot }
        );
        vscode.window.showInformationMessage(`🧵 Design refined: ${weaveId} (version incremented)`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to refine design: ${e.message}`);
    }
}

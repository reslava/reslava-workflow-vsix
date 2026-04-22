import * as vscode from 'vscode';
import { summarise } from '@reslava-loom/app/dist/summarise';
import { loadWeave } from '@reslava-loom/fs/dist';
import { makeAIClient } from '../ai/makeAIClient';
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
        const aiClient = makeAIClient();
        let result: { ctxPath: string; generated: boolean };

        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loom: Summarising weave…', cancellable: false },
            async () => {
                result = await summarise(
                    { weaveId, force: false },
                    {
                        loadWeave,
                        getActiveLoomRoot: () => workspaceRoot,
                        fs,
                        loomRoot: workspaceRoot,
                        aiClient,
                    }
                );
            }
        );

        treeProvider.refresh();
        if (result!.generated) {
            const doc = await vscode.workspace.openTextDocument(result!.ctxPath);
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage(`Context summary generated: ${weaveId}-ctx.md`);
        } else {
            vscode.window.showInformationMessage(`Context summary is up to date: ${weaveId}-ctx.md`);
        }
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to summarise: ${e.message}`);
    }
}

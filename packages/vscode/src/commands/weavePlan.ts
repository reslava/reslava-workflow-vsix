import * as vscode from 'vscode';
import { weavePlan } from '@reslava-loom/app/dist/weavePlan';
import { loadWeave, saveDoc } from '@reslava-loom/fs/dist';
import * as fs from 'fs-extra';
import { LoomTreeProvider } from '../tree/treeProvider';

export async function weavePlanCommand(treeProvider: LoomTreeProvider): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    // Get thread ID from user
    const weaveId = await vscode.window.showInputBox({
        prompt: 'Thread ID',
        placeHolder: 'e.g., payment-system',
    });
    if (!weaveId) return;

    // Optional custom title
    const customTitle = await vscode.window.showInputBox({
        prompt: 'Plan title (optional)',
        placeHolder: 'Leave blank to use thread ID',
    });

    // Optional goal
    const goal = await vscode.window.showInputBox({
        prompt: 'Goal (optional)',
        placeHolder: 'Brief description of what this plan implements',
    });

    try {
        const result = await weavePlan(
            { weaveId, title: customTitle || undefined, goal: goal || undefined },
            {
                loomRoot: workspaceRoot,
                loadWeave,
                saveDoc,
                fs,
            }
        );

        if (result.autoFinalizedDesign) {
            vscode.window.showInformationMessage(`🧵 Design auto-finalized. Plan woven: ${result.id}`);
        } else {
            vscode.window.showInformationMessage(`🧵 Plan woven: ${result.id}`);
        }
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to weave plan: ${e.message}`);
    }
}
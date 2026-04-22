import * as vscode from 'vscode';
import { weavePlan } from '@reslava-loom/app/dist/weavePlan';
import { loadWeave, saveDoc } from '@reslava-loom/fs/dist';
import * as fs from 'fs-extra';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function weavePlanCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
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

    // When triggered from a design node, link the plan to that design
    const parentId = node?.doc?.id;

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
            { weaveId, title: customTitle || undefined, goal: goal || undefined, parentId },
            {
                loomRoot: workspaceRoot,
                loadWeave,
                saveDoc,
                fs,
            }
        );

        vscode.window.showInformationMessage(`🧵 Plan woven: ${result.id}`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to weave plan: ${e.message}`);
    }
}
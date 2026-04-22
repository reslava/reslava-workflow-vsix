import * as vscode from 'vscode';
import { completeStep } from '@reslava-loom/app/dist/completeStep';
import { runEvent } from '@reslava-loom/app/dist/runEvent';
import { loadWeave, saveWeave } from '@reslava-loom/fs/dist';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function completeStepCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const planId = node?.doc?.id ?? await vscode.window.showInputBox({
        prompt: 'Plan ID',
        placeHolder: 'e.g., payment-system-plan-001',
    });
    if (!planId) return;

    const stepStr = await vscode.window.showInputBox({
        prompt: 'Step number to complete',
        placeHolder: 'e.g., 1',
        validateInput: v => (isNaN(Number(v)) || Number(v) < 1 ? 'Enter a positive number' : null),
    });
    if (!stepStr) return;

    try {
        const loomRoot = workspaceRoot;
        const loadWeaveOrThrow = async (root: string, id: string) => {
            const weave = await loadWeave(root, id);
            if (!weave) throw new Error(`Weave '${id}' is empty or does not exist.`);
            return weave;
        };
        const runEventFn = (wid: string, evt: any) =>
            runEvent(wid, evt, { loadWeave: loadWeaveOrThrow, saveWeave, loomRoot });

        const result = await completeStep(
            { planId, step: Number(stepStr) },
            { loadWeave: loadWeaveOrThrow, runEvent: runEventFn, loomRoot }
        );

        const msg = result.autoCompleted
            ? `🧵 Step ${stepStr} done — plan complete!`
            : `🧵 Step ${stepStr} completed: ${planId}`;
        vscode.window.showInformationMessage(msg);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to complete step: ${e.message}`);
    }
}

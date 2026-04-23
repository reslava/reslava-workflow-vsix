import * as vscode from 'vscode';
import { completeStep } from '@reslava-loom/app/dist/completeStep';
import { runEvent } from '@reslava-loom/app/dist/runEvent';
import { loadWeave, saveWeave } from '@reslava-loom/fs/dist';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { PlanDoc } from '@reslava-loom/core/dist/entities/plan';

export async function completeStepCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const plan = node?.doc as PlanDoc | undefined;
    if (!plan || plan.type !== 'plan') {
        vscode.window.showErrorMessage('Select a plan node to complete steps.');
        return;
    }

    if (plan.status !== 'implementing') {
        vscode.window.showErrorMessage(`Plan must be "implementing" to complete steps. Current status: ${plan.status}`);
        return;
    }

    const pendingSteps = plan.steps?.filter(s => !s.done) ?? [];
    if (pendingSteps.length === 0) {
        vscode.window.showInformationMessage('All steps are already done.');
        return;
    }

    const items = pendingSteps.map(s => ({
        label: `Step ${s.order}: ${s.description}`,
        detail: s.files_touched.length ? `Files: ${s.files_touched.join(', ')}` : undefined,
        stepOrder: s.order,
    }));

    const selected = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: 'Select step(s) to mark done',
        title: `Complete Steps — ${plan.title}`,
    });
    if (!selected || selected.length === 0) return;

    const loomRoot = workspaceRoot;
    const loadWeaveOrThrow = async (root: string, id: string) => {
        const weave = await loadWeave(root, id);
        if (!weave) throw new Error(`Weave '${id}' does not exist.`);
        return weave;
    };
    const runEventFn = (wid: string, evt: any) =>
        runEvent(wid, evt, { loadWeave: loadWeaveOrThrow, saveWeave, loomRoot });

    let lastResult: { plan: PlanDoc; autoCompleted: boolean } | undefined;
    try {
        for (const item of selected) {
            lastResult = await completeStep(
                { planId: plan.id, step: item.stepOrder },
                { loadWeave: loadWeaveOrThrow, runEvent: runEventFn, loomRoot }
            );
        }

        if (lastResult?.autoCompleted) {
            vscode.window.showInformationMessage(`🧵 All steps done — plan complete!`);
        } else {
            const count = selected.length;
            vscode.window.showInformationMessage(
                `🧵 ${count} step${count > 1 ? 's' : ''} completed: ${plan.id}`
            );
        }
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to complete step: ${e.message}`);
        treeProvider.refresh();
    }
}

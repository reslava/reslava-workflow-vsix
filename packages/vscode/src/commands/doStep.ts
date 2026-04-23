import * as vscode from 'vscode';
import { doStep } from '@reslava-loom/app/dist/doStep';
import { loadWeave, saveDoc } from '@reslava-loom/fs/dist';
import { makeAIClient } from '../ai/makeAIClient';
import * as fs from 'fs-extra';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { PlanDoc } from '@reslava-loom/core/dist/entities/plan';

export async function doStepCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const plan = node?.doc as PlanDoc | undefined;
    if (!plan || plan.type !== 'plan') {
        vscode.window.showErrorMessage('Select a plan node to use Do Step.');
        return;
    }

    if (plan.status !== 'implementing') {
        vscode.window.showErrorMessage(`Plan must be "implementing" to use Do Step. Current status: ${plan.status}`);
        return;
    }

    const pendingSteps = plan.steps?.filter(s => !s.done) ?? [];
    if (pendingSteps.length === 0) {
        vscode.window.showInformationMessage('All steps are already done.');
        return;
    }

    const items = pendingSteps.map((s, i) => ({
        label: `Step ${s.order}: ${s.description}`,
        detail: s.files_touched.length ? `Files: ${s.files_touched.join(', ')}` : undefined,
        picked: i === 0,
        stepOrder: s.order,
    }));

    const selected = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: 'Select step(s) for AI to implement',
        title: `Do Steps — ${plan.title}`,
    });
    if (!selected || selected.length === 0) return;

    const stepNumbers = selected.map(s => s.stepOrder);

    try {
        const aiClient = makeAIClient();
        let result: { chatPath: string; chatId: string };

        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loom: AI implementing steps…', cancellable: false },
            async () => {
                result = await doStep(
                    { planId: plan.id, steps: stepNumbers },
                    { loadWeave, saveDoc, fs, aiClient, loomRoot: workspaceRoot }
                );
            }
        );

        treeProvider.refresh();
        const doc = await vscode.workspace.openTextDocument(result!.chatPath);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage(`AI implementation ready — ${result!.chatId}`);
    } catch (e: any) {
        vscode.window.showErrorMessage(`Do Step failed: ${e.message}`);
    }
}

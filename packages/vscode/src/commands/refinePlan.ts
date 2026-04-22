import * as vscode from 'vscode';
import { refinePlan } from '@reslava-loom/app/dist/refinePlan';
import { loadDoc, saveDoc } from '@reslava-loom/fs/dist';
import { makeAIClient } from '../ai/makeAIClient';
import { LoomTreeProvider } from '../tree/treeProvider';

export async function refinePlanCommand(treeProvider: LoomTreeProvider): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor.');
        return;
    }

    const filePath = editor.document.uri.fsPath;
    if (!/-plan-\d+\.md$/.test(filePath)) {
        vscode.window.showErrorMessage('Active file is not a Loom plan document (*-plan-NNN.md).');
        return;
    }

    await editor.document.save();

    try {
        const aiClient = makeAIClient();
        let result: { filePath: string; version: number };

        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loom: Refining plan…', cancellable: false },
            async () => {
                result = await refinePlan({ filePath }, { loadDoc, saveDoc, aiClient });
            }
        );

        treeProvider.refresh();
        const doc = await vscode.workspace.openTextDocument(result!.filePath);
        await vscode.window.showTextDocument(doc, { preview: false });
        vscode.window.showInformationMessage(`Plan refined (v${result!.version})`);
    } catch (e: any) {
        vscode.window.showErrorMessage(`Refine plan failed: ${e.message}`);
    }
}

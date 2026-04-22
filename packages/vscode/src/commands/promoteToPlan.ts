import * as vscode from 'vscode';
import { promoteToPlan } from '@reslava-loom/app/dist/promoteToPlan';
import { loadDoc, saveDoc } from '@reslava-loom/fs/dist';
import { makeAIClient } from '../ai/makeAIClient';
import { LoomTreeProvider } from '../tree/treeProvider';

const VALID_SOURCES = /(-chat(-\d+)?|-idea|-design)\.md$/;

export async function promoteToPlanCommand(treeProvider: LoomTreeProvider): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor.');
        return;
    }

    const filePath = editor.document.uri.fsPath;
    if (!VALID_SOURCES.test(filePath)) {
        vscode.window.showErrorMessage('Active file must be a Loom chat, idea, or design document.');
        return;
    }

    await editor.document.save();

    const loomRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!loomRoot) {
        vscode.window.showErrorMessage('No workspace folder open.');
        return;
    }

    try {
        const aiClient = makeAIClient();
        let result: { filePath: string; title: string };

        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loom: Promoting to plan…', cancellable: false },
            async () => {
                const fs = await import('fs-extra');
                result = await promoteToPlan(
                    { filePath },
                    { loadDoc, saveDoc, fs, aiClient, loomRoot }
                );
            }
        );

        treeProvider.refresh();
        const doc = await vscode.workspace.openTextDocument(result!.filePath);
        await vscode.window.showTextDocument(doc, { preview: false });
        vscode.window.showInformationMessage(`Plan created: ${result!.title}`);
    } catch (e: any) {
        vscode.window.showErrorMessage(`Promote to plan failed: ${e.message}`);
    }
}

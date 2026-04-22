import * as vscode from 'vscode';
import { refineIdea } from '@reslava-loom/app/dist/refineIdea';
import { loadDoc, saveDoc } from '@reslava-loom/fs/dist';
import { makeAIClient } from '../ai/makeAIClient';
import { LoomTreeProvider } from '../tree/treeProvider';

export async function refineIdeaCommand(treeProvider: LoomTreeProvider): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor.');
        return;
    }

    const filePath = editor.document.uri.fsPath;
    if (!/-idea(\.md|-\d+\.md)$/.test(filePath)) {
        vscode.window.showErrorMessage('Active file is not a Loom idea document (*-idea.md).');
        return;
    }

    await editor.document.save();

    try {
        const aiClient = makeAIClient();
        let result: { filePath: string; version: number };

        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loom: Refining idea…', cancellable: false },
            async () => {
                result = await refineIdea({ filePath }, { loadDoc, saveDoc, aiClient });
            }
        );

        treeProvider.refresh();
        const doc = await vscode.workspace.openTextDocument(result!.filePath);
        await vscode.window.showTextDocument(doc, { preview: false });
        vscode.window.showInformationMessage(`Idea refined (v${result!.version})`);
    } catch (e: any) {
        vscode.window.showErrorMessage(`Refine idea failed: ${e.message}`);
    }
}

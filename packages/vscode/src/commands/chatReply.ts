import * as vscode from 'vscode';
import { chatReply } from '@reslava-loom/app/dist/chatReply';
import { loadDoc, saveDoc } from '@reslava-loom/fs/dist';
import { makeAIClient } from '../ai/makeAIClient';

export async function chatReplyCommand(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor.');
        return;
    }

    const filePath = editor.document.uri.fsPath;
    if (!/-chat(-\d+)?\.md$/.test(filePath)) {
        vscode.window.showErrorMessage('Active file is not a Loom chat document (*-chat.md or *-chat-NNN.md).');
        return;
    }

    await editor.document.save();

    try {
        const aiClient = makeAIClient();
        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loom: AI thinking…', cancellable: false },
            () => chatReply({ filePath }, { loadDoc, saveDoc, aiClient })
        );
        const updated = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(updated, { preview: false, preserveFocus: false });
    } catch (e: any) {
        vscode.window.showErrorMessage(`Chat reply failed: ${e.message}`);
    }
}

import * as vscode from 'vscode';
import { weaveIdea } from '@reslava-loom/app/dist/weaveIdea';
import { getActiveLoomRoot, saveDoc } from '@reslava-loom/fs/dist';
import * as fs from 'fs-extra';
import { LoomTreeProvider } from '../tree/treeProvider';

export async function weaveIdeaCommand(treeProvider: LoomTreeProvider): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const title = await vscode.window.showInputBox({
        prompt: 'Idea title',
        placeHolder: 'e.g., Add Dark Mode',
    });
    if (!title) return;

    try {
        const result = await weaveIdea(
            { title },
            {
                getActiveLoomRoot: () => workspaceRoot,
                saveDoc,
                fs,
            }
        );

        vscode.window.showInformationMessage(`🧵 Idea woven: ${result.tempId}`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to weave idea: ${e.message}`);
    }
}
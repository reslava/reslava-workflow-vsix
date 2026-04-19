import * as vscode from 'vscode';
import { LoomTreeProvider } from './tree/treeProvider';
import { ViewStateManager } from './view/viewStateManager';
import { weaveIdeaCommand } from './commands/weaveIdea';
import { showGroupingSelector } from './commands/grouping';

export function activate(context: vscode.ExtensionContext) {
    console.log('🧵 Loom extension activated');

    const viewStateManager = new ViewStateManager(context.workspaceState);
    const treeProvider = new LoomTreeProvider(viewStateManager);
    
    const treeView = vscode.window.createTreeView('loom.threads', {
        treeDataProvider: treeProvider,
        showCollapseAll: true,
    });
    context.subscriptions.push(treeView);

    function syncAndRefresh(): void {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        treeProvider.setWorkspaceRoot(root);
        treeProvider.refresh();
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('loom.refresh', syncAndRefresh),
        vscode.commands.registerCommand('loom.weaveIdea', () => weaveIdeaCommand(treeProvider)),
        vscode.commands.registerCommand('loom.setGrouping', () => showGroupingSelector(viewStateManager, treeProvider))
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(() => syncAndRefresh())
    );

    const watcher = vscode.workspace.createFileSystemWatcher('**/threads/**/*.md');
    const debouncedRefresh = debounce(() => treeProvider.refresh(), 300);
    context.subscriptions.push(watcher.onDidCreate(debouncedRefresh));
    context.subscriptions.push(watcher.onDidChange(debouncedRefresh));
    context.subscriptions.push(watcher.onDidDelete(debouncedRefresh));
    context.subscriptions.push(watcher);

    setImmediate(() => syncAndRefresh());
}

export function deactivate() {}

function debounce(fn: () => void, ms: number): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(fn, ms);
    };
}
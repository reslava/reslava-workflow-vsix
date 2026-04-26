import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { LoomTreeProvider, TreeNode } from './tree/treeProvider';
import { ViewStateManager } from './view/viewStateManager';
import { weaveIdeaCommand } from './commands/weaveIdea';
import { weaveDesignCommand } from './commands/weaveDesign';
import { weavePlanCommand } from './commands/weavePlan';
import { finalizeCommand } from './commands/finalize';
import { renameCommand } from './commands/rename';
import { refineCommand } from './commands/refine';
import { startPlanCommand } from './commands/startPlan';
import { completeStepCommand } from './commands/completeStep';
import { validateCommand } from './commands/validate';
import { summariseCommand } from './commands/summarise';
import { showGroupingSelector } from './commands/grouping';
import { setTextFilter, toggleArchived } from './commands/filter';
import { chatNewCommand } from './commands/chatNew';
import { chatReplyCommand } from './commands/chatReply';
import { weaveCreateCommand } from './commands/weaveCreate';
import { threadCreateCommand } from './commands/threadCreate';
import { deleteItemCommand } from './commands/deleteItem';
import { archiveItemCommand } from './commands/archiveItem';
import { promoteToIdeaCommand } from './commands/promoteToIdea';
import { promoteToDesignCommand } from './commands/promoteToDesign';
import { promoteToPlanCommand } from './commands/promoteToPlan';
import { refineIdeaCommand } from './commands/refineIdea';
import { refinePlanCommand } from './commands/refinePlan';
import { doStepCommand } from './commands/doStep';
import { closePlanCommand } from './commands/closePlan';
import { setIconBaseUri } from './icons';
import { updateDiagnostics } from './diagnostics';

export interface LoomExtensionAPI {
    treeProvider: LoomTreeProvider;
    getAiEnabled: () => boolean;
}

export function activate(context: vscode.ExtensionContext): LoomExtensionAPI {
    console.log('🧵 Loom extension activated');

    // Initialize icon base URI for custom icons
     setIconBaseUri(context.extensionUri);

    const viewStateManager = new ViewStateManager(context.workspaceState);
    const treeProvider = new LoomTreeProvider(viewStateManager);

    const treeView = vscode.window.createTreeView('loom.threads', {
        treeDataProvider: treeProvider,
        showCollapseAll: true,
    });
    context.subscriptions.push(treeView);

    const diagnosticCollection = vscode.languages.createDiagnosticCollection('loom');
    context.subscriptions.push(diagnosticCollection);

    function syncAndRefresh(): void {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        treeProvider.setWorkspaceRoot(root);
        treeProvider.refresh();
        if (root) updateDiagnostics(diagnosticCollection, root);
    }

    context.subscriptions.push(
        treeView.onDidChangeSelection(e => {
            const node = e.selection[0] as TreeNode | undefined;
            vscode.commands.executeCommand('setContext', 'loom.selectedWeaveId', node?.weaveId ?? '');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('loom.refresh', syncAndRefresh),
        vscode.commands.registerCommand('loom.weaveCreate', () => weaveCreateCommand(treeProvider)),
        vscode.commands.registerCommand('loom.threadCreate', () => threadCreateCommand(treeProvider, treeView)),
        vscode.commands.registerCommand('loom.weaveIdea', (node?: TreeNode) => weaveIdeaCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.weaveDesign', (node?: TreeNode) => weaveDesignCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.weavePlan', (node?: TreeNode) => weavePlanCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.finalize', (node?: TreeNode) => finalizeCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.rename', (node?: TreeNode) => renameCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.refineDesign', (node?: TreeNode) => refineCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.startPlan', (node?: TreeNode) => startPlanCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.completeStep', (node?: TreeNode) => completeStepCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.validate', () => validateCommand(treeProvider)),
        vscode.commands.registerCommand('loom.summarise', (node?: TreeNode) => summariseCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.setGrouping', () => showGroupingSelector(viewStateManager, treeProvider)),
        vscode.commands.registerCommand('loom.setTextFilter', () => setTextFilter(viewStateManager, treeProvider)),
        vscode.commands.registerCommand('loom.toggleArchived', () => toggleArchived(viewStateManager, treeProvider)),
        vscode.commands.registerCommand('loom.chatNew', (node?: TreeNode) => chatNewCommand(treeProvider, treeView, node)),
        vscode.commands.registerCommand('loom.chatReply', () => chatReplyCommand()),
        vscode.commands.registerCommand('loom.promoteToIdea', () => promoteToIdeaCommand(treeProvider)),
        vscode.commands.registerCommand('loom.promoteToDesign', () => promoteToDesignCommand(treeProvider)),
        vscode.commands.registerCommand('loom.promoteToPlan', () => promoteToPlanCommand(treeProvider)),
        vscode.commands.registerCommand('loom.refineIdea', () => refineIdeaCommand(treeProvider)),
        vscode.commands.registerCommand('loom.refinePlan', () => refinePlanCommand(treeProvider)),
        vscode.commands.registerCommand('loom.doStep', (node?: TreeNode) => doStepCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.closePlan', (node?: TreeNode) => closePlanCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.delete', (node?: TreeNode) => deleteItemCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.archive', (node?: TreeNode) => archiveItemCommand(treeProvider, node))
    );

    let aiEnabled = false;
    function syncAiContext(): void {
        const apiKey = vscode.workspace.getConfiguration('reslava-loom.ai').get<string>('apiKey') ?? '';
        aiEnabled = apiKey.length > 0;
        vscode.commands.executeCommand('setContext', 'loom.aiEnabled', aiEnabled);
    }
    syncAiContext();
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('reslava-loom.ai.apiKey')) syncAiContext();
        })
    );

    // MCP connection detection — check for loom server in known config locations
    const mcpStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
    mcpStatusBar.tooltip = 'Loom MCP server connection status';
    context.subscriptions.push(mcpStatusBar);

    async function syncMcpContext(): Promise<void> {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const connected = workspaceRoot ? await detectMcpConfig(workspaceRoot) : false;
        vscode.commands.executeCommand('setContext', 'loom.mcpConnected', connected);
        mcpStatusBar.text = connected ? '$(plug) Loom MCP' : '$(debug-disconnect) Loom MCP';
        mcpStatusBar.show();
    }
    syncMcpContext();

    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(() => syncAndRefresh())
    );

    const watcher = vscode.workspace.createFileSystemWatcher('**/loom/**/*.md');
    const debouncedRefresh = debounce(() => treeProvider.refresh(), 300);
    context.subscriptions.push(watcher.onDidCreate(debouncedRefresh));
    context.subscriptions.push(watcher.onDidChange(debouncedRefresh));
    context.subscriptions.push(watcher.onDidDelete(debouncedRefresh));
    context.subscriptions.push(watcher);

    setImmediate(() => syncAndRefresh());

    return { treeProvider, getAiEnabled: () => aiEnabled };
}

export function deactivate() {}

async function detectMcpConfig(workspaceRoot: string): Promise<boolean> {
    const candidates = [
        path.join(workspaceRoot, '.claude', 'mcp.json'),
        path.join(workspaceRoot, '.claude.json'),
        path.join(workspaceRoot, '.cursor', 'mcp.json'),
        path.join(workspaceRoot, '.vscode', 'mcp.json'),
    ];
    for (const candidate of candidates) {
        try {
            const raw = fs.readFileSync(candidate, 'utf8');
            const config = JSON.parse(raw);
            // Claude Code format: { mcpServers: { loom: { ... } } }
            // Cursor format: { mcpServers: { loom: { ... } } }
            const servers = config?.mcpServers ?? config?.servers ?? {};
            if (servers['loom']) return true;
        } catch { /* file missing or invalid JSON — continue */ }
    }
    return false;
}

function debounce(fn: () => void, ms: number): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(fn, ms);
    };
}
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { getState } from '@reslava-loom/app/dist/getState';
import { loadWeave, buildLinkIndex } from '@reslava-loom/fs/dist';
import { ConfigRegistry } from '@reslava-loom/core/dist/registry';
import { LoomState } from '@reslava-loom/core/dist/entities/state';
import { Weave } from '@reslava-loom/core/dist/entities/weave';
import { Document } from '@reslava-loom/core/dist/entities/document';
import { PlanDoc } from '@reslava-loom/core/dist/entities/plan';
import { getWeaveStatus } from '@reslava-loom/core/dist/derived';
import { ViewStateManager } from '../view/viewStateManager';
import { GroupingMode } from '../view/viewState';
import { getDocumentIcon, getWeaveIcon, getPlanIcon } from '../icons';

export interface TreeNode extends vscode.TreeItem {
    children?: TreeNode[];
    weaveId?: string;
    doc?: Document;
}

export class LoomTreeProvider implements vscode.TreeDataProvider<TreeNode> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private state: LoomState | null = null;
    private workspaceRoot: string | undefined;

    constructor(private viewStateManager: ViewStateManager) {}

    setWorkspaceRoot(root: string | undefined): void {
        this.workspaceRoot = root;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    async getTreeItem(element: TreeNode): Promise<vscode.TreeItem> {
        return element;
    }

    async getChildren(element?: TreeNode): Promise<TreeNode[]> {
        if (!element) {
            return this.getRootChildren();
        }
        return element.children ?? [];
    }

    private async getRootChildren(): Promise<TreeNode[]> {
        if (!this.workspaceRoot) {
            return [this.messageNode('No workspace open')];
        }

        const loomDir = path.join(this.workspaceRoot, '.loom');
        if (!fs.existsSync(loomDir)) {
            return [this.messageNode('No .loom directory found in workspace')];
        }

        try {
            const registry = new ConfigRegistry();
            this.state = await getState({
                getActiveLoomRoot: () => this.workspaceRoot!,
                loadWeave: (root, weaveId) => loadWeave(root, weaveId),
                buildLinkIndex: (root) => buildLinkIndex(root),
                registry,
                fs,
                workspaceRoot: this.workspaceRoot,
            });

            if (this.state.weaves.length === 0) {
                return [this.messageNode('No weaves found')];
            }

            const viewState = this.viewStateManager.getState();
            return this.groupWeaves(this.state.weaves, viewState.grouping);
        } catch (e: any) {
            console.error('🧵 Failed to load Loom state:', e);
            return [this.messageNode(`Error: ${e.message}`)];
        }
    }

    private groupWeaves(weaves: Weave[], grouping: GroupingMode): TreeNode[] {
        switch (grouping) {
            case 'type':
                return this.groupByType(weaves);
            case 'status':
                return this.groupByStatus(weaves);
            case 'release':
                return this.groupByRelease(weaves);
            case 'thread':
            default:
                return weaves.map(w => this.createWeaveNode(w));
        }
    }

    private groupByType(weaves: Weave[]): TreeNode[] {
        const groups: Record<string, Document[]> = {
            idea: [],
            design: [],
            plan: [],
            ctx: [],
        };
        for (const weave of weaves) {
            weave.ideas.forEach(i => groups.idea.push(i));
            weave.designs.forEach(d => groups.design.push(d));
            weave.plans.forEach(p => groups.plan.push(p));
            weave.contexts.forEach(c => groups.ctx.push(c));
        }
        return Object.entries(groups)
            .filter(([, docs]) => docs.length > 0)
            .map(([type, docs]) => this.createSectionNode(
                type.charAt(0).toUpperCase() + type.slice(1) + 's',
                docs.map(d => this.createDocumentNode(d, type))
            ));
    }

    private groupByStatus(weaves: Weave[]): TreeNode[] {
        const groups: Record<string, Document[]> = {};
        const allDocs: Document[] = [];
        for (const weave of weaves) {
            weave.ideas.forEach(i => allDocs.push(i));
            weave.designs.forEach(d => allDocs.push(d));
            weave.plans.forEach(p => allDocs.push(p));
            weave.contexts.forEach(c => allDocs.push(c));
        }
        for (const doc of allDocs) {
            if (!groups[doc.status]) groups[doc.status] = [];
            groups[doc.status].push(doc);
        }
        return Object.entries(groups).map(([status, docs]) =>
            this.createSectionNode(status, docs.map(d => this.createDocumentNode(d, d.type)))
        );
    }

    private groupByRelease(weaves: Weave[]): TreeNode[] {
        const groups: Record<string, Document[]> = {};
        for (const weave of weaves) {
            const primaryDesign = weave.designs[0];
            const release = (primaryDesign as any)?.target_release || 'unspecified';
            if (!groups[release]) groups[release] = [];
            if (primaryDesign) groups[release].push(primaryDesign);
            weave.plans.forEach(p => groups[release].push(p));
        }
        return Object.entries(groups).map(([release, docs]) =>
            this.createSectionNode(release === 'unspecified' ? 'No Release' : `v${release}`,
                docs.map(d => this.createDocumentNode(d, d.type)))
        );
    }

    private messageNode(text: string): TreeNode {
        const node = new vscode.TreeItem(text, vscode.TreeItemCollapsibleState.None);
        node.contextValue = 'message';
        return node;
    }

    private createWeaveNode(weave: Weave): TreeNode {
        const status = getWeaveStatus(weave);
        const node = new vscode.TreeItem(weave.id, vscode.TreeItemCollapsibleState.Collapsed);
        node.description = status;
        node.iconPath = getWeaveIcon(status);
        node.contextValue = 'weave';
        const primaryDesign = weave.designs[0];
        node.tooltip = primaryDesign ? `${primaryDesign.title} (v${primaryDesign.version})` : weave.id;

        return {
            ...node,
            weaveId: weave.id,
            children: this.getWeaveChildren(weave),
        };
    }

    private getWeaveChildren(weave: Weave): TreeNode[] {
        const children: TreeNode[] = [];

        if (weave.designs.length > 0) {
            const primaryDesign = weave.designs[0];
            children.push(this.createDocumentNode(primaryDesign, 'primary-design'));
            
            if (weave.designs.length > 1) {
                children.push(this.createSectionNode(
                    'Supporting Designs',
                    weave.designs.slice(1).map(d => this.createDocumentNode(d, 'design'))
                ));
            }
        }

        if (weave.plans.length > 0) {
            children.push(this.createSectionNode(
                'Plans',
                weave.plans.map(p => this.createPlanNode(p))
            ));
        }

        if (weave.ideas.length > 0) {
            children.push(this.createSectionNode(
                'Ideas',
                weave.ideas.map(i => this.createDocumentNode(i, 'idea'))
            ));
        }

        if (weave.contexts.length > 0) {
            children.push(this.createSectionNode(
                'Contexts',
                weave.contexts.map(c => this.createDocumentNode(c, 'ctx'))
            ));
        }

        return children;
    }

    private createSectionNode(label: string, children: TreeNode[]): TreeNode {
        const node = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
        node.contextValue = 'section';
        return { ...node, children };
    }

    private createDocumentNode(doc: Document, contextValue: string): TreeNode {
        const node = new vscode.TreeItem(doc.title || doc.id, vscode.TreeItemCollapsibleState.None);
        node.description = doc.status;
        node.iconPath = getDocumentIcon(doc.type);
        node.contextValue = contextValue;
        node.tooltip = `${doc.type} • ${doc.status}`;

        const filePath = (doc as any)._path;
        if (filePath) {
            node.command = {
                command: 'vscode.open',
                title: 'Open Document',
                arguments: [vscode.Uri.file(filePath)],
            };
        }

        return { ...node, doc, children: [] };
    }

    private createPlanNode(plan: PlanDoc): TreeNode {
        const node = new vscode.TreeItem(plan.title || plan.id, vscode.TreeItemCollapsibleState.None);
        const doneSteps = plan.steps?.filter(s => s.done).length ?? 0;
        const totalSteps = plan.steps?.length ?? 0;
        node.description = plan.staled ? `${plan.status} ⚠️ stale` : plan.status;
        node.tooltip = `${plan.status} • ${doneSteps}/${totalSteps} steps`;
        node.iconPath = getPlanIcon(plan.status);
        node.contextValue = 'plan';

        const filePath = (plan as any)._path;
        if (filePath) {
            node.command = {
                command: 'vscode.open',
                title: 'Open Plan',
                arguments: [vscode.Uri.file(filePath)],
            };
        }

        return { ...node, doc: plan, children: [] };
    }
}
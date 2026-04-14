---
type: plan
id: vscode-extension-plan-004
title: "VSIX MVP — VS Code Extension"
status: draft
created: 2026-04-11
updated: 2026-04-14
version: 2
design_version: 1
tags: [vscode, extension, ui, tree, viewmodel]
parent_id: vscode-extension-design
target_version: "0.4.0"
requires_load: [vscode-extension-design, vscode-extension-toolbar-design, vscode-extension-user-personalization-design]
---

# Plan — VSIX MVP (VS Code Extension)

| | |
|---|---|
| **Created** | 2026-04-11 |
| **Updated** | 2026-04-14 |
| **Status** | DRAFT |
| **Design** | `vscode-extension-design.md` |
| **Target version** | 0.4.0 |

---

# Goal

Build a minimal VS Code extension (VSIX) to visualize and interact with REslava Loom. This MVP focuses on:

- Thread tree view (like `loom status`)
- Basic commands (start plan, refine design)
- Reacting to file changes
- ViewModel layer for flexible grouping and filtering

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Setup VSIX project | `packages/vscode/` | — |
| 🔳 | 2 | Register extension activation | `packages/vscode/src/extension.ts` | Step 1 |
| 🔳 | 3 | Implement TreeProvider v2 + ViewModel (Grouping & Filtering) | `packages/vscode/src/tree/`, `packages/vscode/src/view/` | Step 2 |
| 🔳 | 4 | Register Tree View in package.json | `packages/vscode/package.json` | Step 3 |
| 🔳 | 5 | Integrate loadThread from filesystem layer | `packages/vscode/src/store.ts` | Step 3 |
| 🔳 | 6 | Implement commands (refine, start plan) | `packages/vscode/src/commands/` | Step 5 |
| 🔳 | 7 | Add file watcher (VS Code API) | `packages/vscode/src/watcher.ts` | Step 5 |
| 🔳 | 8 | Test in VS Code Extension Host | — | All |

---

## Step 1 — Setup VSIX Project

Initialize extension using `yo code` or manually. Create TypeScript project structure:

```
packages/vscode/
├── src/
│   ├── extension.ts
│   ├── tree/
│   ├── view/
│   ├── commands/
│   └── watcher/
├── package.json
└── tsconfig.json
```

---

## Step 2 — Register Extension Activation

In `extension.ts`:

- Activate on workspace open (when `.loom/` is present).
- Register tree provider, commands, and watchers.
- Initialize ViewState manager.

---

## Step 3 — Implement TreeProvider v2 + ViewModel (Grouping & Filtering)

Introduce a ViewModel layer to support flexible grouping and filtering. This decouples UI rendering from data logic and enables multiple projections (by type, thread, status, release).

### 3.1 Define ViewState

**File:** `packages/vscode/src/view/viewState.ts`

```typescript
export type GroupingMode = 'type' | 'thread' | 'status' | 'release';

export interface ViewState {
  grouping: GroupingMode;
  textFilter?: string;
  statusFilter: string[];
  showArchived: boolean;
  focusedThreadId?: string;
}

export const defaultViewState: ViewState = {
  grouping: 'thread',
  textFilter: '',
  statusFilter: ['active', 'implementing', 'draft'],
  showArchived: false,
};
```

### 3.2 ViewModel Core

**File:** `packages/vscode/src/view/viewModel.ts`

```typescript
import { Document } from '../../../core/src/types';
import { Thread } from '../../../core/src/types';
import { ViewState } from './viewState';
import * as vscode from 'vscode';

export interface TreeNode {
  type: 'group' | 'document';
  label: string;
  collapsibleState: vscode.TreeItemCollapsibleState;
  children?: TreeNode[];
  doc?: Document;
  threadId?: string;
}

export class LoomViewModel {
  constructor(private threads: Thread[], private orphanDocs: Document[]) {}

  buildTree(state: ViewState): TreeNode[] {
    let allDocs = this.threads.flatMap(t => t.allDocs).concat(this.orphanDocs);
    allDocs = this.applyFilters(allDocs, state);

    switch (state.grouping) {
      case 'thread':
        return this.groupByThread(allDocs, state);
      case 'status':
        return this.groupByStatus(allDocs);
      case 'release':
        return this.groupByRelease(allDocs);
      default:
        return this.groupByType(allDocs);
    }
  }

  private applyFilters(docs: Document[], state: ViewState): Document[] {
    return docs.filter(doc => {
      // Status filter
      if (!state.statusFilter.includes(doc.status)) {
        if (doc.status === 'done' && state.showArchived) return true;
        if (doc.status === 'cancelled' && state.showArchived) return true;
        return false;
      }
      // Text filter
      if (state.textFilter) {
        const text = state.textFilter.toLowerCase();
        const matches = doc.title?.toLowerCase().includes(text) || doc.id.toLowerCase().includes(text);
        if (!matches) return false;
      }
      return true;
    });
  }

  private groupByThread(docs: Document[], state: ViewState): TreeNode[] {
    const threadMap = new Map<string, Document[]>();
    for (const doc of docs) {
      const thread = this.threads.find(t => t.allDocs.includes(doc));
      const threadId = thread?.id || 'unassigned';
      if (!threadMap.has(threadId)) threadMap.set(threadId, []);
      threadMap.get(threadId)!.push(doc);
    }

    const nodes: TreeNode[] = [];
    for (const [threadId, threadDocs] of threadMap) {
      if (threadId === 'unassigned') {
        nodes.push({
          type: 'group',
          label: 'Unassigned',
          collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
          children: threadDocs.map(d => this.createDocNode(d)),
        });
      } else {
        const thread = this.threads.find(t => t.id === threadId)!;
        nodes.push(this.createThreadNode(thread, threadDocs));
      }
    }
    return nodes;
  }

  private createThreadNode(thread: Thread, docs: Document[]): TreeNode {
    return {
      type: 'group',
      label: `🧵 ${thread.id}`,
      collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      threadId: thread.id,
      children: [
        this.createSection('Design', docs.filter(d => d.type === 'design')),
        this.createSection('Plans', docs.filter(d => d.type === 'plan')),
        this.createSection('Ideas', docs.filter(d => d.type === 'idea')),
        this.createSection('Contexts', docs.filter(d => d.type === 'ctx')),
      ].filter(Boolean) as TreeNode[],
    };
  }

  private createSection(label: string, docs: Document[]): TreeNode | undefined {
    if (!docs.length) return undefined;
    return {
      type: 'group',
      label,
      collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
      children: docs.map(d => this.createDocNode(d)),
    };
  }

  private groupByType(docs: Document[]): TreeNode[] {
    const groups: Record<string, Document[]> = { idea: [], design: [], plan: [], ctx: [] };
    docs.forEach(d => groups[d.type]?.push(d));
    return Object.entries(groups)
      .filter(([, d]) => d.length)
      .map(([type, d]) => ({
        type: 'group',
        label: type.charAt(0).toUpperCase() + type.slice(1) + 's',
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        children: d.map(doc => this.createDocNode(doc)),
      }));
  }

  private groupByStatus(docs: Document[]): TreeNode[] {
    const groups: Record<string, Document[]> = {};
    docs.forEach(doc => {
      if (!groups[doc.status]) groups[doc.status] = [];
      groups[doc.status].push(doc);
    });
    return Object.entries(groups).map(([status, d]) => ({
      type: 'group',
      label: status,
      collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
      children: d.map(doc => this.createDocNode(doc)),
    }));
  }

  private groupByRelease(docs: Document[]): TreeNode[] {
    const groups: Record<string, Document[]> = {};
    docs.forEach(doc => {
      const release = (doc as any).target_release || 'unspecified';
      if (!groups[release]) groups[release] = [];
      groups[release].push(doc);
    });
    return Object.entries(groups).map(([release, d]) => ({
      type: 'group',
      label: release === 'unspecified' ? 'No Release' : `v${release}`,
      collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
      children: d.map(doc => this.createDocNode(doc)),
    }));
  }

  private createDocNode(doc: Document): TreeNode {
    const statusIcon = doc.status === 'done' ? '✅' : doc.status === 'implementing' ? '🔄' : '📄';
    return {
      type: 'document',
      label: `${statusIcon} ${doc.title || doc.id}`,
      collapsibleState: vscode.TreeItemCollapsibleState.None,
      doc,
    };
  }
}
```

### 3.3 TreeProvider Refactor

**File:** `packages/vscode/src/tree/treeProvider.ts`

```typescript
import * as vscode from 'vscode';
import { LoomViewModel, TreeNode } from '../view/viewModel';
import { ViewState } from '../view/viewState';

export class LoomTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private viewModel: LoomViewModel,
    private viewState: ViewState
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(node: TreeNode): vscode.TreeItem {
    const item = new vscode.TreeItem(node.label, node.collapsibleState);
    if (node.doc) {
      item.command = {
        command: 'vscode.open',
        title: 'Open Document',
        arguments: [vscode.Uri.file((node.doc as any)._path)],
      };
      item.contextValue = node.doc.type;
      if (node.doc.type === 'plan' && (node.doc as any).staled) {
        item.description = '⚠️ stale';
      }
    }
    item.contextValue = node.type;
    return item;
  }

  getChildren(node?: TreeNode): Thenable<TreeNode[]> {
    if (!node) {
      return Promise.resolve(this.viewModel.buildTree(this.viewState));
    }
    return Promise.resolve(node.children || []);
  }
}
```

---

## Step 4 — Register Tree View in package.json

```json
{
  "contributes": {
    "views": {
      "explorer": [
        {
          "id": "loom.threads",
          "name": "Loom",
          "icon": "resources/loom.svg"
        }
      ]
    }
  }
}
```

---

## Step 5 — Integrate loadThread from Filesystem Layer

Create a `LoomStore` that loads all threads from the active loom root.

**File:** `packages/vscode/src/store.ts`

```typescript
import { getActiveLoomRoot, loadThread } from '../../fs/src';
import * as path from 'path';
import * as fs from 'fs-extra';

export class LoomStore {
  private threads: Thread[] = [];
  private orphanDocs: Document[] = [];

  async loadAll(): Promise<void> {
    const loomRoot = getActiveLoomRoot();
    const threadsDir = path.join(loomRoot, 'threads');
    const entries = await fs.readdir(threadsDir);
    
    this.threads = [];
    for (const entry of entries) {
      const threadPath = path.join(threadsDir, entry);
      const stat = await fs.stat(threadPath);
      if (stat.isDirectory() && entry !== '_archive') {
        try {
          const thread = await loadThread(entry);
          this.threads.push(thread);
        } catch (e) {
          console.error(`Failed to load thread ${entry}:`, e);
        }
      }
    }
  }

  getAllThreads(): Thread[] { return this.threads; }
  getOrphanDocs(): Document[] { return this.orphanDocs; }
}
```

---

## Step 6 — Implement Commands

**File:** `packages/vscode/src/commands/refine.ts`

```typescript
import { runEvent } from '../../../fs/src/runEvent';

export async function refineDesignCommand(threadId: string): Promise<void> {
  await runEvent(threadId, { type: 'REFINE_DESIGN' });
  vscode.window.showInformationMessage(`Design refined for ${threadId}`);
}
```

Similar for `startPlan`, `completeStep`.

---

## Step 7 — Add File Watcher

**File:** `packages/vscode/src/watcher.ts`

```typescript
import * as vscode from 'vscode';

export function setupFileWatcher(
  store: LoomStore,
  treeProvider: LoomTreeProvider
): vscode.Disposable {
  const watcher = vscode.workspace.createFileSystemWatcher('**/threads/**/*.md');
  
  const onChange = async () => {
    await store.loadAll();
    treeProvider.refresh();
  };
  
  watcher.onDidChange(onChange);
  watcher.onDidCreate(onChange);
  watcher.onDidDelete(onChange);
  
  return watcher;
}
```

---

## Step 8 — Test in VS Code Extension Host

Run extension, open a test loom, and verify:
- Tree view renders threads and documents.
- Commands trigger events and update files.
- File watcher refreshes UI automatically.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
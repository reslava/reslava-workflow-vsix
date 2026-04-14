---
type: plan
id: vscode-extension-plan-006
title: "Implement VSCode Toolbar (View Controls & Actions)"
status: draft
created: 2026-04-11
updated: 2026-04-14
version: 2
design_version: 1
tags: [vscode, toolbar, ui, viewstate, loom]
parent_id: vscode-extension-design
target_version: "0.6.0"
requires_load: [vscode-extension-toolbar-design, vscode-extension-plan-004, vscode-extension-plan-005]
---

# Plan — Implement VSCode Toolbar (View Controls & Actions)

| | |
|---|---|
| **Created** | 2026-04-11 |
| **Updated** | 2026-04-14 |
| **Status** | DRAFT |
| **Design** | `vscode-extension-toolbar-design.md` |
| **Target version** | 0.6.0 |

---

# Goal

Implement a fully functional VSCode toolbar system for the Loom view, including:

- View controls (grouping, filters)
- Context‑aware action buttons
- Command registration
- Binding toolbar actions to ViewState
- Triggering tree refresh

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Define commands in package.json | `packages/vscode/package.json` | — |
| 🔳 | 2 | Contribute view toolbar UI | `packages/vscode/package.json` | Step 1 |
| 🔳 | 3 | Implement ViewState manager | `packages/vscode/src/view/viewStateManager.ts` | — |
| 🔳 | 4 | Register commands in extension.ts | `packages/vscode/src/extension.ts` | Steps 1, 3 |
| 🔳 | 5 | Bind commands to ViewState updates | `packages/vscode/src/commands/view.ts` | Step 4 |
| 🔳 | 6 | Implement grouping selector (QuickPick) | `packages/vscode/src/commands/grouping.ts` | Step 5 |
| 🔳 | 7 | Implement filter controls (text, status) | `packages/vscode/src/commands/filter.ts` | Step 5 |
| 🔳 | 8 | Implement action commands (weave, refine) | `packages/vscode/src/commands/actions.ts` | Step 5 |
| 🔳 | 9 | Add context‑based enable/disable | `packages/vscode/package.json` | Step 2 |
| 🔳 | 10 | Connect refresh cycle | `packages/vscode/src/extension.ts` | All |

---

## Step 1 — Define Commands in package.json

Add all toolbar‑related commands to the `contributes.commands` section.

```json
{
  "contributes": {
    "commands": [
      { "command": "loom.setGroupingType", "title": "Group by Type" },
      { "command": "loom.setGroupingThread", "title": "Group by Thread" },
      { "command": "loom.setGroupingStatus", "title": "Group by Status" },
      { "command": "loom.setGroupingRelease", "title": "Group by Release" },
      { "command": "loom.setTextFilter", "title": "Filter by Text" },
      { "command": "loom.toggleArchived", "title": "Toggle Archived" },
      { "command": "loom.focusThread", "title": "Focus Thread" },
      { "command": "loom.weaveIdea", "title": "Weave Idea" },
      { "command": "loom.weaveDesign", "title": "Weave Design" },
      { "command": "loom.weavePlan", "title": "Weave Plan" },
      { "command": "loom.newChat", "title": "New Chat" }
    ]
  }
}
```

---

## Step 2 — Contribute View Toolbar UI

Attach commands to the view toolbar using `menus.view/title`.

```json
{
  "contributes": {
    "menus": {
      "view/title": [
        { "command": "loom.setGroupingThread", "when": "view == loom.threads", "group": "navigation@1" },
        { "command": "loom.setTextFilter", "when": "view == loom.threads", "group": "navigation@2" },
        { "command": "loom.toggleArchived", "when": "view == loom.threads", "group": "navigation@3" },
        { "command": "loom.focusThread", "when": "view == loom.threads", "group": "navigation@4" },
        { "command": "loom.weaveIdea", "when": "view == loom.threads", "group": "actions@1" },
        { "command": "loom.weaveDesign", "when": "view == loom.threads && viewItem == thread", "group": "actions@2" },
        { "command": "loom.weavePlan", "when": "view == loom.threads && viewItem == design", "group": "actions@3" },
        { "command": "loom.newChat", "when": "view == loom.threads", "group": "actions@4" }
      ]
    }
  }
}
```

---

## Step 3 — Implement ViewState Manager

**File:** `packages/vscode/src/view/viewStateManager.ts`

Centralized state mutation with persistence in `workspaceState`.

```typescript
import * as vscode from 'vscode';
import { ViewState, defaultViewState } from './viewState';

export class ViewStateManager {
  private state: ViewState;

  constructor(private workspaceState: vscode.Memento) {
    this.state = { ...defaultViewState, ...workspaceState.get<ViewState>('loom.viewState') };
  }

  getState(): ViewState {
    return this.state;
  }

  update(partial: Partial<ViewState>): ViewState {
    this.state = { ...this.state, ...partial };
    this.workspaceState.update('loom.viewState', this.state);
    return this.state;
  }

  reset(): ViewState {
    this.state = { ...defaultViewState };
    this.workspaceState.update('loom.viewState', this.state);
    return this.state;
  }
}
```

---

## Step 4 — Register Commands in extension.ts

**File:** `packages/vscode/src/extension.ts`

```typescript
import { ViewStateManager } from './view/viewStateManager';
import { LoomTreeProvider } from './tree/treeProvider';

export function activate(context: vscode.ExtensionContext) {
  const viewStateManager = new ViewStateManager(context.workspaceState);
  const treeProvider = new LoomTreeProvider(/* ... */);

  const refresh = () => treeProvider.refresh();

  context.subscriptions.push(
    vscode.commands.registerCommand('loom.setGroupingType', () => {
      viewStateManager.update({ grouping: 'type' });
      refresh();
    }),
    vscode.commands.registerCommand('loom.setGroupingThread', () => {
      viewStateManager.update({ grouping: 'thread' });
      refresh();
    }),
    // ... register all other commands
  );
}
```

---

## Step 5 — Bind Commands to ViewState Updates

**File:** `packages/vscode/src/commands/view.ts`

Create helper functions for common ViewState mutations.

```typescript
import { ViewStateManager } from '../view/viewStateManager';
import { LoomTreeProvider } from '../tree/treeProvider';

export function updateViewStateAndRefresh(
  manager: ViewStateManager,
  treeProvider: LoomTreeProvider,
  update: Partial<ViewState>
): void {
  manager.update(update);
  treeProvider.refresh();
}
```

---

## Step 6 — Implement Grouping Selector (QuickPick)

**File:** `packages/vscode/src/commands/grouping.ts`

```typescript
import * as vscode from 'vscode';
import { ViewStateManager } from '../view/viewStateManager';
import { LoomTreeProvider } from '../tree/treeProvider';
import { updateViewStateAndRefresh } from './view';

export async function showGroupingSelector(
  manager: ViewStateManager,
  treeProvider: LoomTreeProvider
): Promise<void> {
  const options: vscode.QuickPickItem[] = [
    { label: '$(symbol-class) Type', description: 'Group by document type' },
    { label: '$(project) Thread', description: 'Group by feature thread' },
    { label: '$(git-commit) Status', description: 'Group by workflow status' },
    { label: '$(tag) Release', description: 'Group by target release' },
  ];

  const selected = await vscode.window.showQuickPick(options, {
    placeHolder: 'Select grouping mode',
  });

  if (selected) {
    const mode = selected.label.includes('Type') ? 'type' :
                 selected.label.includes('Thread') ? 'thread' :
                 selected.label.includes('Status') ? 'status' : 'release';
    updateViewStateAndRefresh(manager, treeProvider, { grouping: mode as any });
  }
}
```

---

## Step 7 — Implement Filter Controls

**File:** `packages/vscode/src/commands/filter.ts`

```typescript
import * as vscode from 'vscode';
import { ViewStateManager } from '../view/viewStateManager';
import { LoomTreeProvider } from '../tree/treeProvider';
import { updateViewStateAndRefresh } from './view';

export async function setTextFilter(
  manager: ViewStateManager,
  treeProvider: LoomTreeProvider
): Promise<void> {
  const current = manager.getState().textFilter;
  const input = await vscode.window.showInputBox({
    prompt: 'Filter documents by text',
    value: current,
    placeHolder: 'Enter search term...',
  });

  if (input !== undefined) {
    updateViewStateAndRefresh(manager, treeProvider, { textFilter: input || undefined });
  }
}

export function toggleArchived(
  manager: ViewStateManager,
  treeProvider: LoomTreeProvider
): void {
  const current = manager.getState().showArchived;
  updateViewStateAndRefresh(manager, treeProvider, { showArchived: !current });
}
```

---

## Step 8 — Implement Action Commands

**File:** `packages/vscode/src/commands/actions.ts`

```typescript
import * as vscode from 'vscode';
import { TreeNode } from '../view/viewModel';

export async function weaveIdea(node?: TreeNode): Promise<void> {
  const threadId = node?.threadId || '';
  const title = await vscode.window.showInputBox({ prompt: 'Idea title' });
  if (title) {
    // Call CLI or core engine to create idea
    vscode.window.showInformationMessage(`Idea "${title}" created in ${threadId || 'new thread'}`);
  }
}

export async function weaveDesign(node?: TreeNode): Promise<void> {
  if (!node?.threadId) {
    vscode.window.showWarningMessage('Select a thread to weave a design');
    return;
  }
  // Call CLI or core engine
}

export async function weavePlan(node?: TreeNode): Promise<void> {
  if (!node?.doc || node.doc.type !== 'design') {
    vscode.window.showWarningMessage('Select a design to weave a plan');
    return;
  }
  // Call CLI or core engine
}
```

---

## Step 9 — Add Context‑Based Enable/Disable

In `treeProvider.ts`, set `contextValue` on each `TreeItem`:

```typescript
getTreeItem(node: TreeNode): vscode.TreeItem {
  const item = new vscode.TreeItem(node.label, node.collapsibleState);
  if (node.type === 'group' && node.threadId) {
    item.contextValue = 'thread';
  } else if (node.doc) {
    item.contextValue = node.doc.type;
  }
  return item;
}
```

The `when` clauses in `package.json` (Step 2) will use these values to show/hide commands.

---

## Step 10 — Connect Refresh Cycle

Ensure all commands that modify state end with `treeProvider.refresh()`. This is already handled by `updateViewStateAndRefresh`.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
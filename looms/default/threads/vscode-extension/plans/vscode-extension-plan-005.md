---
type: plan
id: vscode-extension-plan-005
title: "Implement groupByThread — Thread‑Based Tree View"
status: draft
created: 2026-04-11
updated: 2026-04-14
version: 2
design_version: 1
tags: [vscode, tree, viewmodel, grouping, thread]
parent_id: vscode-extension-design
target_version: "0.5.0"
requires_load: [vscode-extension-design]
---

# Plan — Implement groupByThread (Thread‑Based Tree View)

| | |
|---|---|
| **Created** | 2026-04-11 |
| **Updated** | 2026-04-14 |
| **Status** | DRAFT |
| **Design** | `vscode-extension-design.md` |
| **Target version** | 0.5.0 |

---

# Goal

Implement `groupByThread` in the ViewModel to enable grouping documents by Thread. This transforms the tree from a flat/type‑based structure into a hierarchical, work‑centric view organized around primary designs and their related documents.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Create Thread builder utility | `packages/vscode/src/domain/threadBuilder.ts` | — |
| 🔳 | 2 | Implement relationship resolution | `packages/vscode/src/domain/threadBuilder.ts` | Step 1 |
| 🔳 | 3 | Build Thread collection from docs | `packages/vscode/src/domain/threadBuilder.ts` | Step 2 |
| 🔳 | 4 | Integrate Thread builder into ViewModel | `packages/vscode/src/view/viewModel.ts` | Step 3 |
| 🔳 | 5 | Implement groupByThread tree projection | `packages/vscode/src/view/viewModel.ts` | Step 4 |
| 🔳 | 6 | Handle orphan documents | `packages/vscode/src/view/viewModel.ts` | Step 5 |
| 🔳 | 7 | Add basic sorting | `packages/vscode/src/view/viewModel.ts` | Step 5 |

---

## Step 1 — Create Thread Builder Utility

**File:** `packages/vscode/src/domain/threadBuilder.ts`

Define the `Thread` interface and builder function.

```typescript
import { Document, DesignDoc } from '../../../core/src/types';

export interface Thread {
  id: string;
  design: DesignDoc;
  plans: Document[];
  ideas: Document[];
  contexts: Document[];
  supportingDesigns: Document[];
  allDocs: Document[];
}

export function buildThreads(docs: Document[]): Thread[] {
  // Implementation in Step 3
}
```

---

## Step 2 — Implement Relationship Resolution

**File:** `packages/vscode/src/domain/threadBuilder.ts`

Implement ancestry resolution to find the primary design root.

```typescript
function resolvePrimaryDesign(
  doc: Document,
  docsById: Map<string, Document>
): DesignDoc | undefined {
  const visited = new Set<string>();
  let current: Document | undefined = doc;

  while (current?.parent_id) {
    if (visited.has(current.id)) return undefined; // cycle guard
    visited.add(current.id);

    const parent = docsById.get(current.parent_id);
    if (!parent) return undefined;

    if (parent.type === 'design' && (parent as DesignDoc).role === 'primary') {
      return parent as DesignDoc;
    }

    current = parent;
  }

  return undefined;
}
```

---

## Step 3 — Build Thread Collection from Docs

**File:** `packages/vscode/src/domain/threadBuilder.ts`

```typescript
export function buildThreads(docs: Document[]): Thread[] {
  const docsById = new Map(docs.map(d => [d.id, d]));
  const threads: Record<string, Thread> = {};

  // Initialize from primary designs
  docs.forEach(doc => {
    if (doc.type === 'design' && (doc as DesignDoc).role === 'primary') {
      threads[doc.id] = {
        id: doc.id,
        design: doc as DesignDoc,
        plans: [],
        ideas: [],
        contexts: [],
        supportingDesigns: [],
        allDocs: [doc],
      };
    }
  });

  // Assign other docs
  docs.forEach(doc => {
    if (doc.type === 'design' && (doc as DesignDoc).role === 'primary') return;

    const primaryDesign = resolvePrimaryDesign(doc, docsById);
    if (!primaryDesign) return;

    const thread = threads[primaryDesign.id];
    if (!thread) return;

    thread.allDocs.push(doc);

    switch (doc.type) {
      case 'plan':
        thread.plans.push(doc);
        break;
      case 'idea':
        thread.ideas.push(doc);
        break;
      case 'ctx':
        thread.contexts.push(doc);
        break;
      case 'design':
        thread.supportingDesigns.push(doc);
        break;
    }
  });

  return Object.values(threads);
}
```

---

## Step 4 — Integrate Thread Builder into ViewModel

**File:** `packages/vscode/src/view/viewModel.ts`

Modify the constructor to accept documents and build threads internally.

```typescript
import { buildThreads } from '../domain/threadBuilder';

export class LoomViewModel {
  private threads: Thread[];
  private orphanDocs: Document[];

  constructor(docs: Document[]) {
    const allThreads = buildThreads(docs);
    const assignedIds = new Set(allThreads.flatMap(t => t.allDocs.map(d => d.id)));
    this.orphanDocs = docs.filter(d => !assignedIds.has(d.id));
    this.threads = allThreads;
  }

  // ... rest of class
}
```

---

## Step 5 — Implement groupByThread Tree Projection

**File:** `packages/vscode/src/view/viewModel.ts`

```typescript
private groupByThread(docs: Document[], state: ViewState): TreeNode[] {
  const nodes: TreeNode[] = [];

  for (const thread of this.threads) {
    const threadDocs = docs.filter(d => thread.allDocs.includes(d));
    if (threadDocs.length === 0) continue;

    nodes.push({
      type: 'group',
      label: `🧵 ${thread.id}`,
      collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      threadId: thread.id,
      children: [
        this.createSection('Primary Design', [thread.design]),
        this.createSection('Supporting Designs', thread.supportingDesigns.filter(d => threadDocs.includes(d))),
        this.createSection('Plans', thread.plans.filter(p => threadDocs.includes(p))),
        this.createSection('Ideas', thread.ideas.filter(i => threadDocs.includes(i))),
        this.createSection('Contexts', thread.contexts.filter(c => threadDocs.includes(c))),
      ].filter(Boolean) as TreeNode[],
    });
  }

  return nodes;
}
```

---

## Step 6 — Handle Orphan Documents

**File:** `packages/vscode/src/view/viewModel.ts`

Add orphan docs as an "Unassigned" group.

```typescript
private groupByThread(docs: Document[], state: ViewState): TreeNode[] {
  const nodes: TreeNode[] = [];
  // ... thread nodes ...

  const orphanDocsInView = docs.filter(d => this.orphanDocs.includes(d));
  if (orphanDocsInView.length > 0) {
    nodes.push({
      type: 'group',
      label: 'Unassigned',
      collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
      children: orphanDocsInView.map(d => this.createDocNode(d)),
    });
  }

  return nodes;
}
```

---

## Step 7 — Add Basic Sorting

**File:** `packages/vscode/src/view/viewModel.ts`

Sort threads alphabetically and documents within sections.

```typescript
private sortThreads(threads: Thread[]): Thread[] {
  return threads.sort((a, b) => a.id.localeCompare(b.id));
}

private sortDocs(docs: Document[]): Document[] {
  return docs.sort((a, b) => (a.title || a.id).localeCompare(b.title || b.id));
}
```

Apply sorting when building the tree.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
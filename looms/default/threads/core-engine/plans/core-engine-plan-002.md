---
type: plan
id: core-engine-plan-002
title: "Filesystem Integration — Markdown Load and Save"
status: draft
created: 2026-04-10
updated: 2026-04-14
version: 2
design_version: 3
tags: [loom, core, filesystem, markdown, io]
parent_id: core-engine-design
target_version: "0.2.0"
requires_load: [core-engine-design]
---

# Plan — Filesystem Integration (Markdown Load/Save)

| | |
|---|---|
| **Created** | 2026-04-10 |
| **Updated** | 2026-04-14 |
| **Status** | DRAFT |
| **Design** | `core-engine-design.md` (v3) |
| **Target version** | 0.2.0 |

---

# Goal

Connect the core Loom engine to the filesystem using Markdown files as the database.

This includes:
- loading documents from disk
- parsing frontmatter
- saving updated documents
- mapping folder structure to the Thread model

This step transforms the system from in‑memory logic into a persistent, real‑world workflow engine.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Setup filesystem utilities | `packages/fs/src/utils.ts` | `core-engine-plan-001` |
| 🔳 | 2 | Implement `loadDoc` (Markdown + frontmatter) | `packages/fs/src/load.ts` |
| 🔳 | 3 | Implement `saveDoc` (Markdown writer) | `packages/fs/src/save.ts` |
| 🔳 | 4 | Implement `loadThread` | `packages/fs/src/loadThread.ts` |
| 🔳 | 5 | Implement `saveThread` | `packages/fs/src/saveThread.ts` |
| 🔳 | 6 | Integrate with core engine | `packages/fs/src/runEvent.ts` |
| 🔳 | 7 | Test with real thread folder | `looms/test/threads/example/` |

---

## Step 1 — Setup Filesystem Utilities

**File:** `packages/fs/src/utils.ts`

Define helpers for path resolution and directory operations.

```typescript
import * as path from 'path';
import * as fs from 'fs-extra';

export function getActiveLoomRoot(): string {
  // First check for global registry (~/.loom/config.yaml)
  // If not found, look for .loom/ in current directory or ancestors
  // Fallback to process.cwd()
  // (Implementation details to be filled)
  return process.cwd();
}

export function resolveThreadPath(threadId: string): string {
  const loomRoot = getActiveLoomRoot();
  return path.join(loomRoot, 'threads', threadId);
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath);
}

export function generatePlanId(threadId: string, existingPlans: string[]): string {
  const prefix = `${threadId}-plan-`;
  const numbers = existingPlans
    .map(p => p.match(/-plan-(\d+)\.md$/)?.[1])
    .filter(Boolean)
    .map(Number);
  const next = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}
```

---

## Step 2 — Implement `loadDoc` (Markdown + frontmatter)

**File:** `packages/fs/src/load.ts`

Use `gray-matter` to parse frontmatter and content.

```typescript
import matter from 'gray-matter';
import * as fs from 'fs-extra';
import { Document } from '../../core/src/types';

export async function loadDoc(filePath: string): Promise<Document> {
  const content = await fs.readFile(filePath, 'utf8');
  const parsed = matter(content);
  
  const doc = {
    ...parsed.data,
    content: parsed.content,
    _path: filePath,
  } as Document;

  // Parse steps for plan documents
  if (doc.type === 'plan' && parsed.content) {
    doc.steps = parseStepsTable(parsed.content);
  }

  return doc;
}

function parseStepsTable(content: string): any[] {
  // Parse the markdown table in the Steps section
  // Return array of { order, description, done, files_touched }
  // (Implementation to be filled)
  return [];
}
```

---

## Step 3 — Implement `saveDoc` (Markdown writer)

**File:** `packages/fs/src/save.ts`

Serialize document back to Markdown, preserving readability.

```typescript
import matter from 'gray-matter';
import * as fs from 'fs-extra';
import { Document } from '../../core/src/types';

export async function saveDoc(doc: Document, filePath: string): Promise<void> {
  const { content, _path, ...frontmatter } = doc as any;
  
  // For plan documents, regenerate steps table
  let bodyContent = content;
  if (doc.type === 'plan' && doc.steps) {
    bodyContent = generateStepsTable(doc.steps, content);
  }

  const output = matter.stringify(bodyContent, frontmatter);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, output);
}

function generateStepsTable(steps: any[], originalContent: string): string {
  // Replace or append steps table in content
  // (Implementation to be filled)
  return originalContent;
}
```

---

## Step 4 — Implement `loadThread`

**File:** `packages/fs/src/loadThread.ts`

Load all documents for a given thread ID.

```typescript
import * as path from 'path';
import * as fs from 'fs-extra';
import { Thread, Document } from '../../core/src/types';
import { loadDoc } from './load';
import { resolveThreadPath } from './utils';

export async function loadThread(threadId: string): Promise<Thread> {
  const threadPath = resolveThreadPath(threadId);
  
  const docs: Document[] = [];
  
  // Recursively find all .md files
  const files = await findMarkdownFiles(threadPath);
  
  for (const file of files) {
    const doc = await loadDoc(file);
    docs.push(doc);
  }

  const design = docs.find(d => d.type === 'design' && d.role === 'primary') as any;
  if (!design) {
    throw new Error(`No primary design found for thread '${threadId}'`);
  }

  const idea = docs.find(d => d.type === 'idea') as any;
  const plans = docs.filter(d => d.type === 'plan') as any[];
  const contexts = docs.filter(d => d.type === 'ctx') as any[];

  return {
    id: threadId,
    idea,
    design,
    plans,
    contexts,
    allDocs: docs,
  };
}

async function findMarkdownFiles(dir: string): Promise<string[]> {
  const result: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '_archive') {
      result.push(...await findMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      result.push(fullPath);
    }
  }
  
  return result;
}
```

---

## Step 5 — Implement `saveThread`

**File:** `packages/fs/src/saveThread.ts`

Persist all documents in a thread.

```typescript
import { Thread } from '../../core/src/types';
import { saveDoc } from './save';
import { resolveThreadPath } from './utils';
import * as path from 'path';

export async function saveThread(thread: Thread): Promise<void> {
  for (const doc of thread.allDocs) {
    const filePath = (doc as any)._path;
    if (!filePath) {
      // New document — determine correct path
      const newPath = determinePathForDoc(doc, thread.id);
      await saveDoc(doc, newPath);
    } else {
      await saveDoc(doc, filePath);
    }
  }
}

function determinePathForDoc(doc: any, threadId: string): string {
  const threadPath = resolveThreadPath(threadId);
  
  switch (doc.type) {
    case 'idea':
      return path.join(threadPath, `${threadId}-idea.md`);
    case 'design':
      return path.join(threadPath, `${threadId}-design.md`);
    case 'plan':
      return path.join(threadPath, 'plans', `${doc.id}.md`);
    case 'ctx':
      return path.join(threadPath, `${threadId}-ctx.md`);
    default:
      throw new Error(`Unknown document type: ${doc.type}`);
  }
}
```

---

## Step 6 — Integrate with Core Engine

**File:** `packages/fs/src/runEvent.ts`

Create a high‑level function that loads a thread, applies an event, and saves it back to disk.

```typescript
import { WorkflowEvent, applyEvent } from '../../core/src/applyEvent';
import { loadThread } from './loadThread';
import { saveThread } from './saveThread';

export async function runEvent(threadId: string, event: WorkflowEvent): Promise<void> {
  const thread = await loadThread(threadId);
  const updatedThread = applyEvent(thread, event);
  await saveThread(updatedThread);
}
```

---

## Step 7 — Test with Real Thread Folder

Create a sample thread in the test loom:

```bash
mkdir -p ~/looms/test/threads/example/plans
cp .loom/templates/design-template.md ~/looms/test/threads/example/example-design.md
# Manually edit frontmatter to set proper id, status, etc.
```

Write a test script that:
- Loads the example thread
- Applies an event (e.g., `ACTIVATE_DESIGN`)
- Verifies the file was updated correctly

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
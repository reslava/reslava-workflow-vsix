# Architecture Overview — REslava Loom

This document provides a high‑level technical overview of the REslava Loom workflow system. It is intended for contributors and users who want to understand how the system derives state, handles events, and maintains integrity without a central database.

## 1. Core Philosophy: Filesystem as Database

The system is built on a single, uncompromising principle:

> **Markdown files are the single source of truth. There is no central state machine.**

We do not store workflow status in a hidden `.json` cache, SQLite database, or in‑memory global variable. Instead, the status of a thread is **derived** by reading the frontmatter of the Markdown files on disk.

**Consequences of this choice:**
- **Git‑Native:** Every state change is a version‑controlled file diff.
- **Human‑Readable:** Users can view and edit status directly in the editor without opening a special UI.
- **Resilience:** If the extension crashes, the state is intact. If the CLI stops working, the files are still valid.

---

## 2. System Components

The system is composed of five distinct layers, each with a single responsibility.

```text
┌─────────────────────────────────────────────────────────────┐
│                      VS Code Extension                       │
│  (Tree View, Commands, Decorations, AI Prompt Injection)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Triggers Events / Reads State)
┌──────────────────────────────▼──────────────────────────────┐
│                         Orchestrator                         │
│  (Validates Events, Routes to Reducers, Manages Effects)    │
└───────────────┬───────────────────────────────┬─────────────┘
                │                               │
┌───────────────▼───────────────┐ ┌─────────────▼─────────────┐
│     Core Engine (Reducers)     │ │      Effects Layer        │
│  (Pure functions that update   │ │ (Side effects: File I/O,  │
│   frontmatter state objects)   │ │  Run Command, Context Gen)│
└───────────────┬───────────────┘ └─────────────┬─────────────┘
                │                               │
┌───────────────▼───────────────────────────────▼─────────────┐
│                   Filesystem Integration                     │
│  (Markdown Parser, Frontmatter Read/Write, Watchers)        │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 The Document Model (`BaseDoc`)
All documents (`idea`, `design`, `plan`, `ctx`) share a common frontmatter structure:
- `id`: Unique identifier (kebab‑case, e.g., `payment-system-design`).
- `type`: `idea`, `design`, `plan`, or `ctx`.
- `status`: The state machine status (e.g., `draft`, `active`, `implementing`).
- `parent_id` / `child_ids`: The relational links that define the **Thread**.

### 2.1.1 Document Status Reference

Each document type has a specific set of allowed status values, defining its lifecycle state machine.

| Document Type | Allowed Statuses | Description |
|---------------|------------------|-------------|
| `idea` | `draft`, `active`, `done`, `cancelled` | Early exploration; lightweight. |
| `design` | `draft`, `active`, `closed`, `done`, `cancelled` | Core specification and conversation log. `closed` allows pausing without completion. |
| `plan` | `draft`, `active`, `implementing`, `done`, `blocked`, `cancelled` | Executable steps with execution‑specific states. |
| `ctx` | `draft`, `active`, `done`, `cancelled` | Session checkpoint or context summary. |

*Note: Custom workflows may define additional statuses and document types via `.loom/workflow.yml`.*

### 2.1.2 The `requires_load` Field

`requires_load` is an array of document IDs that the AI assistant **must** read before continuing a session. It serves as a persistent "reading list" for context restoration.

**Purpose:**
- When a user resumes work on a thread after a break, the VS Code extension checks this field.
- Any documents listed are automatically injected into the AI's context, even if they aren't directly linked via `parent_id`.

**Example:**
```yaml
requires_load: [payment-system-design-webhooks, security-review]
```

**Behavior:**
- The field is **advisory**, not enforced by the core engine.
- The VS Code extension is responsible for honoring it during context assembly (see `AI_INTEGRATION.md`).

### 2.2 Derived State (The Brain)
The `ViewState` and `Thread` aggregates are **never saved to disk**. They are computed on‑the‑fly.
- **Thread Resolution:** A recursive function walks `parent_id` links until it finds a `type: design` document with `role: primary`. All documents that resolve to the same primary design are grouped into a `Thread` object.
- **Status Calculation:**
    - If any plan is `implementing` → Thread is `IMPLEMENTING`.
    - Else if any doc is `active` → Thread is `ACTIVE`.
    - Else if all plans are `done` → Thread is `DONE`.
- **Staleness Detection:** A plan is `staled` if its `design_version` field is less than the current `version` field of the linked design document.

### 2.3 Event‑Driven Architecture
State changes **only** happen via events. The UI or CLI never mutates a file directly.

**Event Flow:**
1.  **Trigger:** User clicks "Start Plan" in VS Code.
2.  **Event Object:** `{ type: 'START_PLAN', payload: { planId: 'payment-system-plan-001' } }`.
3.  **Orchestrator:** Calls `applyEvent(thread, event)`.
4.  **Reducer:** A pure function updates the `status` of the plan document object.
5.  **Effects:** The orchestrator passes the updated document object to the Effects Layer to write the file to disk.

### 2.4 Reducers (Pure Logic)
Located in `packages/core/src/designReducer.ts` and `packages/core/src/planReducer.ts`, these functions have the signature:
```ts
function reducer(doc: BaseDoc, event: Event): BaseDoc
```
They contain **no side effects** (no `fs.writeFile`, no network calls). This makes them trivially testable and deterministic.

### 2.5 Effects Layer
After a reducer calculates the new state, the Effects Layer executes the necessary side effects:
- **File Writer:** Serializes the updated frontmatter and Markdown content back to the correct file path.
- **Context Generator:** If `design.md` exceeds the token threshold, it triggers the creation of `-ctx.md`.
- **Command Runner:** If configured via `.loom/workflow.yml`, it spawns subprocesses (e.g., `npm run lint`).

---

## 3. Key Architectural Flows

### 3.1 Loading the VS Code Tree View
1.  File watcher detects a change in `threads/**/*.md`.
2.  Debounce (300ms).
3.  **Cache Invalidation:** Clears the cache for that specific thread directory.
4.  **Parser:** `loadThread()` reads all frontmatter into `Document[]` objects.
5.  **ViewModel:** Applies active filters (`ViewState`) and grouping strategy (`groupByThread` or `groupByType`).
6.  **Render:** `TreeDataProvider` renders the virtual nodes.

### 3.2 AI Handshake Protocol
This is the critical bridge between the human and the LLM.
1.  **Context Injection:** The extension builds a prompt containing:
    - The active `ViewState`.
    - Full text of `design.md` (or `-ctx.md` if large).
    - Current plan steps.
2.  **AI Response Parsing:** The AI is instructed to respond with a JSON block:
    ```json
    {
      "proposed_action": "REFINE_DESIGN",
      "reasoning": "The user wants to switch from SQLite to Postgres.",
      "requires_approval": true
    }
    ```
3.  **Approval UI:** The extension shows a diff preview of the proposed frontmatter changes.
4.  **Execution:** Upon approval, the extension fires the `REFINE_DESIGN` event through the standard event pipeline.

### 3.3 Custom Workflow Execution (`.loom/workflow.yml`)
The system supports declarative workflow overrides. When an event fires:
1.  The orchestrator loads the relevant `workflow.yml` (Thread‑specific or Loom root).
2.  It validates that the current document `status` matches the `from_status` defined in the YAML.
3.  It determines the `to_status`.
4.  It enqueues the `effects` list (e.g., `increment_version`, `run_command`).
5.  **Security Check:** If `run_command` is present, the system checks the `allowShellCommands` setting and scans the command against a deny‑list before execution.

---

## 4. Multi‑Loom Workspace Support

REslava Loom supports two operational modes.

### 4.1 Mono‑Loom Mode
The `.loom/` directory lives at the root of a project, alongside `src/`, `package.json`, etc. The CLI detects `.loom/` in the current directory (or any parent) and uses it as the active loom.

### 4.2 Multi‑Loom Mode
A global registry at `~/.loom/config.yaml` tracks multiple looms, typically stored under `~/looms/`. The CLI reads the registry to determine the active loom. Commands like `loom switch` change context.

**Global Registry Example:**
```yaml
active_loom: "../looms/default"
looms:
  - name: "default"
    path: "../looms/default"
    created: "2026-04-14T10:00:00Z"
  - name: "test"
    path: "../looms/test"
    created: "2026-04-14T11:00:00Z"
```

The physical structure of a loom is identical in both modes; only the *discovery* mechanism differs.

---

## 5. Performance & Caching Strategy

Derived state calculation is **O(N)** relative to the number of documents. To ensure a responsive UI even with many threads:
- **Thread‑Level Caching:** The result of `loadThread()` is cached per thread directory.
- **Invalidation:** File watchers only invalidate the cache for the specific thread that changed.
- **Memoization:** Pure functions like `resolveDesign()` are memoized during a single calculation cycle.

---

## 6. Security Model

| Vector | Mitigation |
|--------|------------|
| **Arbitrary Code Execution** | `run_command` effect is **disabled by default**. Requires user opt‑in via `reslava-loom.allowShellCommands: true`. |
| **Path Traversal** | The `cwd` for commands is restricted to the workspace root unless `allowOutsideCwd: true` is explicitly set. |
| **Secret Leakage** | Environment variable filtering prevents `*TOKEN*` or `*SECRET*` variables from being passed to subprocesses unless explicitly allowed. |
| **Prompt Injection** | AI responses are parsed as strict JSON. Malformed or extra‑text responses are rejected and shown to the user for manual review. |

---

## 7. Extension Points

The architecture is designed to be extended without modifying the core engine:

1.  **Custom Document Types:** Add new types to `.loom/workflow.yml` (e.g., `research`, `review`).
2.  **Custom Effects:** While the effect library is built‑in for security, users can trigger arbitrary scripts via `run_command` (if enabled).
3.  **Custom Validators:** `loom validate` uses a simple expression language defined in `.loom/workflow.yml` to enforce cross‑document consistency rules.
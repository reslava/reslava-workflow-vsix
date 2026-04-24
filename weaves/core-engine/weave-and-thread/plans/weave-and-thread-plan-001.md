---
type: plan
id: weave-and-thread-plan-001
title: "Weave & Thread — Phase 4 Implementation"
status: draft
created: 2026-04-23
version: 1
tags: [refactor, core, threads, weaves, migration, phase-4]
parent_id: weave-and-thread-design
child_ids: []
requires_load: [weave-and-thread-design, core-engine-design, vscode-extension-design]
design_version: 3
---

# Weave & Thread — Phase 4 Implementation

## Goal

Migrate Loom from the flat-per-weave layout to the true Weave/Thread graph model:

```
Before (current flat):               After (Phase 4):
weaves/core-engine/                  weaves/core-engine/
  core-engine-design.md                state-management/            ← Thread
  plan-refactor-design.md                state-management-idea.md
  plans/                                 state-management-design.md
    ...                                  plans/state-management-plan-001.md
  done/                                  done/state-management-plan-001-done.md
    ...                                  ai-chats/
                                       plan-refactor/               ← another Thread
                                         plan-refactor-design.md
                                         plans/...
                                       loose-idea.md                ← Loose fiber
                                       ai-chats/                    ← weave-level
                                       references/
```

Every layer is affected: core entities, fs loaders, app use-cases, CLI, VS Code tree, tests, and the repo's own `weaves/` docs.

## Strategy

**Feature branch.** All work happens on `feat/weave-threads`. `main` stays on the flat layout until Phase 8 lands. This keeps `main` releasable at all times.

**Test against `j:/temp/loom` throughout.** New seed helpers build the new layout; we validate end-to-end before touching Loom's own docs.

**Migration script runs last.** Loom's own `weaves/` stays flat until Phase 8. That way we can develop and test the new code without constantly rewriting our own design docs mid-flight.

**One commit per step.** Each step is atomic and testable. If a step breaks something, we revert that one commit.

## Phases Overview

| Phase | Scope | Steps |
| :--- | :--- | :--- |
| 1 | Entity model | 1–3 |
| 2 | fs layer (load/save/index) | 4–9 |
| 3 | app layer (getState + use-cases) | 10–14 |
| 4 | CLI updates | 15–17 |
| 5 | VS Code tree & commands | 18–22 |
| 6 | Integration test rewrite | 23–25 |
| 7 | Migration script | 26–28 |
| 8 | Migrate Loom's own weaves/ | 29–31 |
| 9 | Cleanup & docs | 32–34 |

## Steps

### Phase 1 — Entity Model

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ✅ | 1 | Create `Thread` entity: `{ id, weaveId, idea?, design?, plans[], dones[], chats[], allDocs[] }`. Add unit type for `Fiber` (= Document in a thread). | `packages/core/src/entities/thread.ts` (new), `packages/core/src/entities/index.ts` | — |
| ✅ | 2 | Update `Weave` entity: replace flat `ideas[]`/`designs[]`/`plans[]`/`dones[]` with `threads: Thread[]`. Add `looseFibers: Document[]` for weave-root docs. Keep `chats[]` at weave level. | `packages/core/src/entities/weave.ts`, `packages/core/src/derived.ts` (getWeaveStatus aggregates across threads) | Step 1 |
| ✅ | 3 | Add `getThreadStatus` derived helper (mirrors current `getWeaveStatus` logic but at thread level). Entity tests: construct Weave with 2 threads, verify aggregation. | `packages/core/src/derived.ts`, `tests/entity.test.ts` | Steps 1–2 |

### Phase 2 — fs Layer (Load / Save / Index)

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ✅ | 4 | Add `listThreadDirs(weavePath)` utility: returns subdirs excluding reserved names (`plans`, `done`, `ai-chats`, `ctx`, `references`, `_archive`). A subdir counts as a thread if it contains at least one doc matching `{thread-id}-{idea\|design\|plan}.md`. | `packages/fs/src/utils/pathUtils.ts` | Step 3 |
| ✅ | 5 | Implement `loadThread(loomRoot, weaveId, threadId, index?)`: scans the thread folder, returns `Thread`. Enforces "1 idea, 1 design, N plans" — warn if violated. | `packages/fs/src/repositories/threadRepository.ts` (new), `packages/fs/src/index.ts` | Step 4 |
| ✅ | 6 | Rewrite `loadWeave`: calls `listThreadDirs` + `loadThread` for each, plus loads loose fibers (flat `.md` at weave root) and weave-level `ai-chats/`. Returns new `Weave` shape. | `packages/fs/src/repositories/weaveRepository.ts` | Step 5 |
| ✅ | 7 | Update `saveWeave` / add `saveThread`: determine path per doc type *within* thread (`{thread}/{doc-id}.md` for idea/design, `{thread}/plans/{id}.md`, `{thread}/done/{id}.md`). Loose fibers save to weave root. | `packages/fs/src/repositories/weaveRepository.ts`, `packages/fs/src/repositories/threadRepository.ts` | Step 6 |
| ✅ | 8 | Update `buildLinkIndex`: walks threads, indexes all docs with their thread context. Index entry gains `threadId` field. | `packages/fs/src/repositories/linkRepository.ts`, `packages/core/src/linkIndex.ts` | Step 6 |
| ✅ | 9 | Repository tests: seed new-layout workspace at `j:/temp/loom`, verify `loadWeave` returns correct threads + loose fibers, verify round-trip save/load. | `tests/weave-repository.test.ts` (rewrite), `tests/thread-repository.test.ts` (new) | Steps 5–8 |

### Phase 3 — app Layer

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ✅ | 10 | Update `getState` to aggregate across threads: totals count all threads' plans, `stalePlans` checks each thread's design_version against its plans. | `packages/app/src/getState.ts` | Step 9 |
| ✅ | 11 | Add `resolveThread` helper: given a weave + optional threadId/filePath, returns the target thread or "loose". Used by every use-case that needs thread context. | `packages/app/src/utils/resolveThread.ts` (new) | Step 10 |
| ✅ | 12 | Update doc-creation use-cases (`weaveIdea`, `weaveDesign`, `weavePlan`) to take optional `threadId`: if provided, create thread subdir & write doc there; if omitted, write as loose fiber (idea/design) at weave root. | `packages/app/src/weaveIdea.ts`, `weaveDesign.ts`, `weavePlan.ts` | Step 11 |
| ✅ | 13 | Update plan-lifecycle use-cases (`completeStep`, `closePlan`, `doStep`, `summarise`): resolve thread from plan's location, write done docs and chats into the thread. | `packages/app/src/completeStep.ts`, `closePlan.ts`, `doStep.ts`, `summarise.ts` | Step 11 |
| ✅ | 14 | Use-case tests: end-to-end with j:/temp/loom — create idea in thread, promote to design, create plan, complete steps, close, do-step. Verify all files land in correct thread folders. | `tests/workspace-workflow.test.ts` (rewrite) | Steps 12–13 |

### Phase 4 — CLI

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ✅ | 15 | Add `--thread <id>` to `loom weave idea|design|plan`. Default behavior: creates thread named after the doc (e.g., `loom weave idea "State Management"` → thread `state-management`). `--loose` flag explicitly creates a loose fiber. | `packages/cli/src/commands/weave*.ts` | Step 12 |
| ✅ | 16 | Update `loom status` / `loom state` output to show Weave → Threads → Docs (per design section 6.2). Loose fibers as separate section. | `packages/cli/src/commands/status.ts`, `state.ts` | Step 15 |
| ✅ | 17 | CLI tests: rewrite `commands.test.ts` for new layout, including thread creation and loose-fiber flow. | `tests/commands.test.ts` | Steps 15–16 |

### Phase 5 — VS Code Tree & Commands

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ✅ | 18 | Add Thread tree node with contextValue `thread`. Weave children = thread nodes + loose fibers section + weave-level chats. | `packages/vscode/src/tree/treeProvider.ts` | Step 10 |
| ✅ | 19 | Thread node children = idea + design + Plans section + Chats section (thread-level). Remove "primary design" logic (each thread has exactly one design). | `packages/vscode/src/tree/treeProvider.ts` | Step 18 |
| ✅ | 20 | Update inline button `when` clauses in `package.json`: thread-level commands on `viewItem == thread`, weave-level on `viewItem == weave`, loose-fiber specific entries. | `packages/vscode/package.json` | Step 19 |
| ✅ | 21 | Update commands to pass thread context: `weaveIdea`, `weaveDesign`, `weavePlan`. Commands read threadId from node or auto-derive from title. | `packages/vscode/src/commands/*.ts` | Step 19 |
| ✅ | 22 | Extension Host test rewrite: new `seedWeave` builds thread-based layout; tree tests verify Weave → Thread → Docs rendering; commands tests verify thread context. | `tests/vscode/helpers.ts`, `tests/vscode/tree.test.ts`, `tests/vscode/commands.test.ts` | Steps 18–21 |

### Phase 6 — Integration Tests

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ✅ | 23 | Rewrite `tests/workspace-utils.ts` with thread-aware seeders: `seedWeave`, `seedThread`, `seedLooseFiber`, `seedDoneInThread`. | `tests/workspace-utils.ts` | Step 14 |
| ✅ | 24 | Full workspace-workflow integration test: multi-thread scenario (2 threads in one weave, loose fiber at root), all use-cases exercised. | `tests/workspace-workflow.test.ts` | Step 23 |
| ✅ | 25 | Run the full suite (`scripts/test-all.sh` + `scripts/test-vscode.sh`). All green before Phase 7. | entire tests dir | Steps 17, 22, 24 |

### Phase 7 — Migration Script

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ✅ | 26 | `scripts/migrate-to-threads.ts`: for each weave, groups flat docs by `parent_id` chains — each chain (idea → design → plans → dones) becomes a thread named after the design id (minus `-design`). Docs not part of a chain become loose fibers. Supports `--dry-run`. | `scripts/migrate-to-threads.ts` (new) | Step 9 |
| ✅ | 27 | Dry-run report: prints proposed moves without touching the filesystem. Human-reviewable output. | `scripts/migrate-to-threads.ts` | Step 26 |
| ✅ | 28 | Test migration on a copy of `weaves/`: `cp -r weaves/ /tmp/loom-migrate-test/ && migrate /tmp/loom-migrate-test/`. Verify result loads cleanly via new `loadWeave`. | ad-hoc | Steps 26–27 |

### Phase 8 — Migrate Loom's Own weaves/

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ✅ | 29 | Backup: tag `v0.3.0-pre-weave-threads-migration`. Commit current flat state. | git | Step 28 |
| ✅ | 30 | Run migration on `weaves/`. Review diff. Fix any `requires_load` paths that reference moved files. | `weaves/**/*.md` | Step 29 |
| ✅ | 31 | Verify: run full test suite, run Loom CLI against `weaves/`, open VS Code and inspect tree view. | — | Step 30 |

### Phase 9 — Cleanup & Docs

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ✅ | 32 | Remove any flat-layout compatibility shims (should be none by design, but audit). Delete obsolete helpers like `weave.designs[0]` primary-design pattern. | codebase-wide | Step 31 |
| ✅ | 33 | Update `CLAUDE.md`: Thread is now first-class, update terminology table, architecture diagram, `Key terminology` section. | `CLAUDE.md` | Step 31 |
| 🔳 | 34 | Merge `feat/weave-threads` → `main`. Tag `v0.3.0`. Close this plan. | git | Steps 32–33 |

## Settled Decisions

1. ✅ **Branch strategy:** `feat/weave-threads` off `v0.3.0-pre-weave-threads`. Don't merge until Phase 8 passes.
2. ✅ **Default thread-from-name:** `loom weave idea "Foo Bar"` → thread `foo-bar`. `--loose` opts out.
3. ✅ **Reserved subdir names** inside a weave: `plans`, `done`, `ai-chats`, `ctx`, `references`, `_archive`. Any other subdir is a Thread.
4. ✅ **Thread auto-naming on promotion:** `promoteToDesign` on a loose idea → option (b): wraps both into a new thread folder named after the idea's slug.
5. ✅ **Old CLI scripts (`test-all.sh`):** continue running flat-layout tests until Phase 6 Step 25 switches to new-layout tests.
6. ✅ **Chat files during migration:** existing `ai-chats/` stay at weave level. Per-thread chats deferred — they appear only for chats created after Phase 4.

## Done Document Placement

Done docs live **inside their thread**, not at weave level:

```
weaves/vscode-extension/
  tree-view/                              ← Thread
    tree-view-design.md
    plans/tree-view-plan-001.md
    done/tree-view-plan-001-done.md       ← inside thread
```

A completed thread (all plans closed) **stays in place** — its folder does not move. Only `loom archive` pushes it to `_archive/`. Thread status "DONE" is derived; no file movement required on completion.

**Migration implication (Step 26):** the migration script must trace each flat `weaves/{weave}/done/{id}-done.md` back to its plan via `parent_id`, then move it into `{thread}/done/` alongside that plan.

## Rollback Plan

If migration reveals a design flaw:
- `main` is untouched; checkout `main` and the Loom repo is back to flat layout.
- `v0.3.0-pre-weave-threads` tag is the restore point.
- The feature branch can be abandoned or iterated further.

## Notes

- **Do not skip Phase 7 dry-run.** Verifying the migration script before running it on real docs is non-negotiable.
- **Each phase ends with all tests green.** If Phase 3 leaves tests broken, don't start Phase 4 — fix first.
- The design doc (v3) is the source of truth for naming, structure, and metaphor. If a step contradicts the design, the design wins — come back and amend the plan.
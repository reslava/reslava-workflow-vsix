# CHAT

## Rafa:

About `weaves/core-engine/plans/weave-and-thread-plan-001.md`

### Key Decisions to Confirm Before Starting

1. **Branch strategy:** yes
2. **Default thread-from-name:** yes
3. **Reserved subdir names** yes
4. **Thread auto-naming on promotion:** (b)
5. **Old CLI scripts (`test-all.sh`):** yes
6. **Chat files during migration:**  Per-thread chats defered

TODO: Update `weaves/core-engine/plans/weave-and-thread-plan-001.md` to confirm the decisions

### Flat threads structure when move docs to done/

I think this way has more disadvantages than keeping thread structure in done/

Done Flatten              vs     Done Threads (* are disadvantages)
---------------------------------------------------------------------
will grown messy                 grown grouped by thread
lose thread visual info          keep thread visual info 
                                 renaming a thread in done/ same than in weave/
lose history                     we even can show sorted threads done by done date             
clean weaves                     clean weaves
less subdirs                     more subdirs*
collapsable only by root done/   collapsable by thread
comples restore                  easy restore of thread, just move it, drag & drop

(derive state of a thread: done is all done docs are done)
break the chain                  keep the chain of done docs
you could move docs individual   you can move the thread only. note: only cancelling, or archivining move individual docs

Let me know what you think?


## AI:

All 6 decisions confirmed — updating the plan after this response.

---

### Done placement — you're right, keep thread structure

The plan already has `{thread}/done/{id}-done.md` in Step 7, so we're aligned. Done docs stay inside their thread, not flattened to a weave-level `done/`. Your comparison table makes the case clearly — the main cost (more subdirs) is trivial against the benefits (grouped history, easy restore, sortable by done date, chain intact).

The concrete layout after Phase 4:

```
weaves/vscode-extension/
  tree-view/                             ← Thread (active)
    tree-view-design.md
    plans/tree-view-plan-001.md
    done/tree-view-plan-001-done.md      ← done doc inside thread
  toolbar/                               ← Thread (done — stays in place)
    toolbar-design.md
    plans/toolbar-plan-001.md            ← plan stays in plans/
    done/toolbar-plan-001-done.md
  ai-chats/                              ← weave-level (unscoped)
```

A thread with all plans closed stays in place — its folder doesn't move. Only explicit `loom archive` pushes it to `_archive/`. The VS Code tree derives "DONE" status from all plans being closed; the thread node shows a done icon. No file moves required on completion.

One implication for Step 8 of the plan (migration): weave-level `done/` files from the flat layout need to be moved *into* their respective thread's `done/` subfolder during migration. The migration script should handle this by tracing each done doc's `parent_id` back to its plan and placing it alongside that plan's thread.

Plan will be updated now.

## Rafa:

### Done & filters
Visual icon showing derived thread status.
Actually we can group by status.
But to keep thinks more clear, and instead of moving anything, we take advantage of loom system and implement filters by status:
Show only threads - implementing 
                  - active 
                  - active or implementing 
                  - done

Agree? if so, create an idea in weaves/vscode-extension

### Save tokens
In order to save maximun tokens before reaching weekly limit...
What do you think about doing this?
- commit docs, Do Feature branch, Phase 1, commit, Phase 2, commit, compact
- Phase 3, commit, Phase 4, commit, compact
- ... repeat pattern
Is this approach good idea?

## AI:

### Done & filters — agreed

Filters are the right call. No file movement, no special done-folder logic beyond what we already have — just derive thread status and let the user filter. The existing `statusFilter` in `defaultViewState` already works this way for plans; extending it to threads is natural.

Filter presets I'd suggest:

| Label | Filter value |
| :--- | :--- |
| Active | `active` |
| Implementing | `implementing` |
| Active + Implementing | `active`, `implementing` (default view) |
| Done | `done` |
| All | (no filter) |

This also removes the need to "archive" completed threads just to hide them — set filter to "Active + Implementing" and done threads disappear cleanly. Archive becomes reserved for permanently cancelled/irrelevant threads.

Idea created in `weaves/vscode-extension/` — see `thread-status-filter-idea.md`.

---

### Save tokens — yes, good pattern

The commit → compact → continue cycle is exactly right. Each phase ends with tests green + commit, so compaction never loses context — the plan doc and git log are the persistent state. Claude resumes from the plan step table, not from conversation memory.

Suggested cadence (phase boundaries are natural break points):
plan weave-and-thread-plan-001
- [ ] Do Feature branch, Phase 1, commit → compact
- [ ] Do Phase 2 commit → compact  
- [ ] Do Phase 3 commit → Phase 4, commit → compact (both are shorter)
- [ ] Do Phase 5 commit → compact
- [ ] Do Phase 6 commit → Phase 7, commit → compact
- [ ] Do Phase 8 commit → Phase 9, commit → done

One rule: always compact *after* committing, never before. That way if context is lost mid-phase, the last commit is the restore point and the plan table shows exactly which step to resume from.

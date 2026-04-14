# Troubleshooting Guide — REslava Loom

This document addresses common issues encountered when using REslava Loom. It provides symptoms, likely causes, and step‑by‑step solutions.

---

## 1. Symptoms and Solutions

### 1.1 "Plan marked stale but design hasn't changed"

**Symptoms:**
- The VS Code tree view shows a warning icon (⚠️) next to a plan.
- `loom status` shows `staled: true` for the plan.
- The design document's `version` field hasn't been incremented recently.

**Likely Causes:**
- The plan's `design_version` field is out of sync with the design's `version`. This can happen after a manual edit, merge conflict, or incomplete event execution.

**Solution:**
1. Open the design document (`*-design.md`) and note the `version` field value (e.g., `3`).
2. Open the plan document (`*-plan-*.md`) and check its `design_version` field.
3. If they don't match, update `design_version` to match the design's `version`.
4. Set `staled: false` (or remove the field entirely — it will be recomputed on next load).
5. Run `loom validate <thread-id>` to confirm the issue is resolved.

---

### 1.2 "Thread not appearing in tree view"

**Symptoms:**
- The VS Code "Loom" view is empty or missing a thread you know exists.

**Likely Causes:**
- The thread directory doesn't contain a primary `*-design.md` file.
- Documents have invalid `parent_id` links, breaking the thread graph.
- Required frontmatter fields are missing (e.g., `type`, `id`).
- The thread is filtered out by active ViewState filters (e.g., `showArchived: false` and thread is archived).

**Solution:**
1. Run `loom validate <thread-id>` to see specific errors.
2. Ensure a primary `*-design.md` file exists in the thread directory.
3. Check that all `parent_id` references point to existing document IDs.
4. Check the VS Code toolbar filters:
   - Grouping mode: Try switching to "Thread".
   - Status filters: Ensure `showArchived` is appropriately set.
   - Text filter: Clear any search text.
5. If the issue persists, run `loom status --verbose` to see raw derived state calculation.

---

### 1.3 "AI keeps proposing invalid events"

**Symptoms:**
- When using `loom ai propose`, the AI suggests events that aren't allowed for the current document type/status.
- The AI responds with `REQUEST_CLARIFICATION` even for seemingly clear requests.

**Likely Causes:**
- The AI prompt doesn't include the allowed events list (due to `.loom/workflow.yml` parsing failure).
- The document's current status isn't in the `from_status` list for the desired event.
- The `.loom/workflow.yml` file has syntax errors, causing the system to fall back to an incomplete default.

**Solution:**
1. Run `loom validate-config` to check `.loom/workflow.yml` syntax.
2. Verify the document's current status in frontmatter.
3. Check the allowed events for that document type and status in the active workflow.
4. Open the VS Code output channel "Loom: AI" to see the exact prompt sent to the AI.
5. If the AI still misbehaves, try rephrasing the user request to be more explicit (e.g., "Propose a REFINE_DESIGN event").

---

### 1.4 "`run_command` effect does nothing"

**Symptoms:**
- A workflow event includes `run_command` in its effects list, but no command executes.
- The output channel "Loom: Effects" shows "run_command skipped (disabled by settings)".

**Likely Causes:**
- The `reslava-loom.allowShellCommands` setting is `false` (default).
- The resolved command matches a deny‑list pattern.
- The `cwd` parameter points outside the loom root and `allowOutsideCwd` is `false`.

**Solution:**
1. Open VS Code settings (`Ctrl+,` or `Cmd+,`).
2. Search for `reslava-loom.allowShellCommands` and set to `true`.
3. If the command still doesn't run, check the output channel "Loom: Effects" for deny‑list matches.
4. Ensure any sensitive environment variables are explicitly allowed via `reslava-loom.allowSensitiveEnvVars`.

---

### 1.5 "Context summarization not triggering"

**Symptoms:**
- `design.md` has grown large, but `-ctx.md` hasn't been generated.
- AI sessions start with truncated context.

**Likely Causes:**
- The `design.md` size hasn't exceeded the configured threshold.
- Auto‑summary is disabled or the file watcher isn't triggering.

**Solution:**
1. Manually trigger summarization: `loom summarise-context <thread-id>`.
2. Check the setting `reslava-loom.ai.designSummaryThreshold` (default: 20000 characters). Increase or decrease as needed.
3. Verify that `-ctx.md` isn't already up‑to‑date by comparing its `source_version` with the design's `version`.
4. Ensure the file watcher is running (VS Code extension should handle this).

---

### 1.6 "Tree view flickers or refreshes too often"

**Symptoms:**
- The VS Code Loom tree view rapidly updates, making it hard to interact with.
- CPU usage spikes when editing Loom documents.

**Likely Causes:**
- The file watcher is firing on every keystroke due to autosave or another extension modifying files.
- The debounce delay is too short.

**Solution:**
1. Increase the debounce delay in settings: `reslava-loom.fileWatcherDebounceMs` (default: 300). Try 500 or 1000.
2. Check if other extensions (e.g., Prettier, ESLint) are auto‑formatting on save, causing cascading file changes.
3. Disable autosave for Loom documents: `"files.autoSave": "off"` or use `onFocusChange`.
4. If the issue persists, disable the file watcher entirely and rely on manual refresh (tree view refresh button).

---

### 1.7 "Validation fails on CI but passes locally"

**Symptoms:**
- `loom validate --all` passes on your machine but fails in GitHub Actions / CI pipeline.

**Likely Causes:**
- Different `.loom/workflow.yml` version (not committed or divergent branch).
- Case‑sensitivity differences (macOS/Linux vs Windows file paths).
- Missing `loom` CLI installation or wrong version in CI.

**Solution:**
1. Ensure `.loom/workflow.yml` is committed and pushed to the branch being tested.
2. Run `loom validate-config` in CI to confirm the config is valid.
3. Pin the `@reslava-loom/cli` version in CI: `npm install -g @reslava-loom/cli@0.3.0`.
4. Add a step to list thread directories: `ls -la threads/` to verify case‑sensitive paths.

---

### 1.8 "Orphaned documents appear in 'Unassigned' group"

**Symptoms:**
- Documents appear under an "Unassigned" section in the tree view instead of within a thread.

**Likely Causes:**
- The document's `parent_id` points to a design that doesn't exist or is in another thread.
- The document has no `parent_id` and isn't a design itself.

**Solution:**
1. Run `loom validate <thread-id>` to identify broken references.
2. If the parent design was deleted, either restore it or remove the `parent_id` from the orphaned document.
3. To clean up multiple orphans, use `loom repair --fix-orphans` (future command) or manually edit frontmatter.
4. If the document should be standalone (e.g., an unlinked idea), this is expected behavior — it will remain in "Unassigned".

---

### 1.9 "Step completion not reflected in plan status"

**Symptoms:**
- You manually change a step's checkbox from `🔳` to `✅`, but the plan's `status` remains `active` instead of progressing to `implementing` or `done`.

**Likely Causes:**
- Step completion is purely visual in Markdown; the plan's state machine requires an explicit `COMPLETE_STEP` event to update status.
- Manual edits to the steps table don't trigger the event.

**Solution:**
1. Use the VS Code command `Loom: Complete Step` (right‑click on step in tree view) to properly mark a step complete.
2. Or use the CLI: `loom complete-step <plan-id> --step 1`.
3. If you manually edited the table, also update the plan's frontmatter `status` if appropriate.
4. Run `loom validate` to check for consistency.

---

### 1.10 "Cannot switch to a loom"

**Symptoms:**
- `loom switch <name>` fails with "Loom not found" or "Path does not exist".

**Likely Causes:**
- The loom isn't registered in `~/.loom/config.yaml`.
- The registered path no longer exists (moved or deleted).
- The global registry file is corrupted.

**Solution:**
1. Run `loom list` to see registered looms.
2. If missing, register it: `loom setup <name> --path <path>`.
3. If the path is broken, either recreate the loom or manually edit `~/.loom/config.yaml` to remove or fix the entry.
4. If you're in a mono‑loom project, `loom switch` is not needed — just `cd` into the project and run commands.

---

## 2. Diagnostic Commands

Use these commands to gather information when troubleshooting:

| Command | Purpose |
|---------|---------|
| `loom status <thread-id>` | Show derived state for a thread. |
| `loom status --verbose` | Show raw document data and derivation steps. |
| `loom validate <thread-id>` | Check document relationships, frontmatter, and staleness. |
| `loom validate-config` | Validate `.loom/workflow.yml` syntax. |
| `loom list` | Show all registered looms and their paths. |
| `loom current` | Show the currently active loom. |
| `loom doctor` | (Future) Comprehensive system health check. |

---

## 3. VS Code Output Channels

The extension logs detailed information to several output channels. Access them via `View → Output` and select the channel from the dropdown.

| Channel | Contents |
|---------|----------|
| **Loom: Core** | Document loading, event application, derived state calculation. |
| **Loom: Effects** | Effect execution logs, including `run_command` output. |
| **Loom: AI** | Prompts sent to AI and raw responses. |
| **Loom: Tree** | Tree view rendering and refresh events. |

**Tip:** Set the log level in settings: `"reslava-loom.logLevel": "debug"` for maximum verbosity.

---

## 4. Common Error Messages

| Error Message | Meaning | Action |
|---------------|---------|--------|
| `Cannot apply event: current status 'active' not in from_status list` | The document's status doesn't allow this transition. | Check `.loom/workflow.yml` for allowed `from_status` values. |
| `Document id 'xxx' not found` | A `parent_id` or `child_id` references a non‑existent document. | Run `loom validate` to find broken links. |
| `Circular reference detected` | Documents form a loop (A → B → C → A). | Edit frontmatter to break the cycle. |
| `Effect 'xxx' not found` | An effect name in `.loom/workflow.yml` is misspelled or not built‑in. | Check the effect name against the catalog in `EFFECTS.md`. |
| `Template not found for type 'xxx'` | The `create_child_document` effect can't find a template. | Ensure `.loom/templates/xxx-template.md` exists. |
| `No active loom` | You're not in a loom directory and no global registry exists. | Run `loom init` or `cd` into a project with `.loom/`. |

---

## 5. Getting Help

If you encounter an issue not covered here:

1. **Check existing issues:** Search the [GitHub Issues](https://github.com/reslava/reslava-loom/issues) for similar problems.
2. **Gather logs:** Set `reslava-loom.logLevel: "debug"`, reproduce the issue, and copy the relevant output channel contents.
3. **Provide context:** Include OS, VS Code version, Loom CLI version, and steps to reproduce.
4. **Open a new issue:** Use the bug report template.

---

## 6. Emergency Recovery

If the system state becomes severely corrupted:

1. **Revert to last known good Git commit:** `git checkout HEAD~1 -- threads/`
2. **Manually edit frontmatter:** If Git isn't available, open each document and correct obvious errors (e.g., `status: invalid` → `status: draft`).
3. **Run `loom repair`:** (Future command) Attempts to fix common issues automatically.
4. **Rebuild derived state cache:** Delete the `.loom/cache/` directory and restart VS Code.

# Collaboration Guide — REslava Loom

This document describes best practices for using REslava Loom in a team environment with Git. It covers branch strategies, merge conflict resolution, team workflows, and continuous integration.

---

## 1. Git Workflow

REslava Loom is **Git‑native**. All state is stored in Markdown files, so standard Git practices apply. Each thread's documents live alongside the code they describe.

### 1.1 Recommended Branch Strategy

Use **feature branches** for all work:

```text
main
  └── feature/payment-system
        ├── threads/payment-system/payment-system-design.md
        ├── threads/payment-system/plans/payment-system-plan-001.md
        └── src/payment/...
```

**Workflow:**
1. Create a feature branch: `git checkout -b feature/payment-system`
2. Create Loom documents using `loom weave idea` or manually.
3. Commit documents as they evolve.
4. Open a Pull Request when the thread is ready.
5. Review both code and Loom state.

### 1.2 When to Commit Loom Documents

| Document Type | Commit Frequency |
|---------------|------------------|
| `*-idea.md` | When idea is complete and ready for design. |
| `*-design.md` | After significant conversations or decisions. |
| `*-plan-*.md` | After creating, starting, or completing steps. |
| `*-ctx.md` | At natural checkpoints (e.g., end of session). |

**Tip:** Use commit message prefixes to distinguish Loom changes:
- `docs(loom): refine design for payment system`
- `docs(loom): start plan-001`
- `docs(loom): checkpoint - security review`

---

## 2. Handling Merge Conflicts

When two branches modify the same Loom document, Git will raise a merge conflict. Since state is stored in frontmatter, conflicts typically occur there.

### 2.1 Resolving Frontmatter Conflicts

**Example Conflict:**
```yaml
<<<<<<< HEAD
status: active
version: 3
=======
status: closed
version: 2
>>>>>>> other-branch
```

**Resolution Guidelines:**

| Field | How to Resolve |
|-------|----------------|
| `status` | Determine the **correct current status** based on the actual state of work. If unsure, default to the more conservative status (e.g., `active` over `done`). |
| `version` | Take the **higher number**, as it indicates more recent changes. If one branch incremented version and the other didn't, keep the increment. |
| `child_ids` | Merge both lists, **remove duplicates**, and **sort alphabetically** to reduce future conflicts. |
| `tags` | Merge and deduplicate. |
| `staled` | If the design version increased in either branch, set `staled: true`. Otherwise, keep `false`. |
| `requires_load` | Merge both lists, deduplicate. |

### 2.2 After Resolving Conflicts

1. **Run validation:** `loom validate <thread-id>` to catch any inconsistencies.
2. **Check derived state:** `loom status <thread-id>` to ensure the thread shows the expected status.
3. **Review manually:** Open the document and verify the conversation log makes sense.

### 2.3 Reducing Merge Conflicts with a Custom Merge Driver (Optional)

You can configure Git to automatically sort arrays in frontmatter, reducing meaningless conflicts.

**Step 1: Create a merge driver script** (e.g., `.git/merge-driver-yaml`):
```bash
#!/bin/bash
# Simple merge driver that sorts "child_ids" and "tags" arrays
git merge-file --marker-size=7 "$1" "$2" "$3"
# Post-process to sort arrays (implementation left as exercise)
```

**Step 2: Configure `.gitattributes`:**
```
*.md merge=union-frontmatter
```

**Step 3: Register the driver:**
```bash
git config merge.union-frontmatter.name "Union merge for Loom frontmatter"
git config merge.union-frontmatter.driver "./.git/merge-driver-yaml %A %O %B"
```

*Note: This is an advanced optimization. Manual resolution works fine for most teams.*

---

## 3. Team Workflows

### 3.1 Assigning Ownership

Add an `assignee` field to frontmatter to indicate who is responsible for a document.

```yaml
---
type: design
assignee: "@alice"
---
```

This field is **optional** and not used by the core engine, but the VS Code extension can display it in the tree view.

### 3.2 Reviewing Loom Documents

When reviewing a Pull Request, check Loom documents for:

| Checklist Item | Why It Matters |
|----------------|----------------|
| ✅ `status` field matches reality | Prevents stale state from misleading the team. |
| ✅ `design_version` in plans matches design version | Ensures staleness detection works. |
| ✅ No orphaned `parent_id` references | Prevents broken thread relationships. |
| ✅ `requires_load` includes necessary context | Helps AI resume sessions correctly. |
| ✅ Run `loom validate` and ensure no errors | Catches inconsistencies early. |

### 3.3 Avoiding Concurrent Edits

- **Communicate:** Use team chat to indicate when you're actively editing a design document.
- **Use `closed` status:** When a design is under review or waiting for input, set `status: closed` to signal it's not actively being edited.
- **Future feature:** The VS Code extension may show a warning if a file is open in another user's workspace.

### 3.4 Pairing with AI

When two developers pair with the AI on a design:

1. One person shares their screen with the VS Code extension.
2. The AI proposes events via the handshake protocol.
3. Both developers discuss the diff preview before approving.
4. The resulting document is committed, capturing the joint decision.

---

## 4. Continuous Integration

Automate Loom validation in your CI pipeline to catch issues before merging.

### 4.1 GitHub Action Example

Create `.github/workflows/loom-validate.yml`:

```yaml
name: Loom Validation

on:
  pull_request:
    paths:
      - 'threads/**/*.md'
      - '.loom/workflow.yml'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install Loom CLI
        run: npm install -g @reslava-loom/cli

      - name: Validate all threads
        run: loom validate --all

      - name: Validate workflow config
        run: loom validate-config
```

### 4.2 GitLab CI Example

```yaml
# .gitlab-ci.yml
loom-validation:
  stage: test
  image: node:18
  script:
    - npm install -g @reslava-loom/cli
    - loom validate --all
    - loom validate-config
  only:
    - merge_requests
```

### 4.3 Pre‑commit Hook (Local)

To catch issues before committing, add a pre‑commit hook using [Husky](https://typicode.github.io/husky/):

```bash
# .husky/pre-commit
npm run loom:validate
```

In `package.json`:
```json
{
  "scripts": {
    "loom:validate": "loom validate --changed"
  }
}
```

---

## 5. Working with Multiple Threads in Parallel

Large projects often have several threads in flight simultaneously.

### 5.1 Thread Directory Structure

```
threads/
├── payment-system/
│   ├── payment-system-design.md (status: active)
│   └── plans/
├── user-auth/
│   ├── user-auth-design.md (status: closed)
│   └── plans/
└── _archive/
    └── legacy-checkout/
```

### 5.2 Cross‑Thread Dependencies

If Thread A depends on Thread B, document this in the design:

```markdown
## Dependencies
- [ ] Thread B: User authentication (blocked until design finalized)
```

The system doesn't enforce cross‑thread dependencies automatically, but you can add custom validation rules in `.loom/workflow.yml`:

```yaml
validation:
  - rule: "Payment system cannot be implemented before auth is done"
    check: "thread('payment-system').phase != 'implementing' or thread('auth').phase == 'done'"
```

---

## 6. Archiving Completed Threads

When a thread is complete (all plans done), move it to `_archive/threads/` to reduce clutter.

```bash
loom archive payment-system --reason done
```

Or manually:
```bash
mkdir -p threads/_archive/threads/done
mv threads/payment-system threads/_archive/threads/done/
git add threads/_archive
git commit -m "docs(loom): archive completed payment-system thread"
```

The VS Code tree view can be configured to hide archived threads (via `reslava-loom.tree.showArchived` setting).

---

## 7. Multi‑Loom Collaboration

Teams working on multiple independent projects can use separate looms.

```bash
# Alice works on the main project
loom switch default

# Bob works on an experimental spike
loom switch experimental
```

Each loom has its own `.loom/workflow.yml` and `threads/` directory, isolated from others. The global registry (`~/.loom/config.yaml`) tracks all looms.

To share a loom with the team, simply commit its directory to Git. Team members can then register it locally:

```bash
git clone https://github.com/team/experimental-loom.git ~/looms/experimental
loom setup experimental --path ~/looms/experimental
```

---

## 8. Troubleshooting Team Issues

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| "Thread status shows IMPLEMENTING but no one is working on it" | Plan left in `implementing` status after completion. | Run `loom status` to find the plan, then complete or block it. |
| "Merge conflict in `child_ids` every PR" | Unsorted arrays cause spurious conflicts. | Sort `child_ids` alphabetically before committing. |
| "AI proposes event that another team member already did" | Stale local state. | Pull latest changes before invoking AI. |
| "Validation fails on CI but passes locally" | Different `.loom/workflow.yml` versions. | Ensure `.loom/workflow.yml` is committed and up‑to‑date. |
| "Loom command not found in CI" | CLI not installed globally. | Use `npm install -g @reslava-loom/cli` in CI steps. |

---

## 9. Summary

| Practice | Recommendation |
|----------|----------------|
| **Branching** | Feature branches with Loom documents included. |
| **Commits** | Commit after significant state changes. |
| **Merge Conflicts** | Resolve frontmatter manually, favoring higher version and actual state. |
| **Reviews** | Validate Loom state alongside code. |
| **CI** | Run `loom validate --all` on PRs. |
| **Archiving** | Move completed threads to `_archive/threads/`. |
| **Multi‑Loom** | Use separate looms for independent projects. |

Following these practices ensures REslava Loom remains a reliable source of truth for the entire team.
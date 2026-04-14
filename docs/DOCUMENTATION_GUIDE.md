---
type: reference
id: documentation-guide
title: "Documentation Guide — Writing Conventions & Structure"
status: active
created: 2026-04-12
updated: 2026-04-14
version: 3
tags: [documentation, conventions, style-guide]
requires_load: []
---

# Documentation Guide — Writing Conventions & Structure

## Goal

Define consistent writing conventions, document structure, and formatting standards for all REslava Loom documentation. This ensures clarity for both human readers and AI collaborators.

## Context

The Loom workflow system relies heavily on Markdown documents as the source of truth. Consistent structure improves scannability, enables AI context injection, and maintains professionalism across the project.

This guide applies to:
- Project documentation (README, ARCHITECTURE, etc.)
- Workflow documents (idea, design, plan, ctx)
- Templates
- Inline code comments (where applicable)

---

## Document Voice Conventions

### First Person in Conversation Blocks

Sections marked `## User:` and `## AI:` are **direct dialogue**. Write in **first person** as if the participant is speaking.

```markdown
## Rafa:
I think we should use PostgreSQL for the primary database.

## AI:
I agree. PostgreSQL offers better concurrency and supports advanced features we may need later.
```

### Third Person Everywhere Else

All other sections—Goal, Context, Architecture, step descriptions, etc.—are written in **third person** (or neutral narrative voice). This maintains objectivity and professional documentation standards.

```markdown
## Goal
Define a clear and extensible model for representing a Thread as a first-class concept.

## Context
The system currently represents documents as independent entities. A Thread groups related documents together.
```

---

## Document Structure

### Required Frontmatter Fields

Every Loom document must include YAML frontmatter with at minimum:

| Field | Description |
|-------|-------------|
| `type` | Document type (`idea`, `design`, `plan`, `ctx`, `reference`) |
| `id` | Unique identifier (kebab-case, e.g., `core-engine-design`) |
| `title` | Human-readable title in quotes |
| `status` | Current status (see status reference) |
| `created` | ISO date `YYYY-MM-DD` |
| `version` | Integer version number |
| `tags` | Array of relevant tags |
| `parent_id` | ID of parent document (or `null`) |
| `child_ids` | Array of child document IDs |
| `requires_load` | Array of document IDs required for AI session context |

### Body Structure by Document Type

| Type | Expected Sections |
|------|-------------------|
| `idea` | Problem, Idea, Why now, Open questions, Next step |
| `design` | Goal, Context, `# CHAT` (followed by `## User:` / `## AI:` blocks) |
| `plan` | Goal, Steps table, Step details, Legend |
| `ctx` | Active state, Key decisions, Open questions, Step continuation note |

Templates for each type are available in `.loom/templates/`.

---

## Dependency Tracking in Plans

Plans often have steps that depend on the completion of other steps, either within the same plan or in other plans. To make these dependencies explicit, the steps table includes a **"Blocked by"** column.

### Steps Table Format

```markdown
| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Define TypeScript core types | `packages/core/src/types.ts` | — |
| 🔳 | 2 | Implement design reducer | `packages/core/src/designReducer.ts` | Step 1 |
| 🔳 | 3 | Implement plan reducer | `packages/core/src/planReducer.ts` | Step 1 |
| 🔳 | 4 | Implement applyEvent orchestrator | `packages/core/src/applyEvent.ts` | Steps 2, 3 |
```

### Dependency Values

| Value | Meaning |
|-------|---------|
| `—` | No dependencies; can start immediately. |
| `Step N` | Blocked until Step N is marked ✅. |
| `Steps N, M` | Blocked until all listed steps are ✅. |
| `<plan-id>` | Blocked until the referenced plan has `status: done`. (Used in the first step of a dependent plan.) |

### Human Workflow

1. Review the "Blocked by" column before starting a step.
2. Verify that all blockers are resolved.
3. If a blocker is not resolved, work on an unblocked step or pause.

Future versions of `loom status` will highlight blocked steps automatically.

---

## Changelog Sections in Documents

While Git commit history is the ultimate source of truth for changes, **design documents** may benefit from a `## Changelog` section at the end of the document. This provides a human-readable summary of major revisions without requiring readers to dig through Git logs.

### When to Include a Changelog

| Document Type | Include Changelog? | Rationale |
|---------------|--------------------|-----------|
| `design` | **Optional, but recommended.** | Designs evolve significantly. A changelog helps readers understand the document's history. |
| `plan` | **No.** | Plans are execution artifacts. Changes should be captured in Git or by updating the plan itself. |
| `idea` | **No.** | Ideas are lightweight and short-lived. |
| `ctx` | **No.** | Context summaries are regenerated; history is in `ctx/` subfolder. |
| `reference` | **Yes, if versioned.** | References like this guide should track changes for users. |

### Changelog Format

```markdown
## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 3 | 2026-04-14 | Added dependency tracking convention and "Blocked by" column. Clarified changelog usage. |
| 2 | 2026-04-13 | Added versioning section and `role` frontmatter field. |
| 1 | 2026-04-12 | Initial documentation guide. |
```

Keep entries concise—one line summarizing the change.

---

## Formatting Standards

### Headers

- Use ATX-style headers (`#`, `##`, `###`).
- Maintain a single `#` title at the top of the document.
- Section headers use `##`.
- Sub-sections use `###`.

### Tables

Use pipe tables for structured data. Align columns for readability.

```markdown
| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
```

### Code Blocks

Specify language for syntax highlighting.

````markdown
```typescript
function applyEvent(thread: Thread, event: Event): Thread {
  // ...
}
```
````

### Lists

- Use `-` for unordered lists.
- Use `1.` for ordered lists.

### Links

Use reference-style links for repeated URLs.

```markdown
[DeepSeek API]: https://api.deepseek.com/v1
```

---

## Symbols & Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
| ⚠️ | Warning / Stale |
| 🔴 | Critical priority |
| 🟡 | High priority |
| 🟢 | Nice-to-have |

---

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Document IDs | kebab-case | `core-engine-design` |
| Thread IDs | kebab-case | `payment-system` |
| File names | kebab-case with type suffix | `payment-system-plan-001.md` |
| Event names | SCREAMING_SNAKE_CASE | `REFINE_DESIGN` |
| CLI commands | kebab-case | `loom ai respond` |

---

## AI Collaboration Notes

When writing documentation intended for AI consumption:

1. **Be explicit.** State requirements, constraints, and expected outputs clearly.
2. **Use structured sections.** AI models attend more strongly to headers.
3. **Include examples.** Concrete examples improve response accuracy.
4. **Specify the mode.** Indicate whether the AI should respond in Chat Mode (natural language) or Action Mode (JSON proposal).

---

## Templates

Reference templates are located in `.loom/templates/`:

- `idea-template.md`
- `design-template.md`
- `plan-template.md`
- `ctx-template.md`

When creating a new document, copy the appropriate template and fill in placeholders.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 3 | 2026-04-14 | Added dependency tracking convention with "Blocked by" column. Added guidance on changelog usage in documents. |
| 2 | 2026-04-13 | Added versioning section (integer vs semver, overwrite vs archive). Added `role` to required frontmatter fields. Updated naming conventions with primary/supporting design patterns. Updated `requires_load` guidance to use full paths. |
| 1 | 2026-04-12 | Initial documentation guide. |
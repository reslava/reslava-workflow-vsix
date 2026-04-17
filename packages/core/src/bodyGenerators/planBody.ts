/**
 * Generates the Markdown body for a plan document.
 * @param title - The title of the plan.
 * @param goal - Optional goal description. If omitted, a placeholder comment is inserted.
 * @returns The complete Markdown body (excluding frontmatter).
 */
export function generatePlanBody(title: string, goal?: string): string {
    const goalSection = goal ? `\n${goal}\n` : '\n<!-- One paragraph: what this plan implements and why. -->\n';
    const today = new Date().toISOString().split('T')[0];
    
    return `# Plan — ${title}

| | |
|---|---|
| **Created** | ${today} |
| **Status** | DRAFT |
| **Design** | \`{design-id}.md\` |
| **Target version** | {X.X.X} |

---

# Goal
${goalSection}
---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | {Step description} | \`src/...\` | — |

---

## Step 1 — {Step description}

<!-- Detailed spec for Step 1. -->

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
`;
}
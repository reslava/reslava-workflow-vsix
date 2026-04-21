import { loadWeave } from '../../fs/dist';
import { getActiveLoomRoot } from '../../fs/dist';
import { serializeFrontmatter } from '../../core/dist/frontmatterUtils';
import * as fs from 'fs-extra';
import * as path from 'path';
import matter from 'gray-matter';

export interface SummariseInput {
    weaveId: string;
    force?: boolean;
}

export interface SummariseDeps {
    loadWeave: (loomRoot: string, weaveId: string) => Promise<any>;
    getActiveLoomRoot: (wsRoot?: string) => string;
    fs: typeof fs;
    loomRoot: string;
}

function extractSection(content: string, heading: string): string {
    const regex = new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n##|$)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : '(Not specified)';
}

function extractDecisions(content: string): string[] {
    const decisions: string[] = [];
    const lines = content.split('\n');
    for (const line of lines) {
        if (line.includes('Decision:') || line.includes('decided')) {
            decisions.push(line.trim());
        }
    }
    return decisions.length > 0 ? decisions : ['(No explicit decisions recorded)'];
}

function extractQuestions(content: string): string[] {
    const questions: string[] = [];
    const regex = /\?\s*$/;
    const lines = content.split('\n');
    for (const line of lines) {
        if (regex.test(line.trim()) && line.includes('## User:')) {
            questions.push(line.replace('## User:', '').trim());
        }
    }
    return questions.length > 0 ? questions : ['(No open questions)'];
}

export async function summarise(
    input: SummariseInput,
    deps: SummariseDeps
): Promise<{ ctxPath: string; generated: boolean }> {
    const weave = await deps.loadWeave(deps.loomRoot, input.weaveId);
    const primaryDesign = weave.designs[0];
    if (!primaryDesign) {
        throw new Error(`Weave '${input.weaveId}' has no design document.`);
    }

    const loomRoot = deps.getActiveLoomRoot(deps.loomRoot);
    const ctxPath = path.join(loomRoot, 'weaves', input.weaveId, `${input.weaveId}-ctx.md`);

    if (!input.force && deps.fs.existsSync(ctxPath)) {
        const existing = matter.read(ctxPath);
        if (existing.data.source_version === primaryDesign.version) {
            return { ctxPath, generated: false };
        }
    }

    const designContent = primaryDesign.content || '';
    const goal = extractSection(designContent, 'Goal');
    const context = extractSection(designContent, 'Context');
    const decisions = extractDecisions(designContent);
    const questions = extractQuestions(designContent);

    const now = new Date().toISOString();
    const summaryFrontmatter = {
        type: 'ctx',
        id: `${input.weaveId}-ctx`,
        title: `Context Summary — ${primaryDesign.title}`,
        status: 'active',
        created: now.split('T')[0],
        version: 1,
        tags: ['ctx', 'summary'],
        parent_id: primaryDesign.id,
        requires_load: [],
        source_version: primaryDesign.version,
    };

    const summaryBody = `# Design Context Summary

## Problem Statement
${goal}

## Context
${context}

## Key Decisions Made
${decisions.map((d: string) => `- ${d}`).join('\n')}

## Open Questions
${questions.map((q: string) => `- ${q}`).join('\n')}

## Active Plans
${weave.plans.map((p: any) => `- ${p.id} (status: ${p.status}, progress: ${p.steps?.filter((s: any) => s.done).length || 0}/${p.steps?.length || 0} steps)`).join('\n')}

---
*Generated: ${now}*
`;

    const frontmatterStr = serializeFrontmatter(summaryFrontmatter);
    const output = `${frontmatterStr}\n${summaryBody}`;
    await deps.fs.writeFile(ctxPath, output);

    return { ctxPath, generated: true };
}
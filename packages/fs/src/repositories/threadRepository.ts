import * as path from 'path';
import * as fs from 'fs-extra';
import { Thread } from '../../../core/dist/entities/thread';
import { Document } from '../../../core/dist/entities/document';
import { DesignDoc } from '../../../core/dist/entities/design';
import { IdeaDoc } from '../../../core/dist/entities/idea';
import { PlanDoc } from '../../../core/dist/entities/plan';
import { CtxDoc } from '../../../core/dist/entities/ctx';
import { loadDoc, FrontmatterParseError } from '../serializers/frontmatterLoader';
import { saveDoc } from '../serializers/frontmatterSaver';
import { findMarkdownFiles } from '../utils/pathUtils';
import { resolveThreadPath } from '../utils/workspaceUtils';
import {
    validateParentExists,
    getDanglingChildIds,
    validateDesignRole,
    validateSinglePrimaryDesign
} from '../../../core/dist/validation';
import { LinkIndex } from '../../../core/dist/linkIndex';

/**
 * Loads a thread by its ID.
 *
 * @param loomRoot - The absolute path to the loom root.
 * @param threadId - The thread identifier.
 * @param index - Optional pre‑built link index for validation warnings.
 * @returns A promise resolving to the Thread, or null if the folder is empty.
 */
export async function loadThread(loomRoot: string, threadId: string, index?: LinkIndex): Promise<Thread | null> {
    const threadPath = resolveThreadPath(loomRoot, threadId);
    if (!await fs.pathExists(threadPath)) {
        throw new Error(`Thread directory not found: ${threadPath}`);
    }
    
    const files = await findMarkdownFiles(threadPath);
    const docs: Document[] = [];
    
    for (const file of files) {
        try {
            docs.push(await loadDoc(file) as Document);
        } catch (e) {
            if (e instanceof FrontmatterParseError) {
                console.warn(`Skipping ${file}: ${e.message}`);
            } else {
                throw e;
            }
        }
    }
    
    // Empty folder is not a thread
    if (docs.length === 0) {
        return null;
    }
    
    const ideas = docs.filter(d => d.type === 'idea') as IdeaDoc[];
    const designs = docs.filter(d => d.type === 'design') as DesignDoc[];
    const plans = docs.filter(d => d.type === 'plan') as PlanDoc[];
    const contexts = docs.filter(d => d.type === 'ctx') as CtxDoc[];
    
    // Validation warnings (if index provided)
    if (index) {
        for (const doc of docs) {
            if (doc.parent_id && !validateParentExists(doc, index)) {
                console.warn(`⚠️  [${doc.id}] Broken parent_id: ${doc.parent_id}`);
            }
            const dangling = getDanglingChildIds(doc, index);
            for (const childId of dangling) {
                console.warn(`⚠️  [${doc.id}] Dangling child_id: ${childId}`);
            }
            if (doc.type === 'design') {
                const roleIssue = validateDesignRole(doc as DesignDoc);
                if (roleIssue) {
                    console.warn(`⚠️  [${doc.id}] ${roleIssue.message}`);
                }
            }
        }
        
        // Warn if multiple primary designs exist (informational only)
        const primaryDesigns = designs.filter(d => d.role === 'primary');
        if (primaryDesigns.length > 1) {
            console.warn(`⚠️  [${threadId}] Multiple primary designs found. Using first one as primary.`);
        }
    }

    return {
        id: threadId,
        ideas,
        designs,
        plans,
        contexts,
        allDocs: docs,
    };
}

function determinePathForDoc(doc: any, loomRoot: string, threadId: string): string {
    const threadPath = resolveThreadPath(loomRoot, threadId);
    switch (doc.type) {
        case 'idea': return path.join(threadPath, `${threadId}-idea.md`);
        case 'design': {
            if (doc.role === 'primary') return path.join(threadPath, `${threadId}-design.md`);
            return path.join(threadPath, `${doc.id}.md`);
        }
        case 'plan': return path.join(threadPath, 'plans', `${doc.id}.md`);
        case 'ctx': {
            if (doc.source_version !== undefined) return path.join(threadPath, `${threadId}-ctx.md`);
            return path.join(threadPath, 'ctx', `${doc.id}.md`);
        }
        default: throw new Error(`Unknown document type: ${doc.type}`);
    }
}

export async function saveThread(loomRoot: string, thread: Thread): Promise<void> {
    for (const doc of thread.allDocs) {
        let filePath = (doc as any)._path;
        if (!filePath) filePath = determinePathForDoc(doc, loomRoot, thread.id);
        await saveDoc(doc, filePath);
    }
}
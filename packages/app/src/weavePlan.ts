import * as fs from 'fs-extra';
import * as path from 'path';
import { getActiveLoomRoot } from '../../fs/dist';
import { loadThread } from '../../fs/dist';
import { generatePlanId } from '../../fs/dist';
import { createBaseFrontmatter, serializeFrontmatter } from '../../core/dist';
import { generatePlanBody } from '../../core/dist';
import { DesignDoc } from '../../core/dist';

export interface WeavePlanInput {
    threadId: string;
    title?: string;
    goal?: string;
}

export interface WeavePlanDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    loadThread: typeof loadThread;
    fs: typeof fs;
}

export async function weavePlan(
    input: WeavePlanInput,
    deps: WeavePlanDeps
): Promise<{ id: string; filePath: string; autoFinalizedDesign: boolean }> {
    const loomRoot = deps.getActiveLoomRoot();
    const thread = await deps.loadThread(input.threadId);
    
    let design = thread.design;
    let autoFinalizedDesign = false;
    
    // Auto-finalize the design if it's not already 'done'
    if (design.status !== 'done') {
        const updatedDesign: DesignDoc = {
            ...design,
            status: 'done',
            updated: new Date().toISOString().split('T')[0],
        };
        
        // Determine the design file path
        const designPath = (design as any)._path || path.join(loomRoot, 'threads', input.threadId, `${design.id}.md`);
        
        // Re-serialize and save the design
        const designContent = design.content;
        const frontmatterYaml = serializeFrontmatter(updatedDesign);
        const output = `${frontmatterYaml}\n${designContent}`;
        await deps.fs.writeFile(designPath, output);
        
        design = updatedDesign;
        autoFinalizedDesign = true;
    }
    
    const planTitle = input.title || `${input.threadId} Plan`;
    const existingPlanIds = thread.plans.map(p => p.id);
    const planId = generatePlanId(input.threadId, existingPlanIds);
    
    const frontmatter = createBaseFrontmatter('plan', planId, planTitle, design.id);
    (frontmatter as any).design_version = design.version;
    (frontmatter as any).target_version = design.target_release || '0.1.0';
    
    const content = generatePlanBody(planTitle, input.goal);
    
    const frontmatterYaml = serializeFrontmatter(frontmatter);
    const output = `${frontmatterYaml}\n${content}`;
    
    const threadPath = path.join(loomRoot, 'threads', input.threadId);
    const plansDir = path.join(threadPath, 'plans');
    await deps.fs.ensureDir(plansDir);
    
    const filePath = path.join(plansDir, `${planId}.md`);
    await deps.fs.outputFile(filePath, output);
    
    return { id: planId, filePath, autoFinalizedDesign };
}
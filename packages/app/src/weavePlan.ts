import * as fs from 'fs-extra';
import * as path from 'path';
import { loadWeave } from '../../fs/dist';
import { saveDoc } from '../../fs/dist';
import { generatePlanId } from '../../core/dist/idUtils';
import { createBaseFrontmatter } from '../../core/dist/frontmatterUtils';
import { generatePlanBody } from '../../core/dist/bodyGenerators/planBody';
import { generateDesignBody } from '../../core/dist/bodyGenerators/designBody';
import { DesignDoc, PlanDoc } from '../../core/dist';

export interface WeavePlanInput {
    weaveId: string;
    title?: string;
    goal?: string;
}

export interface WeavePlanDeps {
    loadWeave: (loomRoot: string, weaveId: string) => Promise<any>;
    saveDoc: typeof saveDoc;
    fs: typeof fs;
    loomRoot: string;
}

function generatePermanentId(title: string, type: string, existingIds: Set<string>): string {
    const baseId = `${title.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')}-${type}`;
    if (!existingIds.has(baseId)) return baseId;
    let counter = 2;
    let candidate = `${baseId}-${counter}`;
    while (existingIds.has(candidate)) {
        counter++;
        candidate = `${baseId}-${counter}`;
    }
    return candidate;
}

export async function weavePlan(
    input: WeavePlanInput,
    deps: WeavePlanDeps
): Promise<{ id: string; filePath: string; autoFinalizedDesign: boolean }> {
    const weave = await deps.loadWeave(deps.loomRoot, input.weaveId);
    const primaryDesign = weave.designs[0];
    
    let design = primaryDesign;
    let autoFinalizedDesign = false;
    
    // If no design exists, create one (zero‑friction)
    if (!design) {
        const designTitle = `${input.weaveId} Design`;
        const weavePath = path.join(deps.loomRoot, 'weaves', input.weaveId);
        
        const existingIds = new Set<string>();
        const entries = await deps.fs.readdir(weavePath);
        for (const entry of entries) {
            if (entry.endsWith('.md')) {
                existingIds.add(entry.replace('.md', ''));
            }
        }
        
        const designId = generatePermanentId(designTitle, 'design', existingIds);
        const frontmatter = createBaseFrontmatter('design', designId, designTitle, null);
        (frontmatter as any).role = 'primary';
        
        const content = generateDesignBody(designTitle, 'User');
        
        const designDoc: DesignDoc = {
            ...frontmatter,
            content,
        } as DesignDoc;
        
        const designPath = path.join(weavePath, `${designId}.md`);
        await deps.saveDoc(designDoc, designPath);
        
        design = designDoc;
        autoFinalizedDesign = true;
    }
    
    if (design && design.status !== 'done') {
        const updatedDesign: DesignDoc = {
            ...design,
            status: 'done',
            updated: new Date().toISOString().split('T')[0],
        };
        
        const designPath = (design as any)._path || path.join(deps.loomRoot, 'weaves', input.weaveId, `${design.id}.md`);
        await deps.saveDoc(updatedDesign, designPath);
        
        design = updatedDesign;
        autoFinalizedDesign = true;
    }
    
    const planTitle = input.title || `${input.weaveId} Plan`;
    const existingPlanIds = weave.plans?.map((p: any) => p.id) || [];
    const planId = generatePlanId(input.weaveId, existingPlanIds);
    
    const baseFrontmatter = createBaseFrontmatter('plan', planId, planTitle, design?.id || null);
    
    const doc: PlanDoc = {
        ...baseFrontmatter,
        type: 'plan',
        status: 'draft',
        design_version: design?.version || 1,
        target_version: (design as any)?.target_release || '0.1.0',
        steps: [],
        content: generatePlanBody(planTitle, input.goal),
    } as PlanDoc;
    
    const weavePath = path.join(deps.loomRoot, 'weaves', input.weaveId);
    const plansDir = path.join(weavePath, 'plans');
    await deps.fs.ensureDir(plansDir);
    
    const filePath = path.join(plansDir, `${planId}.md`);
    await deps.saveDoc(doc, filePath);
    
    return { id: planId, filePath, autoFinalizedDesign };
}
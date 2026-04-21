import { Weave, WeaveStatus, WeavePhase } from './entities/weave';
import { PlanDoc } from './entities/plan';
import { DesignDoc } from './entities/design';

export function getWeaveStatus(weave: Weave): WeaveStatus {
    const plans = weave.plans;
    
    // 1. Implementing wins over everything
    if (plans.some(p => p.status === 'implementing')) {
        return 'IMPLEMENTING';
    }
    
    // 2. All documents done -> weave done (must have at least one plan)
    if (plans.length > 0 && weave.allDocs.every(d => d.status === 'done')) {
        return 'DONE';
    }
    
    // 3. Any plan active or draft?
    if (plans.some(p => p.status === 'active' || p.status === 'draft')) {
        return 'ACTIVE';
    }
    
    // 4. Any plan blocked?
    if (plans.some(p => p.status === 'blocked')) {
        return 'BLOCKED';
    }
    
    // 5. Fallback
    return 'ACTIVE';
}

export function getWeavePhase(weave: Weave): WeavePhase {
    const plans = weave.plans;
    
    if (plans.some(p => p.status === 'implementing' || p.status === 'done')) {
        return 'implementing';
    }
    if (plans.length > 0) {
        return 'planning';
    }
    if (weave.designs.length > 0) {
        return 'designing';
    }
    return 'ideating';
}

export function isPlanStale(plan: PlanDoc, design: DesignDoc): boolean {
    return plan.design_version < design.version;
}

export function getStalePlans(weave: Weave): PlanDoc[] {
    // Staleness is checked per plan against its parent design
    return weave.plans.filter(p => {
        const parentDesign = weave.designs.find(d => d.id === p.parent_id);
        return parentDesign ? isPlanStale(p, parentDesign) : false;
    });
}
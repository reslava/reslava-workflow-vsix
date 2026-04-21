import { Weave } from '../entities/weave';
import { WeaveStatus } from '../entities/weave';
import { getWeaveStatus, getWeavePhase } from '../derived';

/**
 * Filters an array of weaves by their derived status.
 */
export function filterWeavesByStatus(weaves: Weave[], statuses: WeaveStatus[]): Weave[] {
    return weaves.filter(w => statuses.includes(getWeaveStatus(w)));
}

/**
 * Filters an array of weaves by their derived phase.
 */
export function filterWeavesByPhase(weaves: Weave[], phases: string[]): Weave[] {
    return weaves.filter(w => phases.includes(getWeavePhase(w)));
}

/**
 * Filters an array of weaves by a pattern matched against their ID.
 */
export function filterWeavesById(weaves: Weave[], pattern: string): Weave[] {
    const regex = new RegExp(pattern, 'i');
    return weaves.filter(w => regex.test(w.id));
}
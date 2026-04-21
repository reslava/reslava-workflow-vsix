import { loadWeave } from '../../fs/dist';
import { saveWeave } from '../../fs/dist';
import { applyEvent } from '../../core/dist/applyEvent';
import { WorkflowEvent } from '../../core/dist/events/workflowEvent';
import { Weave } from '../../core/dist/entities/weave';

export interface RunEventDeps {
    loadWeave: (loomRoot: string, weaveId: string) => Promise<Weave>;
    saveWeave: (loomRoot: string, weave: Weave) => Promise<void>;
    loomRoot: string;
}

export async function runEvent(
    weaveId: string,
    event: WorkflowEvent,
    deps: RunEventDeps
): Promise<Weave> {
    const weave = await deps.loadWeave(deps.loomRoot, weaveId);
    const updatedWeave = applyEvent(weave, event);
    await deps.saveWeave(deps.loomRoot, updatedWeave);
    return updatedWeave;
}
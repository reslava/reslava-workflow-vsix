import { loadThread, saveThread } from '../../fs/dist';
import { applyEvent, WorkflowEvent, Thread } from '../../core/dist';

export interface RunEventDeps {
    loadThread: typeof loadThread;
    saveThread: typeof saveThread;
}

export async function runEvent(
    threadId: string,
    event: WorkflowEvent,
    deps: RunEventDeps
): Promise<Thread> {
    const thread = await deps.loadThread(threadId);
    const updatedThread = applyEvent(thread, event);
    await deps.saveThread(updatedThread);
    return updatedThread;
}
import { findDocumentById, loadDoc } from '../../../fs/dist';
import { handleThreadContextResource } from '../resources/threadContext';

export const promptDef = {
    name: 'do-next-step',
    description: 'Load plan and thread context, return an instruction to implement the next incomplete step.',
    arguments: [
        { name: 'planId', description: 'Plan ID (e.g. "my-weave-plan-001")', required: true },
    ],
};

export async function handle(root: string, args: Record<string, string | undefined>) {
    const planId = args['planId'];
    if (!planId) throw new Error('planId is required');

    const filePath = await findDocumentById(root, planId);
    if (!filePath) throw new Error(`Plan not found: ${planId}`);

    const plan = await loadDoc(filePath);
    if (plan.type !== 'plan') throw new Error(`Document ${planId} is not a plan`);

    // Extract weaveId/threadId from file path: .../loom/{weaveId}/{threadId}/plans/{planId}.md
    const normalised = filePath.replace(/\\/g, '/');
    const loomIdx = normalised.lastIndexOf('/loom/');
    const afterLoom = loomIdx >= 0 ? normalised.slice(loomIdx + 6) : '';
    const segments = afterLoom.split('/');
    const weaveId = segments[0];
    const threadId = segments[1];

    // Find first incomplete step
    const steps: Array<{ order?: number; description?: string; done?: boolean }> =
        (plan as any).steps ?? [];
    const nextStep = steps.find(s => !s.done);

    const messages: Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }> = [];

    // Load thread context if path parsed cleanly
    if (weaveId && threadId && threadId !== 'plans') {
        try {
            const ctx = await handleThreadContextResource(root, `loom://thread-context/${weaveId}/${threadId}`);
            messages.push({ role: 'user', content: { type: 'text', text: ctx.contents[0].text } });
        } catch { /* thread context is best-effort */ }
    }

    messages.push({
        role: 'user',
        content: { type: 'text', text: `Plan: ${planId}\n\n${(plan as any).content ?? ''}` },
    });

    const instruction = nextStep
        ? [
            `Implement step ${nextStep.order ?? '?'}: ${nextStep.description}`,
            '',
            `After completing this step, call loom_complete_step with planId="${planId}" and stepNumber=${nextStep.order}.`,
        ].join('\n')
        : `All steps are complete in plan ${planId}. You may close it using loom_close_plan.`;

    messages.push({ role: 'user', content: { type: 'text', text: instruction } });

    return {
        description: nextStep
            ? `Implement step ${nextStep.order} of ${planId}: ${nextStep.description}`
            : `All steps complete in ${planId}`,
        messages,
    };
}

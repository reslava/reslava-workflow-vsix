import chalk from 'chalk';
import { runEvent } from '../../../fs/dist/runEvent';
import { loadThread } from '../../../fs/dist/loadThread';

export async function completeStepCommand(planId: string, options: { step?: string }): Promise<void> {
  try {
    const threadId = planId.split('-plan-')[0];
    if (!threadId) {
      throw new Error(`Invalid plan ID format. Expected "{threadId}-plan-###", got "${planId}"`);
    }

    const step = options.step ? parseInt(options.step, 10) : undefined;
    if (step === undefined || isNaN(step)) {
      throw new Error('Step number is required. Use --step <n>');
    }

    const thread = await loadThread(threadId);
    const plan = thread.plans.find(p => p.id === planId);
    
    if (!plan) {
      throw new Error(`Plan '${planId}' not found in thread '${threadId}'`);
    }

    const stepIndex = step - 1;
    const beforeStep = plan.steps[stepIndex];

    await runEvent(threadId, { type: 'COMPLETE_STEP', planId, stepIndex } as any);

    // Reload and check
    const afterThread = await loadThread(threadId);
    const afterPlan = afterThread.plans.find(p => p.id === planId);
    const afterStep = afterPlan?.steps[stepIndex];    

    // ... rest of function ...
  } catch (e: any) {
    console.error(chalk.red(`❌ Failed to complete step: ${e.message}`));
    process.exit(1);
  }
}
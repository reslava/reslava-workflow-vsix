import chalk from 'chalk';
import { runEvent } from '../../../fs/dist/runEvent';
import { loadThread } from '../../../fs/dist/loadThread';

export async function startPlanCommand(planId: string): Promise<void> {
  try {
    const threadId = planId.split('-plan-')[0];
    if (!threadId) {
      throw new Error(`Invalid plan ID format. Expected "{threadId}-plan-###", got "${planId}"`);
    }

    const thread = await loadThread(threadId);
    const plan = thread.plans.find(p => p.id === planId);
    
    if (!plan) {
      throw new Error(`Plan '${planId}' not found in thread '${threadId}'`);
    }

    // If plan is still draft, activate it first
    if (plan.status === 'draft') {
      await runEvent(threadId, { type: 'ACTIVATE_PLAN', planId } as any);      
    }

    // Now start implementing
    await runEvent(threadId, { type: 'START_IMPLEMENTING_PLAN', planId } as any);
  } catch (e: any) {
    console.error(chalk.red(`❌ Failed to start plan: ${e.message}`));
    process.exit(1);
  }
}
import chalk from 'chalk';
import { loadThread } from '../../../fs/dist/loadThread';
import { getThreadStatus, getThreadPhase } from '../../../core/dist/derived';
import { getActiveLoomRoot } from '../../../fs/dist/utils';
import { buildLinkIndex } from '../../../fs/dist/buildLinkIndex';
import { LinkIndex } from '../../../core/dist/linkIndex';
import { PlanDoc } from '../../../core/dist/types';
import * as fs from 'fs-extra';
import * as path from 'path';

function colorStatus(status: string): string {
    switch (status) {
        case 'DONE': return chalk.green(status);
        case 'IMPLEMENTING': return chalk.blue(status);
        case 'ACTIVE': return chalk.yellow(status);
        case 'CANCELLED': return chalk.red(status);
        default: return status;
    }
}

/**
 * Evaluates whether a step is currently blocked.
 */
function isStepBlocked(
    step: { order: number; blockedBy: string[] },
    plan: PlanDoc,
    index: LinkIndex
): boolean {
    if (!step.blockedBy || step.blockedBy.length === 0) return false;

    for (const blocker of step.blockedBy) {
        // Internal step dependency: "Step N"
        const stepMatch = blocker.match(/^Step\s+(\d+)$/i);
        if (stepMatch) {
            const stepNum = parseInt(stepMatch[1], 10);
            const targetStep = plan.steps?.find(s => s.order === stepNum);
            if (targetStep && !targetStep.done) return true;
            continue;
        }

        // Cross‑plan dependency: "plan-id"
        if (blocker.includes('-plan-')) {
            const planEntry = index.documents.get(blocker);
            if (!planEntry) return true; // Plan doesn't exist
            if (!planEntry.exists) return true; // Plan file missing
            // Cannot check status without loading the plan; assume it's blocking if not done
            // In production, we would load the plan doc to check its status
            return true;
        }
    }

    return false;
}

/**
 * Finds the next unblocked, undone step in a plan.
 */
function findNextStep(
    plan: PlanDoc,
    index: LinkIndex
): { order: number; description: string } | null {
    if (!plan.steps) return null;

    for (const step of plan.steps) {
        if (step.done) continue;
        if (!isStepBlocked(step, plan, index)) {
            return { order: step.order, description: step.description };
        }
    }

    return null;
}

/**
 * Displays detailed plan information with blocker resolution.
 */
function displayPlanDetails(plan: PlanDoc, index: LinkIndex): void {
    const steps = plan.steps || [];
    const doneCount = steps.filter(s => s.done).length;

    console.log(`\n📋 Active Plan: ${plan.id}`);
    console.log(`   Status: ${plan.status}`);
    console.log(`   Progress: ${doneCount}/${steps.length} steps done\n`);
    console.log('   Steps:');

    for (const step of steps) {
        let symbol: string;
        if (step.done) {
            symbol = '✅';
        } else if (isStepBlocked(step, plan, index)) {
            symbol = '🔒';
        } else {
            symbol = '🔳';
        }

        console.log(`   ${symbol} ${step.order}. ${step.description}`);
        
        if (!step.done && isStepBlocked(step, plan, index)) {
            const blockers = step.blockedBy.join(', ');
            console.log(`      ⚠️ Blocked by: ${blockers}`);
        }
    }

    const nextStep = findNextStep(plan, index);
    if (nextStep) {
        console.log(chalk.gray(`\n   💡 Next step: Step ${nextStep.order} — ${nextStep.description}`));
    } else {
        const blockedSteps = steps.filter(s => !s.done && isStepBlocked(s, plan, index));
        if (blockedSteps.length > 0) {
            console.log(chalk.yellow(`\n   ⚠️ All remaining steps are blocked.`));
        } else if (steps.every(s => s.done)) {
            console.log(chalk.green(`\n   🎉 All steps complete!`));
        }
    }
}

export async function statusCommand(
    threadId?: string,
    options?: { verbose?: boolean; json?: boolean; tokens?: boolean }
): Promise<void> {
    const loomRoot = getActiveLoomRoot();
    const threadsDir = path.join(loomRoot, 'threads');

    // Build the link index once
    const index = await buildLinkIndex();

    if (threadId) {
        try {
            const thread = await loadThread(threadId);
            const status = getThreadStatus(thread);
            const phase = getThreadPhase(thread);

            if (options?.json) {
                console.log(JSON.stringify({
                    id: thread.id,
                    status,
                    phase,
                    designVersion: thread.design.version,
                    planCount: thread.plans.length,
                    plans: thread.plans.map(p => ({
                        id: p.id,
                        status: p.status,
                        staled: p.staled || false,
                        stepsDone: p.steps?.filter(s => s.done).length || 0,
                        stepsTotal: p.steps?.length || 0,
                    })),
                }, null, 2));
                return;
            }

            console.log(chalk.bold(`\n🧵 Thread: ${thread.id}`));
            console.log(`   Status: ${colorStatus(status)}`);
            console.log(`   Phase:  ${phase}`);
            console.log(`   Design: ${thread.design.title} (v${thread.design.version})`);
            console.log(`   Plans:  ${thread.plans.length} (${thread.plans.filter(p => p.status === 'done').length} done)`);

            const activePlan = thread.plans.find(
                p => p.status === 'implementing' || p.status === 'active'
            );

            if (activePlan && options?.verbose) {
                displayPlanDetails(activePlan, index);
            }

            if (activePlan && !options?.verbose) {
                const nextStep = findNextStep(activePlan, index);
                if (nextStep) {
                    console.log(chalk.gray(`\n   💡 Next step: Step ${nextStep.order} — ${nextStep.description}`));
                }
            }
        } catch (e: any) {
            console.error(chalk.red(`❌ Thread '${threadId}' not found or invalid: ${e.message}`));
            process.exit(1);
        }
    } else {
        if (!fs.existsSync(threadsDir)) {
            console.log(chalk.yellow('No threads found.'));
            console.log(chalk.gray(`  Create a thread with 'loom weave idea "Your Idea"'`));
            return;
        }

        const entries = await fs.readdir(threadsDir);
        const threads: any[] = [];

        for (const entry of entries) {
            const threadPath = path.join(threadsDir, entry);
            const stat = await fs.stat(threadPath);
            if (stat.isDirectory() && entry !== '_archive') {
                try {
                    const thread = await loadThread(entry);
                    threads.push({
                        id: entry,
                        status: getThreadStatus(thread),
                        phase: getThreadPhase(thread),
                    });
                } catch {
                    threads.push({ id: entry, status: 'INVALID', phase: 'unknown' });
                }
            }
        }

        if (options?.json) {
            console.log(JSON.stringify(threads, null, 2));
            return;
        }

        if (threads.length === 0) {
            console.log(chalk.yellow('No threads found.'));
            return;
        }

        console.log(chalk.bold('\n🧵 Threads\n'));
        for (const t of threads) {
            console.log(`  ${t.id.padEnd(25)} ${colorStatus(t.status)}`);
        }
    }
}
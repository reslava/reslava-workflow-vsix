import chalk from 'chalk';
import { runEvent } from '../../../fs/dist/runEvent';

export async function refineCommand(threadId: string): Promise<void> {
  try {
    await runEvent(threadId, { type: 'REFINE_DESIGN' });
    console.log(chalk.green(`🧵 REFINE_DESIGN applied to thread '${threadId}'`));
    console.log(chalk.gray(`   Design version incremented. Dependent plans marked stale.`));
  } catch (e: any) {
    console.error(chalk.red(`❌ Failed to refine design: ${e.message}`));
    process.exit(1);
  }
}
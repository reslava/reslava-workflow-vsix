import chalk from 'chalk';
import { summarise } from '../../../app/dist/summarise';
import { loadWeave } from '../../../fs/dist';
import { getActiveLoomRoot } from '../../../fs/dist';
import * as fs from 'fs-extra';

export async function summariseCommand(weaveId: string, options: { force?: boolean }): Promise<void> {
    try {
        const loomRoot = getActiveLoomRoot();
        const result = await summarise(
            { weaveId, force: options.force },
            { loadWeave, getActiveLoomRoot, fs, loomRoot }
        );

        if (result.generated) {
            console.log(chalk.green(`🧵 Context summary generated at ${result.ctxPath}`));
        } else {
            console.log(chalk.yellow(`⚠️  Context summary is already up to date`));
            console.log(chalk.gray(`   Use --force to regenerate.`));
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ Failed to summarise context: ${e.message}`));
        process.exit(1);
    }
}
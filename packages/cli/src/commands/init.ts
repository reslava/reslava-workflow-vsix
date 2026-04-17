import chalk from 'chalk';
import { initLoom } from '../../../app/dist';
import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../../core/dist';

export async function initCommand(options: { force?: boolean }): Promise<void> {
    try {
        const registry = new ConfigRegistry();
        const result = await initLoom({ force: options.force }, { fs, registry });
        console.log(chalk.green(`🧵 Loom initialized at ${result.path}`));
        console.log(chalk.green(`   Active loom: ${result.name}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
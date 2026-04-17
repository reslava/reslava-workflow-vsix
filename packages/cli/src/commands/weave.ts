import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { getActiveLoomRoot } from '../../../fs/dist';
import { generateTempId, toKebabCaseId, createBaseFrontmatter, serializeFrontmatter, generateIdeaBody } from '../../../core/dist';

export async function weaveIdeaCommand(title: string, options: { thread?: string }): Promise<void> {
    const loomRoot = getActiveLoomRoot();
    const threadsDir = path.join(loomRoot, 'threads');
    const threadName = options.thread || toKebabCaseId(title);
    const threadPath = path.join(threadsDir, threadName);

    await fs.ensureDir(threadPath);

    const tempId = generateTempId('idea');
    const frontmatter = createBaseFrontmatter('idea', tempId, title);

    // Use the body generator instead of hardcoded template
    const content = generateIdeaBody(title);

    const frontmatterYaml = serializeFrontmatter(frontmatter);
    const output = `${frontmatterYaml}\n${content}`;
    const filePath = path.join(threadPath, `${tempId}.md`);

    await fs.outputFile(filePath, output);

    console.log(chalk.green(`🧵 Idea woven at ${filePath}`));
    console.log(chalk.gray(`   Temporary ID: ${tempId}`));
    console.log(chalk.gray(`   Run 'loom finalize ${tempId}' when the title is final.`));
}
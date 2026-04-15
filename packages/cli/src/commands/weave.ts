import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { getActiveLoomRoot } from '../../../fs/dist/utils';
import { generateTempId, toKebabCaseId } from '../../../core/dist/idUtils';
import { createBaseFrontmatter, serializeFrontmatter } from '../../../core/dist/frontmatterUtils';

export async function weaveIdeaCommand(title: string, options: { thread?: string }): Promise<void> {
    const loomRoot = getActiveLoomRoot();
    const threadsDir = path.join(loomRoot, 'threads');
    const threadName = options.thread || toKebabCaseId(title);
    const threadPath = path.join(threadsDir, threadName);

    await fs.ensureDir(threadPath);

    // Generate temporary ID for the draft idea
    const tempId = generateTempId('idea');

    // Create frontmatter using the centralized utility
    const frontmatter = createBaseFrontmatter('idea', tempId, title);

    const content = `# ${title}

## Problem
<!-- What pain or gap does this idea address? -->

## Idea
<!-- The core concept in 2-3 sentences. -->

## Why now
<!-- What makes this worth pursuing at this point? -->

## Open questions
<!-- What needs to be answered before committing to a design? -->

## Next step
<!-- design | spike | discard -->
`;

    // Serialize using the canonical serializer
    const frontmatterYaml = serializeFrontmatter(frontmatter);
    const output = `${frontmatterYaml}\n${content}`;
    const filePath = path.join(threadPath, `${tempId}.md`);

    await fs.writeFile(filePath, output);

    console.log(chalk.green(`🧵 Idea woven at ${filePath}`));
    console.log(chalk.gray(`   Temporary ID: ${tempId}`));
    console.log(chalk.gray(`   Run 'loom finalize ${tempId}' when the title is final.`));
}
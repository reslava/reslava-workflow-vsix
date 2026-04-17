import * as fs from 'fs-extra';
import * as path from 'path';
import { getActiveLoomRoot } from '../../fs/dist';
import { generateTempId, toKebabCaseId } from '../../core/dist';
import { createBaseFrontmatter, serializeFrontmatter } from '../../core/dist';
import { generateIdeaBody } from '../../core/dist';

export interface WeaveIdeaInput {
    title: string;
    thread?: string;
}

export interface WeaveIdeaDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    fs: typeof fs;
}

export async function weaveIdea(
    input: WeaveIdeaInput,
    deps: WeaveIdeaDeps
): Promise<{ tempId: string; filePath: string }> {
    const loomRoot = deps.getActiveLoomRoot();
    const threadsDir = path.join(loomRoot, 'threads');
    const threadName = input.thread || toKebabCaseId(input.title);
    const threadPath = path.join(threadsDir, threadName);

    await deps.fs.ensureDir(threadPath);

    const tempId = generateTempId('idea');
    const frontmatter = createBaseFrontmatter('idea', tempId, input.title);
    const content = generateIdeaBody(input.title);

    const frontmatterYaml = serializeFrontmatter(frontmatter);
    const output = `${frontmatterYaml}\n${content}`;
    const filePath = path.join(threadPath, `${tempId}.md`);

    await deps.fs.outputFile(filePath, output);

    return { tempId, filePath };
}
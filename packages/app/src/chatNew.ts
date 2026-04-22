import * as fs from 'fs-extra';
import * as path from 'path';
import { saveDoc } from '../../fs/dist';
import { generateChatId, createBaseFrontmatter } from '../../core/dist';
import { ChatDoc } from '../../core/dist';

export interface ChatNewInput {
    weaveId: string;
    title?: string;
}

export interface ChatNewDeps {
    saveDoc: typeof saveDoc;
    fs: typeof fs;
    loomRoot: string;
}

export async function chatNew(
    input: ChatNewInput,
    deps: ChatNewDeps
): Promise<{ id: string; filePath: string }> {
    const weavePath = path.join(deps.loomRoot, 'weaves', input.weaveId);
    await deps.fs.ensureDir(weavePath);

    const existingFiles = await deps.fs.readdir(weavePath).catch(() => [] as string[]);
    const existingChatIds = existingFiles
        .filter(f => f.match(/-chat-\d+\.md$/))
        .map(f => f.replace(/\.md$/, ''));

    const chatId = generateChatId(input.weaveId, existingChatIds);
    const title = input.title || `${input.weaveId} Chat`;

    const frontmatter = createBaseFrontmatter('chat', chatId, title, input.weaveId);
    const doc: ChatDoc = {
        ...frontmatter,
        type: 'chat',
        status: 'active',
        content: '# CHAT\n\n## Rafa:\n',
    };

    const filePath = path.join(weavePath, `${chatId}.md`);
    await deps.saveDoc(doc, filePath);

    return { id: chatId, filePath };
}

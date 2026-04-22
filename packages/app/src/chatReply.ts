import * as path from 'path';
import { loadDoc, saveDoc } from '../../fs/dist';
import { AIClient, Message, ChatDoc } from '../../core/dist';

export interface ChatReplyInput {
    filePath: string;
}

export interface ChatReplyDeps {
    loadDoc: typeof loadDoc;
    saveDoc: typeof saveDoc;
    aiClient: AIClient;
}

const SYSTEM_PROMPT = `You are an AI assistant embedded in REslava Loom, a document-driven workflow system for AI-assisted development.
You are in Chat Mode: brainstorm, explore, and answer questions freely. Do not propose state changes unless explicitly asked.
Your response will be appended to the document as a new ## AI: block. Reply in plain Markdown without wrapping your answer in a code block.`;

function parseTurns(content: string): Message[] {
    const segments = content.split(/^## /m).slice(1);
    return segments
        .map(seg => {
            const lineEnd = seg.indexOf('\n');
            const header = lineEnd === -1 ? seg : seg.slice(0, lineEnd);
            const body = lineEnd === -1 ? '' : seg.slice(lineEnd + 1).trim();
            const role: 'user' | 'assistant' = header.startsWith('AI') ? 'assistant' : 'user';
            return { role, content: body };
        })
        .filter(m => m.content.length > 0);
}

export async function chatReply(
    input: ChatReplyInput,
    deps: ChatReplyDeps
): Promise<{ appended: string }> {
    const doc = await deps.loadDoc(input.filePath) as ChatDoc;

    const turns = parseTurns(doc.content);
    if (turns.length === 0) {
        throw new Error('No conversation turns found in chat document. Write a message under ## Rafa: first.');
    }

    const messages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...turns,
    ];

    const reply = await deps.aiClient.complete(messages);
    const appended = `\n\n## AI:\n${reply}`;
    const updatedContent = doc.content.trimEnd() + appended;

    await deps.saveDoc({ ...doc, content: updatedContent }, input.filePath);

    return { appended: reply };
}

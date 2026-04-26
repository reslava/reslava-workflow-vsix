export const promptDef = {
    name: 'weave-idea',
    description: 'Return a structured prompt for drafting a Loom idea document from a user description. The agent calls loom_create_idea then loom_update_doc with the result.',
    arguments: [
        { name: 'weaveId', description: 'Target weave ID', required: true },
        { name: 'threadId', description: 'Target thread ID (optional)', required: false },
        { name: 'prompt', description: 'User description of the idea to draft', required: true },
    ],
};

export async function handle(_root: string, args: Record<string, string | undefined>) {
    const weaveId = args['weaveId'];
    const threadId = args['threadId'];
    const prompt = args['prompt'];
    if (!weaveId) throw new Error('weaveId is required');
    if (!prompt) throw new Error('prompt is required');

    const target = threadId ? `weave "${weaveId}", thread "${threadId}"` : `weave "${weaveId}"`;
    const createCall = threadId
        ? `loom_create_idea with weaveId="${weaveId}" threadId="${threadId}" and a suitable title`
        : `loom_create_idea with weaveId="${weaveId}" and a suitable title`;

    return {
        description: `Draft a Loom idea for ${target}`,
        messages: [
            {
                role: 'user' as const,
                content: {
                    type: 'text' as const,
                    text: [
                        `You are drafting a Loom idea document for ${target}.`,
                        '',
                        `User description: ${prompt}`,
                        '',
                        'A Loom idea document should:',
                        '- Start with a concise problem statement (what problem are we solving?)',
                        '- Explain the proposed concept at a high level',
                        '- List key questions or open considerations',
                        '- Be written in plain markdown, no frontmatter',
                        '',
                        `After drafting the content, call ${createCall}.`,
                        'Then call loom_update_doc with the generated markdown body.',
                    ].join('\n'),
                },
            },
        ],
    };
}

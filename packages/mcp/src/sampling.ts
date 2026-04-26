import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SamplingMessage } from '@modelcontextprotocol/sdk/types.js';

export { SamplingMessage };

export class SamplingUnsupportedError extends Error {
    constructor() {
        super('MCP client does not support sampling (sampling/createMessage returned MethodNotFound)');
        this.name = 'SamplingUnsupportedError';
    }
}

export async function requestSampling(
    server: Server,
    messages: SamplingMessage[],
    systemPrompt?: string,
    maxTokens = 4096
): Promise<string> {
    try {
        const result = await server.createMessage({ messages, systemPrompt, maxTokens });
        if (result.content.type !== 'text') {
            throw new Error(`Unexpected sampling result content type: ${result.content.type}`);
        }
        return result.content.text;
    } catch (error: any) {
        // MCP spec: MethodNotFound = -32601
        if (
            error?.code === -32601 ||
            error?.message?.includes('Method not found') ||
            error?.message?.includes('MethodNotFound')
        ) {
            throw new SamplingUnsupportedError();
        }
        throw error;
    }
}

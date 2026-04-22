import { AIClient, Message } from '@reslava-loom/core/dist';

interface CompletionResponse {
    choices: Array<{ message: { content: string } }>;
}

export class OpenAIClient implements AIClient {
    constructor(
        private readonly apiKey: string,
        private readonly model: string,
        private readonly baseUrl: string,
    ) {}

    async complete(messages: Message[]): Promise<string> {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({ model: this.model, messages }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`AI API error ${response.status}: ${text}`);
        }

        const data = await response.json() as CompletionResponse;
        return data.choices[0]?.message?.content ?? '';
    }
}

export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AIClient {
    complete(messages: Message[]): Promise<string>;
}

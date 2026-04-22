import { BaseDoc } from './base';

export type ChatStatus = 'active' | 'archived';

export interface ChatDoc extends BaseDoc<ChatStatus> {
    type: 'chat';
    status: ChatStatus;
}

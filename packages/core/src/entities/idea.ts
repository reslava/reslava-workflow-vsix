import { BaseDoc } from './base';

export type IdeaStatus = 'draft' | 'active' | 'done' | 'cancelled';

export interface IdeaDoc extends BaseDoc<IdeaStatus> {
    type: 'idea';
    status: IdeaStatus;
}
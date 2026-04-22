import { IdeaDoc } from './idea';
import { DesignDoc } from './design';
import { PlanDoc } from './plan';
import { CtxDoc } from './ctx';
import { ChatDoc } from './chat';
import { Document } from './document';

export type WeaveStatus = 'CANCELLED' | 'IMPLEMENTING' | 'ACTIVE' | 'DONE' | 'BLOCKED';
export type WeavePhase = 'ideating' | 'designing' | 'planning' | 'implementing';

export interface Weave {
    id: string;
    ideas: IdeaDoc[];
    designs: DesignDoc[];
    plans: PlanDoc[];
    contexts: CtxDoc[];
    chats: ChatDoc[];
    allDocs: Document[];
}
import { IdeaDoc } from './idea';
import { DesignDoc } from './design';
import { PlanDoc } from './plan';
import { CtxDoc } from './ctx';
import { ChatDoc } from './chat';

export type Document = IdeaDoc | DesignDoc | PlanDoc | CtxDoc | ChatDoc;

export type DocumentStatus = IdeaDoc['status'] | DesignDoc['status'] | PlanDoc['status'] | CtxDoc['status'] | ChatDoc['status'];
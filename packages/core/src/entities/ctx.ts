import { BaseDoc } from './base';

export type CtxStatus = 'draft' | 'active' | 'done' | 'cancelled';

export interface CtxDoc extends BaseDoc<CtxStatus> {
    type: 'ctx';
    status: CtxStatus;
    source_version?: number;
}
// ============================================================================
// Base Document
// ============================================================================
export { BaseDoc, DocumentType } from './entities/base';

// ============================================================================
// Entities
// ============================================================================
export { IdeaDoc, IdeaStatus } from './entities/idea';
export { DesignDoc, DesignStatus } from './entities/design';
export { PlanDoc, PlanStatus, PlanStep } from './entities/plan';
export { CtxDoc, CtxStatus } from './entities/ctx';
export { Thread } from './entities/thread';

// ============================================================================
// Events
// ============================================================================
export { IdeaEvent } from './events/ideaEvents';
export { DesignEvent } from './events/designEvents';
export { PlanEvent } from './events/planEvents';

// ============================================================================
// Reducers
// ============================================================================
export { ideaReducer } from './reducers/ideaReducer';
export { designReducer } from './reducers/designReducer';
export { planReducer } from './reducers/planReducer';

// ============================================================================
// Core Utilities
// ============================================================================
export { applyEvent } from './applyEvent';
export { getThreadStatus, getThreadPhase, isPlanStale, getStalePlans } from './derived';
export { createBaseFrontmatter, serializeFrontmatter } from './frontmatterUtils';
export { toKebabCaseId, ensureUniqueId, generateTempId, generatePermanentId } from './idUtils';
export { ConfigRegistry } from './registry';
export { parseStepsTable, generateStepsTable, updateStepsTableInContent } from './planTableUtils';
export { createEmptyIndex, LinkIndex, DocumentEntry, StepBlocker } from './linkIndex';

// ============================================================================
// Types (Shared)
// ============================================================================
export { Document, DocumentStatus, WorkflowEvent, DiagnosticEvent, ThreadStatus, ThreadPhase } from './types';
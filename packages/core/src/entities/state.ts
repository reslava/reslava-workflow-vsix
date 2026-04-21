import { Weave } from './weave';
import { LinkIndex } from '../linkIndex';

export type LoomMode = 'mono' | 'multi';

export interface LoomState {
    /** The absolute path to the active loom root. */
    loomRoot: string;
    
    /** The operational mode: mono‑loom (local) or multi‑loom (global registry). */
    mode: LoomMode;
    
    /** The name of the active loom (for multi‑loom) or '(local)' for mono‑loom. */
    loomName: string;
    
    /** All weaves in the active loom. */
    weaves: Weave[];
    
    /** The link index built during state generation. */
    index: LinkIndex;
    
    /** Timestamp when this state was generated. */
    generatedAt: string;
    
    /** Summary statistics. */
    summary: {
        totalWeaves: number;
        activeWeaves: number;
        implementingWeaves: number;
        doneWeaves: number;
        totalPlans: number;
        stalePlans: number;
        blockedSteps: number;
    };
}
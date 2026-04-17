import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../core/dist';

export interface CurrentLoomInfo {
    /** The name of the active loom, or null if none is set. */
    name: string | null;
    /** The absolute filesystem path to the active loom, or null if none is set. */
    path: string | null;
    /** Whether the active loom directory exists on disk. */
    exists: boolean;
}

export interface CurrentDeps {
    /** Filesystem utilities. */
    fs: typeof fs;
    /** Global registry of looms. */
    registry: ConfigRegistry;
}

/**
 * Retrieves information about the currently active loom.
 *
 * @param deps - Filesystem and registry dependencies.
 * @returns A promise resolving to the current loom information.
 */
export async function currentLoom(deps: CurrentDeps): Promise<CurrentLoomInfo> {
    const active = deps.registry.getActiveLoom();
    if (!active) {
        return { name: null, path: null, exists: false };
    }

    const looms = deps.registry.listLooms();
    const current = looms.find(l => l.path === active);
    const resolved = deps.registry.resolveLoomPath(active);
    
    return {
        name: current?.name || null,
        path: resolved,
        exists: deps.fs.existsSync(resolved),
    };
}
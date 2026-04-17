import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../core/dist';

export interface LoomListEntry {
    /** The name of the loom. */
    name: string;
    /** The absolute filesystem path to the loom. */
    path: string;
    /** Whether the loom directory exists on disk. */
    exists: boolean;
    /** Whether this is the currently active loom. */
    isActive: boolean;
}

export interface ListDeps {
    /** Filesystem utilities. */
    fs: typeof fs;
    /** Global registry of looms. */
    registry: ConfigRegistry;
}

/**
 * Lists all registered looms with their current status.
 *
 * @param deps - Filesystem and registry dependencies.
 * @returns A promise resolving to an array of loom entries.
 */
export async function listLooms(deps: ListDeps): Promise<LoomListEntry[]> {
    const looms = deps.registry.listLooms();
    const active = deps.registry.getActiveLoom();
    
    return looms.map(loom => {
        const resolved = deps.registry.resolveLoomPath(loom.path);
        return {
            name: loom.name,
            path: resolved,
            exists: deps.fs.existsSync(resolved),
            isActive: loom.path === active,
        };
    });
}
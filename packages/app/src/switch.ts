import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../core/dist';

export interface SwitchInput {
    /** The name of the loom to switch to. */
    name: string;
}

export interface SwitchDeps {
    /** Filesystem utilities. */
    fs: typeof fs;
    /** Global registry of looms. */
    registry: ConfigRegistry;
}

/**
 * Switches the active loom context to the named loom.
 *
 * @param input - The name of the target loom.
 * @param deps - Filesystem and registry dependencies.
 * @returns A promise resolving to the loom name and its absolute path.
 * @throws {Error} If the loom is not found or its path does not exist.
 */
export async function switchLoom(
    input: SwitchInput,
    deps: SwitchDeps
): Promise<{ name: string; path: string }> {
    const looms = deps.registry.listLooms();
    const target = looms.find(l => l.name === input.name);
    if (!target) {
        throw new Error(`Loom '${input.name}' not found.`);
    }

    const resolvedPath = deps.registry.resolveLoomPath(target.path);
    if (!deps.fs.existsSync(resolvedPath)) {
        throw new Error(`Loom path does not exist: ${resolvedPath}`);
    }

    deps.registry.setActiveLoom(input.name);
    return { name: input.name, path: resolvedPath };
}
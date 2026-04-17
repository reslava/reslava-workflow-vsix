import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { ConfigRegistry } from '../../core/dist';

export interface InitInput {
    force?: boolean;
}

export interface InitDeps {
    fs: typeof fs;
    registry: ConfigRegistry;
}

export async function initLoom(
    input: InitInput,
    deps: InitDeps
): Promise<{ path: string; name: string }> {
    const defaultPath = path.join(os.homedir(), 'looms', 'default');
    
    if (deps.fs.existsSync(defaultPath) && !input.force) {
        throw new Error(`Loom already exists at ${defaultPath}. Use --force to overwrite.`);
    }

    deps.fs.ensureDirSync(path.join(defaultPath, '.loom', 'templates'));
    deps.fs.ensureDirSync(path.join(defaultPath, '.loom', 'prompts'));
    deps.fs.ensureDirSync(path.join(defaultPath, '.loom', 'schemas'));
    deps.fs.ensureDirSync(path.join(defaultPath, '.loom', 'cache'));
    deps.fs.ensureDirSync(path.join(defaultPath, 'chats'));
    deps.fs.ensureDirSync(path.join(defaultPath, 'threads'));
    deps.fs.ensureDirSync(path.join(defaultPath, 'references'));

    try {
        deps.registry.addLoom('default', defaultPath);
    } catch (e: any) {
        if (!e.message.includes('already exists')) throw e;
    }
    deps.registry.setActiveLoom('default');

    return { path: defaultPath, name: 'default' };
}
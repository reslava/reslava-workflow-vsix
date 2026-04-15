import * as fs from 'fs-extra';
import * as path from 'path';
import yaml from 'js-yaml';
import { Document } from '../../core/dist/types';

export class FileWriteError extends Error {
  constructor(public filePath: string, originalError: Error) {
    super(`Failed to write ${filePath}: ${originalError.message}`);
    this.name = 'FileWriteError';
  }
}

export class FilePermissionError extends Error {
  constructor(public filePath: string) {
    super(`Permission denied writing to ${filePath}`);
    this.name = 'FilePermissionError';
  }
}

function generateStepsTable(steps: any[], originalContent: string): string {
  if (!steps.length) return originalContent;

  const header = '| Done | # | Step | Files touched | Blocked by |';
  const separator = '|---|---|---|---|---|';
  const rows = steps.map(s => {
    const done = s.done ? '✅' : '🔳';
    const files = s.files_touched?.length ? s.files_touched.join(', ') : '—';
    const blockers = s.blockedBy?.length ? s.blockedBy.join(', ') : '—';
    return `| ${done} | ${s.order} | ${s.description} | ${files} | ${blockers} |`;
  });

  const newTable = [header, separator, ...rows].join('\n');

  const stepsRegex = /# Steps\s*\n([\s\S]*?)(?=\n---|\n##|$)/i;
  if (stepsRegex.test(originalContent)) {
    return originalContent.replace(stepsRegex, `# Steps\n\n${newTable}`);
  }
  
  const goalRegex = /(# Goal\s*\n[\s\S]*?)(?=\n---|\n##|$)/i;
  if (goalRegex.test(originalContent)) {
    return originalContent.replace(goalRegex, `$1\n\n# Steps\n\n${newTable}`);
  }
  
  return `${originalContent}\n\n# Steps\n\n${newTable}`;
}

export async function saveDoc(doc: Document, filePath: string): Promise<void> {
  // Separate internal properties from frontmatter
  const { content, _path, steps, ...frontmatter } = doc as any;

  let bodyContent = content;
  if (doc.type === 'plan' && steps) {
    bodyContent = generateStepsTable(steps, content);
  }

  // Use js-yaml directly for precise control over array formatting
  const frontmatterStr = yaml.dump(frontmatter, {
    flowLevel: 1,
    lineWidth: -1,
    noRefs: true,
    replacer: (key: any, value: any) => {
      if (Array.isArray(value)) {
        // Force this array to be dumped in flow style
        return { value, flowLevel: 1 };
      }
      return value;
    },
  } as any);
  
  const output = `---\n${frontmatterStr}---\n\n${bodyContent}`;

  await fs.ensureDir(path.dirname(filePath));

  const tempPath = path.join(
    path.dirname(filePath),
    `.loom-tmp-${Date.now()}-${path.basename(filePath)}.tmp`
  );

  try {
    await fs.writeFile(tempPath, output, { mode: 0o644 });
    try {
      await fs.rename(tempPath, filePath);
    } catch (renameErr: any) {
      if (renameErr.code === 'EXDEV') {
        await fs.copyFile(tempPath, filePath);
        await fs.remove(tempPath);
      } else {
        throw renameErr;
      }
    }
  } catch (e: any) {
    await fs.remove(tempPath).catch(() => {});
    
    if (e.code === 'EACCES' || e.code === 'EPERM') {
      throw new FilePermissionError(filePath);
    }
    if (e.code === 'ENOSPC') {
      throw new FileWriteError(filePath, new Error('Disk full'));
    }
    throw new FileWriteError(filePath, e);
  }
}
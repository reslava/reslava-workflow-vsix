import matter from 'gray-matter';
import * as fs from 'fs-extra';
import { Document } from '../../core/dist/types';

export class FrontmatterParseError extends Error {
  constructor(
    public filePath: string,
    public rawFrontmatter: string,
    message: string
  ) {
    super(`Invalid frontmatter in ${filePath}: ${message}`);
    this.name = 'FrontmatterParseError';
  }
}

export async function loadDoc(filePath: string): Promise<Document> {
  const content = await fs.readFile(filePath, 'utf8');
  
  let parsed;
  try {
    parsed = matter(content);
  } catch (e) {
    throw new FrontmatterParseError(filePath, '', `YAML syntax error: ${(e as Error).message}`);
  }

  // Validate required fields
  const requiredFields = ['type', 'id', 'status', 'created', 'version'];
  for (const field of requiredFields) {
    if (parsed.data[field] === undefined) {
      throw new FrontmatterParseError(
        filePath,
        JSON.stringify(parsed.data),
        `Missing required field: ${field}`
      );
    }
  }

  const doc = {
    ...parsed.data,
    content: parsed.content,
    _path: filePath,
  } as Document;

  // Parse steps for plan documents
  if (doc.type === 'plan') {
    doc.steps = parseStepsTable(parsed.content);
  }

  return doc;
}

function parseStepsTable(content: string): any[] {
  const steps: any[] = [];
  
  // Find the steps section: from "# Steps" to the next "---" or "##" or end of file
  const stepsSectionMatch = content.match(/# Steps\s*\n([\s\S]*?)(?=\n---|\n##|$)/i);
  if (!stepsSectionMatch) {
    return steps;
  }
  
  const section = stepsSectionMatch[1];
  const lines = section.split('\n');
  
  // Find the table rows (lines with pipes, excluding the header separator)
  for (const line of lines) {
    // Skip lines that don't look like table rows
    if (!line.includes('|') || line.includes('|---')) {
      continue;
    }
    
    // Skip the header row if it contains "Done" and "Step"
    if (line.includes('Done') && line.includes('Step')) {
      continue;
    }
    
    const cols = line.split('|').map(c => c.trim()).filter(c => c !== '');
    if (cols.length < 4) continue;
    
    // Expected columns: Done, #, Step, Files touched, Blocked by
    const doneSymbol = cols[0];
    const order = parseInt(cols[1], 10);
    const description = cols[2];
    const filesTouched = cols[3] === '—' || cols[3] === '-' ? [] : cols[3].split(',').map(s => s.trim());
    const blockedByRaw = cols[4] || '—';
    
    const done = doneSymbol === '✅';
    const blockedBy = blockedByRaw === '—' || blockedByRaw === '-' ? [] : blockedByRaw.split(',').map(s => s.trim());
    
    if (!isNaN(order)) {
      steps.push({ order, description, done, files_touched: filesTouched, blockedBy });
    }
  }
  
  return steps;
}
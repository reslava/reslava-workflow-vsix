/**
 * Converts any string to a kebab-case ID.
 * Example: "Add Dark Mode!" -> "add-dark-mode"
 */
export function toKebabCaseId(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .trim()
        .replace(/\s+/g, '-')     // Replace spaces with hyphens
        .replace(/-+/g, '-');     // Collapse multiple hyphens
}

/**
 * Ensures the generated ID is unique within the existing set.
 * If the base ID already exists, appends a numeric suffix.
 */
export function ensureUniqueId(baseId: string, existingIds: Set<string>): string {
    if (!existingIds.has(baseId)) {
        return baseId;
    }
    let counter = 2;
    let candidate = `${baseId}-${counter}`;
    while (existingIds.has(candidate)) {
        counter++;
        candidate = `${baseId}-${counter}`;
    }
    return candidate;
}

/**
 * Generates a temporary ID for a new draft document.
 * Format: new-{timestamp}-{type}
 */
export function generateTempId(type: string): string {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    return `new-${timestamp}-${type}`;
}

/**
 * Generates a permanent ID from a title and document type.
 * Format: {kebab-title}-{type}
 */
export function generatePermanentId(title: string, type: string, existingIds: Set<string>): string {
    const baseId = `${toKebabCaseId(title)}-${type}`;
    return ensureUniqueId(baseId, existingIds);
}
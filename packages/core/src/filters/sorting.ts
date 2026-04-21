import { Weave } from '../entities/weave';
import { Document } from '../entities/document';

/**
 * Sorts an array of weaves by their ID.
 */
export function sortWeavesById(weaves: Weave[], ascending: boolean = true): Weave[] {
    return [...weaves].sort((a, b) => 
        ascending ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id)
    );
}

/**
 * Sorts an array of documents by their creation date.
 */
export function sortDocumentsByCreated<T extends Document>(docs: T[], ascending: boolean = true): T[] {
    return [...docs].sort((a, b) => {
        const dateA = new Date(a.created).getTime();
        const dateB = new Date(b.created).getTime();
        return ascending ? dateA - dateB : dateB - dateA;
    });
}

/**
 * Sorts an array of documents by their title.
 */
export function sortDocumentsByTitle<T extends Document>(docs: T[], ascending: boolean = true): T[] {
    return [...docs].sort((a, b) => 
        ascending ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
    );
}
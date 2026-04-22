import * as vscode from 'vscode';
import { ViewStateManager } from '../view/viewStateManager';
import { LoomTreeProvider } from '../tree/treeProvider';

export async function setTextFilter(
    manager: ViewStateManager,
    treeProvider: LoomTreeProvider
): Promise<void> {
    const current = manager.getState().textFilter ?? '';
    const input = await vscode.window.showInputBox({
        prompt: 'Filter weaves and documents by text (empty to clear)',
        value: current,
        placeHolder: 'e.g. payment',
    });
    if (input === undefined) return;
    manager.update({ textFilter: input || '' });
    treeProvider.refresh();
}

export function toggleArchived(
    manager: ViewStateManager,
    treeProvider: LoomTreeProvider
): void {
    manager.update({ showArchived: !manager.getState().showArchived });
    treeProvider.refresh();
}

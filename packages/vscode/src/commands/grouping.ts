import * as vscode from 'vscode';
import { ViewStateManager } from '../view/viewStateManager';
import { LoomTreeProvider } from '../tree/treeProvider';
import { GroupingMode } from '../view/viewState';

export async function showGroupingSelector(
    manager: ViewStateManager,
    treeProvider: LoomTreeProvider
): Promise<void> {
    const options: vscode.QuickPickItem[] = [
        { label: '$(symbol-class) Type', description: 'Group by document type' },
        { label: '$(project) Thread', description: 'Group by feature thread' },
        { label: '$(git-commit) Status', description: 'Group by workflow status' },
        { label: '$(tag) Release', description: 'Group by target release' },
    ];

    const selected = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select grouping mode',
    });

    if (selected) {
        let mode: GroupingMode;
        if (selected.label.includes('Type')) mode = 'type';
        else if (selected.label.includes('Thread')) mode = 'thread';
        else if (selected.label.includes('Status')) mode = 'status';
        else mode = 'release';

        manager.update({ grouping: mode });
        treeProvider.refresh();
    }
}
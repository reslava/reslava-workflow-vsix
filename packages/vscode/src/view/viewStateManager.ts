import * as vscode from 'vscode';
import { ViewState, defaultViewState } from './viewState';

export class ViewStateManager {
    private state: ViewState;

    constructor(private workspaceState: vscode.Memento) {
        this.state = { ...defaultViewState, ...workspaceState.get<ViewState>('loom.viewState') };
    }

    getState(): ViewState {
        return this.state;
    }

    update(partial: Partial<ViewState>): ViewState {
        this.state = { ...this.state, ...partial };
        this.workspaceState.update('loom.viewState', this.state);
        return this.state;
    }

    reset(): ViewState {
        this.state = { ...defaultViewState };
        this.workspaceState.update('loom.viewState', this.state);
        return this.state;
    }
}
const vscode = require('vscode');
const path = require('path');

class NoteModelProvider {
    constructor(dataBaseOperator, context) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.context = context;
        this.operator = dataBaseOperator;
        this.notebook = [];
    }

    async refresh() {
        if (this.operator && this.operator.getNote) {
            try {
                this.notebook = await this.operator.getNote();
                this._onDidChangeTreeData.fire();
            } catch (error) {
                // console.error("Error refreshing notebook:", error);
                vscode.window.showErrorMessage("Failed to refresh the notebook.");
            }
        } else {
            // console.error("Operator is not defined or does not have the getNote method.");
        }
    }

    async getChildren(element) {
        if (!element) {
            this.notebook = await this.operator.getNote();
            // console.log("Returning children:", this.notebook);
            return this.notebook.map(note => new TreeItem(note.title, note.content, this.context, note.id));
        }
        return [];
    }

    getTreeItem(element) {
        return element;
    }

    showContent(content) {
        vscode.window.showInformationMessage(content);
    }
}

class TreeItem extends vscode.TreeItem {
    constructor(name, content, context, id) {
        super(name, vscode.TreeItemCollapsibleState.None);
        this.context = context;
        this.iconPath = path.join(this.context.extensionPath, 'resources', 'sticky-notes.png');
        this.tooltip = content;
        this.content = content;
        // this.command = {
        //     command: 'notebox.showContent',
        //     title: '',
        //     arguments: [content]
        // };
        this.contextValue = 'notebookItem';
        this.id = id;
        this.type = 'note';
    }
}

module.exports = NoteModelProvider;

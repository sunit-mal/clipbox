const vscode = require('vscode');
const path = require('path');

class CodeModelProvider {
    constructor(dataBaseOperator, context) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.context = context;
        this.operator = dataBaseOperator;
        this.codeBox = [];
    }

    async refresh() {
        if (this.operator && this.operator.getCode) {
            try {
                this.codeBox = await this.operator.getCode();
                this._onDidChangeTreeData.fire();
            } catch (error) {
                // console.error("Error refreshing codeBox:", error);
                vscode.window.showErrorMessage("Failed to refresh the codeBox.");
            }
        } else {
            // console.error("Operator is not defined or does not have the codeBox method.");
        }
    }

    async filterCode(language) {
        if (language === "All") {
            this.codeBox = await this.operator.getCode();
            this._onDidChangeTreeData.fire();
            return;
        } else {
            try {
                // console.log("Filtering by language:", language);
                this.codeBox = await this.operator.getCodeByLanguage(language);
                // console.log("Filtered codeBox:", this.codeBox);
                if (this.codeBox.length === 0) {
                    vscode.window.showWarningMessage("No code found for the selected language.");
                }
                this._onDidChangeTreeData.fire();
            } catch (error) {
                // console.error("Error filtering codeBox:", error);
                vscode.window.showErrorMessage("Failed to filter the codeBox.");
            }
        }
    }

    async getChildren(element) {
        if (!element) {
            if (this.codeBox.length === 0) {
                this.codeBox = await this.operator.getCode();
            }
            // console.log("Returning children:", this.codeBox);
            return this.codeBox.map(note => new CodeTreeItem(note.content, note.language, this.context, note.id));
        }
        return [];
    }

    getTreeItem(element) {
        return element;
    }

    copyCode(content) {
        vscode.env.clipboard.writeText(content).then(() => {
            vscode.window.showInformationMessage("Code copied to clipboard.");
        // eslint-disable-next-line no-unused-vars
        }, (error) => {
            // console.error("Error copying code to clipboard:", error);
            vscode.window.showErrorMessage("Failed to copy code to clipboard.");
        });
    }
}

class CodeTreeItem extends vscode.TreeItem {
    constructor(name, content, context, id) {
        super(name, vscode.TreeItemCollapsibleState.None);
        this.context = context;
        this.iconPath = path.join(this.context.extensionPath, 'resources', 'terminal.png');
        this.tooltip = name;
        this.command = {
            command: 'notebox.copy',
            title: '',
            arguments: [name]
        };
        this.id = id;
        this.contextValue = 'codeItem';
        this.content = name;
        this.type = "code";
    }
}

module.exports = CodeModelProvider;

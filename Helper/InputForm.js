const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

class InputForm {
    constructor(context, dbOperator, refresh) {
        if (!context) {
            throw new Error('Extension context is undefined!');
        }
        this.context = context;
        this.dbOperator = dbOperator;
        this.refresh = refresh;
    }

    FormView() {
        const panel = vscode.window.createWebviewPanel(
            'userInputForm',
            'User Input Form',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
            }
        );

        const htmlPath = path.join(this.context.extensionPath, 'resources', 'form.html');

        if (fs.existsSync(htmlPath)) {
            const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
            panel.webview.html = htmlContent;
        } else {
            vscode.window.showErrorMessage(`HTML file not found: ${htmlPath}`);
            return;
        }

        panel.webview.onDidReceiveMessage(
            (message) => {
                switch (message.command) {
                    case 'submit':
                        const { value1, value2 } = message.data;
                        panel.dispose();
                        this.dbOperator.insertNote(
                            value1,
                            value2
                        );
                        this.refresh();
                        return vscode.window.showInformationMessage(`Values Saved`);
                }
            },
            undefined,
            this.context.subscriptions
        );
    }
}

module.exports = InputForm;

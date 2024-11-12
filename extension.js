const vscode = require('vscode');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DataBaseOperator = require('./Helper/DataBaseOperator');
const FormView = require('./Helper/InputForm');
const NoteModelProvider = require('./Helper/NoteModelProvider');
const CodeModelProvider = require('./Helper/CodeModelProvider');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	vscode.workspace.fs.createDirectory(context.globalStorageUri);

	const note_db_path = path.join(context.globalStorageUri.fsPath, 'notebox.db');
	const code_db_path = path.join(context.globalStorageUri.fsPath, 'codebox.db');

	const note_db = new sqlite3.Database(note_db_path, (err) => {
		if (err) {
			// console.error("Failed to connect to database:", err);
		} else {
			const createNoteBookTableQuery = `
                CREATE TABLE IF NOT EXISTS NoteBook (
                    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    "title" TEXT NOT NULL,
                    "content" TEXT NOT NULL,
                    "overflow" TINYINT NULL,
                    "overflowkeys" TEXT NULL
                );
            `;
			note_db.run(createNoteBookTableQuery, (err) => {
				if (err) {
					// console.error("Error creating NoteBook table:", err);
				} else {
					// console.log("NoteBook table is ready.");
				}
			});

			const createOverflowTableQuery = `
                CREATE TABLE IF NOT EXISTS Overflow (
                    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    "content" TEXT NOT NULL
                );
            `;
			note_db.run(createOverflowTableQuery, (err) => {
				if (err) {
					// console.error("Error creating Overflow table:", err);
				} else {
					// console.log("Overflow table is ready.");
				}
			});
		}
	});

	const code_db = new sqlite3.Database(code_db_path, (err) => {
		if (err) {
			// console.error("Failed to connect to database:", err);
		} else {
			const createCodeBoxTableQuery = `
                CREATE TABLE IF NOT EXISTS CodeBox (
                    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    "language" TEXT NOT NULL,
                    "content" TEXT NOT NULL
                );
            `;
			code_db.run(createCodeBoxTableQuery, (err) => {
				if (err) {
					// console.error("Error creating CodeBox table:", err);
				} else {
					// console.log("CodeBox table is ready.");
				}
			});
		}
	});

	const dbOperator = new DataBaseOperator(note_db, code_db, context);

	const noteModelProvider = new NoteModelProvider(dbOperator, context);
	const codeModelProvider = new CodeModelProvider(dbOperator, context);

	const notebookTreeView = vscode.window.createTreeView('notebook', {
		treeDataProvider: noteModelProvider
	});
	const codeBoxTreeView = vscode.window.createTreeView('codesnap', {
		treeDataProvider: codeModelProvider
	});

	context.subscriptions.push(notebookTreeView, codeBoxTreeView);

	const noteInserter = vscode.commands.registerCommand('notebox.insert-note', async function () {
		const formView = new FormView(context, dbOperator, noteModelProvider.refresh.bind(noteModelProvider));
		formView.FormView();
	});

	const codeInserter = vscode.commands.registerCommand('notebox.store-code', async function () {
		const editor = vscode.window.activeTextEditor;

		if (editor) {
			vscode.window.showQuickPick([
				'Java',
				'SpringBoot',
				'Python',
				'Django',
				'C/Cpp',
				'C#',
				'JavaScript',
				'HTML',
				'CSS',
				'PHP',
				'SQL',
				'Terminal',
				'Yeoman',
				'Other'
			]).then((selected) => {
				const selectedText = editor.document.getText(editor.selection);
				dbOperator.insertCode(selected, selectedText)
					// eslint-disable-next-line no-unused-vars
					.then((insertedId) => {
						// console.log(`Code inserted with ID: ${insertedId}`);
						vscode.window.showInformationMessage('Code Stored successfully');
						codeModelProvider.refresh();
					})
					.catch((err) => {
						// console.error('Error inserting code:', err);
						vscode.window.showInformationMessage('Error storing code.', err);
					});
			});
		}
	});

	const codeManualInsert = vscode.commands.registerCommand('notebox.insert-code', async function () {
		const editor = vscode.window.activeTextEditor;

		if (editor) {
			vscode.window.showQuickPick([
				'Java',
				'SpringBoot',
				'Python',
				'Django',
				'C/Cpp',
				'C#',
				'JavaScript',
				'HTML',
				'CSS',
				'PHP',
				'SQL',
				'Terminal',
				'Yeoman',
				'Other'
			]).then(async (selected) => {
				const selectedText = await vscode.window.showInputBox({ prompt: 'Enter the code snippet' });
				dbOperator.insertCode(selected, selectedText)
					// eslint-disable-next-line no-unused-vars
					.then((insertedId) => {
						// console.log(`Code inserted with ID: ${insertedId}`);
						vscode.window.showInformationMessage('Code Stored successfully');
						codeModelProvider.refresh();
					})
					.catch((err) => {
						// console.error('Error inserting code:', err);
						vscode.window.showInformationMessage('Error storing code.', err);
					});
			});
		}
	});

	const contentProvider = vscode.commands.registerCommand('notebox.showContent', (content) => {
		noteModelProvider.showContent(content);
	})

	const copyFunction = vscode.commands.registerCommand('notebox.copy', (content) => {
		codeModelProvider.copyCode(content);
	})

	const deleteFunction = vscode.commands.registerCommand('notebox.delete', (treeItem) => {
		// vscode.window.showInformationMessage();
		if (treeItem.type === 'note') {
			dbOperator.deleteNote(treeItem.id)
				// eslint-disable-next-line no-unused-vars
				.then((deleted) => {
					// console.log(`Note deleted`);
					vscode.window.showInformationMessage('Note Deleted successfully');
					noteModelProvider.refresh();
				})
				.catch((err) => {
					// console.error('Error deleting note:', err);
					vscode.window.showInformationMessage('Error deleting note.', err);
				});
		} else if (treeItem.type === 'code') {
			dbOperator.deleteCode(treeItem.id)
				// eslint-disable-next-line no-unused-vars
				.then((deleted) => {
					// console.log(`Code deleted`);
					vscode.window.showInformationMessage('Code Deleted successfully');
					codeModelProvider.refresh();
				})
				.catch((err) => {
					// console.error('Error deleting code:', err);
					vscode.window.showInformationMessage('Error deleting code.', err);
				});
		} else {
			// console.log("Unknown type");
			vscode.window.showWarningMessage('Unknown type');
		}
	})

	const contentDisplay = vscode.commands.registerCommand('notebox.content', (treeItem) => {
		// console.log(treeItem);
		vscode.window.showInformationMessage(treeItem.content);
	})

	const filterCodeBox = vscode.commands.registerCommand('notebox.filter', async function () {
		vscode.window.showQuickPick([
			'Java',
			'Python',
			'C/Cpp',
			'C#',
			'JavaScript',
			'HTML',
			'CSS',
			'PHP',
			'SQL',
			'Terminal',
			'Other',
			'All'
		]).then((selected) => {
			codeModelProvider.filterCode(selected);
		});
	})


	context.subscriptions.push(noteInserter, codeInserter, contentProvider, copyFunction, filterCodeBox, deleteFunction, contentDisplay, codeManualInsert);

	// context.subscriptions.push(new vscode.Disposable(() => note_db.close()
	// 	, code_db.close()));
}


function deactivate() {

}

module.exports = {
	activate,
	deactivate
};

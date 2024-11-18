const vscode = require('vscode');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const DataBaseOperator = require('./Helper/DataBaseOperator');
const FormView = require('./Helper/InputForm');
const NoteModelProvider = require('./Helper/NoteModelProvider');
const CodeModelProvider = require('./Helper/CodeModelProvider');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// const note_db_path = path.join(context.globalStorageUri.fsPath, 'notebox.db');
	// const code_db_path = path.join(context.globalStorageUri.fsPath, 'codebox.db');

	const appDataPath = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library', 'Application Support') : path.join(process.env.HOME, '.config'));

	const folderName = '.memoryVault';
	const extensionGlobalStorageUri = vscode.Uri.file(path.join(appDataPath, folderName));

	const extensionFolderPath = extensionGlobalStorageUri.fsPath;

	// Ensure the directory exists (create it if it doesn't exist)
	if (!fs.existsSync(extensionFolderPath)) {
		fs.mkdirSync(extensionFolderPath, { recursive: true });
	}

	const note_db_path = path.join(extensionFolderPath, 'notebox.db');
	const code_db_path = path.join(extensionFolderPath, 'codebox.db');

	let note_db;
	let code_db;

	// Check if the 'notebox.db' file exists
	if (fs.existsSync(note_db_path)) {
		note_db = new sqlite3.Database(note_db_path, (err) => {
			if (err) {
				console.error("Failed to connect to note database:", err);
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
						console.error("Error creating NoteBook table:", err);
					} else {
						console.log("NoteBook table is ready.");
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
						console.error("Error creating Overflow table:", err);
					} else {
						console.log("Overflow table is ready.");
					}
				});
			}
		});
	}

	// Check if the 'codebox.db' file exists
	if (fs.existsSync(code_db_path)) {
		
		console.log("codebox.db not found, creating database...");
		code_db = new sqlite3.Database(code_db_path, (err) => {
			if (err) {
				console.error("Failed to connect to code database:", err);
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
						console.error("Error creating CodeBox table:", err);
					} else {
						console.log("CodeBox table is ready.");
					}
				});
			}
		});
	}

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

	const noteInserter = vscode.commands.registerCommand('memory-vault.insert-note', async function () {
		const formView = new FormView(context, dbOperator, noteModelProvider.refresh.bind(noteModelProvider));
		formView.FormView();
	});
	// console.log(dbOperator.getCode());
	const codeInserter = vscode.commands.registerCommand('memory-vault.store-code', async function () {
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

	const codeManualInsert = vscode.commands.registerCommand('memory-vault.insert-code', async function () {
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

	const contentProvider = vscode.commands.registerCommand('memory-vault.showContent', (content) => {
		noteModelProvider.showContent(content);
	})

	const copyFunction = vscode.commands.registerCommand('memory-vault.copy', (treeItem) => {
		codeModelProvider.copyCode(treeItem.content);
	})

	const deleteFunction = vscode.commands.registerCommand('memory-vault.delete', (treeItem) => {
		// vscode.window.showInformationMessage();
		vscode.window.showWarningMessage(
			`Are you sure you want to delete this ${treeItem.type === 'note' ? 'note' : 'code'}?`,
			{ modal: true },
			'Yes', 'No'
		).then((value) => {
			if (value === 'Yes') {
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
			}
		});
	})

	const contentDisplay = vscode.commands.registerCommand('memory-vault.content', (treeItem) => {
		vscode.window.showInformationMessage(`${treeItem.header}\n\n${treeItem.content}`, 'Copy', 'Delete').then((value) => {
			if (value === 'Copy') {
				vscode.env.clipboard.writeText(treeItem.content).then(() => {
					vscode.window.showInformationMessage("Code copied to clipboard.");
					// eslint-disable-next-line no-unused-vars
				}, (error) => {
					// console.error("Error copying code to clipboard:", error);
					vscode.window.showErrorMessage("Failed to copy code to clipboard.");
				});
			}
			if (value === 'Delete') {
				vscode.window.showWarningMessage(
					`Are you sure you want to delete this ${treeItem.type === 'note' ? 'note' : 'code'}?`,
					{ modal: true },
					'Yes', 'No'
				).then((value) => {
					if (value === 'Yes') {
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
					}
				})
			};
		});
	})

	const filterCodeBox = vscode.commands.registerCommand('memory-vault.filter', async function () {
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

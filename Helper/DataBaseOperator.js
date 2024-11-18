const vscode = require('vscode');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

class DataBaseOperator {
    constructor(node_db, code_db, context) {
        this.node_db = node_db;
        this.code_db = code_db;
        this.context = context;
        this.dbStatus();
    }

    dbStatus() {
        const appDataPath = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library', 'Application Support') : path.join(process.env.HOME, '.config'));
        const folderName = '.memoryVault';
        const extensionGlobalStorageUri = vscode.Uri.file(path.join(appDataPath, folderName));
        const extensionFolderPath = extensionGlobalStorageUri.fsPath;

        const note_db_path = path.join(extensionFolderPath, 'notebox.db');
        const code_db_path = path.join(extensionFolderPath, 'codebox.db');

        if (!fs.existsSync(note_db_path)) {
            this.note_db = new sqlite3.Database(note_db_path, (err) => {
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
                    this.note_db.run(createNoteBookTableQuery, (err) => {
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
                    this.note_db.run(createOverflowTableQuery, (err) => {
                        if (err) {
                            console.error("Error creating Overflow table:", err);
                        } else {
                            console.log("Overflow table is ready.");
                        }
                    });
                }
            });
        }

        if (!fs.existsSync(code_db_path)) {
            this.code_db = new sqlite3.Database(code_db_path, (err) => {
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
                    this.code_db.run(createCodeBoxTableQuery, (err) => {
                        if (err) {
                            console.error("Error creating CodeBox table:", err);
                        } else {
                            console.log("CodeBox table is ready.");
                        }
                    });
                }
            });
        }
    }

    insertNote(title, content, overflow = null, overflowkeys = null) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO NoteBook (title, content, overflow, overflowkeys)
                VALUES (?, ?, ?, ?)
            `;
            this.node_db.run(query, [title, content, overflow, overflowkeys], function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    getNote() {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM NoteBook`;
            this.node_db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    deleteNote(id) {
        return new Promise((resolve, reject) => {
            const query = `DELETE FROM NoteBook WHERE id = ?`;
            this.node_db.run(query, [id], function (err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }

    insertCode(language, content) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO CodeBox (language, content)
                VALUES (?, ?)
            `;
            this.code_db.run(query, [language, content], function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    getCode() {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM CodeBox`;
            this.code_db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getCodeByLanguage(language) {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM CodeBox WHERE language = ?`;
            this.code_db.all(query, [language], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    deleteCode(id) {
        return new Promise((resolve, reject) => {
            const query = `DELETE FROM CodeBox WHERE id = ?`;
            this.code_db.run(query, [id], function (err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }
}

module.exports = DataBaseOperator;

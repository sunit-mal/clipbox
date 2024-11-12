const vscode = require('vscode');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class DataBaseOperator {
    constructor(node_db, code_db, context) {
        this.node_db = node_db;
        this.code_db = code_db;
        this.context = context;
        this.dbStatus();
    }

    dbStatus() {
        vscode.workspace.fs.createDirectory(this.context.globalStorageUri);

        const note_db_path = path.join(this.context.globalStorageUri.fsPath, 'notebox.db');
        const code_db_path = path.join(this.context.globalStorageUri.fsPath, 'codebox.db');

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
    }

    // submitNote(title, content) {
    //     content.length > 1000 ? this.insertOverflow(title, content) : this.insertNote(title, content);
    // }

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

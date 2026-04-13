const DB = {
    DB_NAME: 'TerminalNotesDB',
    DB_VERSION: 5,
    STORE_NAME: 'notes',
    SUMMARIES_STORE: 'summaries',
    EMBEDDINGS_STORE: 'embeddings',
    HISTORY_STORE: 'commandHistory',
    db: null,
    encryptionKey: null,

    async init() {
        if (this.db) return this.db;
        
        // Initialize encryption key
        await this.initEncryption();

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    const objectStore = db.createObjectStore(this.STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    
                    // Create indexes
                    objectStore.createIndex('content', 'content', { unique: false });
                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                } else {
                    // Handle version upgrades (e.g. adding new indexes)
                    const objectStore = request.transaction.objectStore(this.STORE_NAME);
                    if (!objectStore.indexNames.contains('content')) {
                        objectStore.createIndex('content', 'content', { unique: false });
                    }
                    if (!objectStore.indexNames.contains('timestamp')) {
                        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                    }
                }

                if (!db.objectStoreNames.contains(this.SUMMARIES_STORE)) {
                    const summariesStore = db.createObjectStore(this.SUMMARIES_STORE, { keyPath: 'id', autoIncrement: true });
                    summariesStore.createIndex('noteId', 'noteId', { unique: false });
                    summariesStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                if (!db.objectStoreNames.contains(this.EMBEDDINGS_STORE)) {
                    const embedStore = db.createObjectStore(this.EMBEDDINGS_STORE, { keyPath: 'id', autoIncrement: true });
                    embedStore.createIndex('noteId', 'noteId', { unique: false });
                }

                // Command History Store (v5)
                if (!db.objectStoreNames.contains(this.HISTORY_STORE)) {
                    const historyStore = db.createObjectStore(this.HISTORY_STORE, { keyPath: 'id', autoIncrement: true });
                    historyStore.createIndex('timestamp', 'timestamp', { unique: false });
                    historyStore.createIndex('type', 'type', { unique: false });
                }
            };
        });
    },

    async initEncryption() {
        // Simple key management: check localStorage or generate new
        // In a real app, this should come from user password
        const storedKey = localStorage.getItem('terminal_notes_key');
        if (storedKey) {
            try {
                this.encryptionKey = await this.importKey(storedKey);
            } catch (e) {
                console.warn("Stored encryption key is corrupted. Generating a new one.", e);
                localStorage.removeItem('terminal_notes_key');
                await this.generateAndStoreKey();
            }
        } else {
            await this.generateAndStoreKey();
        }
    },

    async generateAndStoreKey() {
        this.encryptionKey = await window.crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
        const exported = await window.crypto.subtle.exportKey("jwk", this.encryptionKey);
        localStorage.setItem('terminal_notes_key', JSON.stringify(exported));
    },

    async importKey(jwkStr) {
        return await window.crypto.subtle.importKey(
            "jwk",
            JSON.parse(jwkStr),
            { name: "AES-GCM" },
            true,
            ["encrypt", "decrypt"]
        );
    },

    async encrypt(text) {
        if (!this.encryptionKey) await this.initEncryption();
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            this.encryptionKey,
            data
        );
        
        // Return as JSON string containing IV and encrypted data (base64)
        return JSON.stringify({
            iv: Array.from(iv),
            data: Array.from(new Uint8Array(encrypted))
        });
    },

    async decrypt(encryptedStr) {
        if (!this.encryptionKey) await this.initEncryption();
        try {
            const raw = JSON.parse(encryptedStr);
            if (!raw.iv || !raw.data) return encryptedStr; // Not encrypted or legacy

            const iv = new Uint8Array(raw.iv);
            const data = new Uint8Array(raw.data);

            const decrypted = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                this.encryptionKey,
                data
            );
            
            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (e) {
            console.warn("Decryption failed or legacy data:", e);
            return encryptedStr; // Fallback for plain text
        }
    },

    async add(content, title = '') {
        await this.init();
        const encryptedContent = await this.encrypt(content);
        const encryptedTitle = title ? await this.encrypt(title) : '';
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            
            const note = {
                content: encryptedContent,
                title: encryptedTitle,
                tags: [], // Tags array (v6 placeholder)
                timestamp: new Date().toISOString(),
                deleted: 0 // 0 = active, 1 = deleted
            };

            const request = store.add(note);

            request.onsuccess = async () => {
                // Return the note with the new ID and decrypted content
                resolve({ 
                    id: request.result, 
                    content: content,
                    title: title,
                    tags: [],
                    timestamp: note.timestamp 
                });
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },

    async update(id, content, title, tags) {
        await this.init();
        const encryptedContent = content !== undefined ? await this.encrypt(content) : undefined;
        const encryptedTitle = title !== undefined ? await this.encrypt(title) : undefined;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.get(parseInt(id));

            request.onsuccess = () => {
                const note = request.result;
                if (!note) {
                    reject(new Error("Note not found"));
                    return;
                }
                
                if (content !== undefined) note.content = encryptedContent;
                if (title !== undefined) note.title = encryptedTitle;
                if (tags !== undefined) note.tags = tags;
                note.timestamp = new Date().toISOString(); // Update timestamp on edit? Maybe separate updatedAt?

                const updateRequest = store.put(note);
                updateRequest.onsuccess = () => resolve(true);
                updateRequest.onerror = (e) => reject(e.target.error);
            };
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async getAll(includeDeleted = false) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.getAll();

            request.onsuccess = async () => {
                const notes = request.result;
                // Decrypt all notes
                const decryptedNotes = await Promise.all(notes.map(async (note) => {
                    return {
                        ...note,
                        content: await this.decrypt(note.content),
                        title: note.title ? await this.decrypt(note.title) : ''
                    };
                }));
                
                // Filter deleted unless requested
                const filtered = includeDeleted 
                    ? decryptedNotes 
                    : decryptedNotes.filter(n => !n.deleted);
                    
                resolve(filtered);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },

    async get(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.get(parseInt(id));

            request.onsuccess = async () => {
                const note = request.result;
                if (note && !note.deleted) {
                    note.content = await this.decrypt(note.content);
                    note.title = note.title ? await this.decrypt(note.title) : '';
                    resolve(note);
                } else {
                    resolve(null);
                }
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },

    async softDelete(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.get(parseInt(id));

            request.onsuccess = () => {
                const note = request.result;
                if (note) {
                    note.deleted = 1;
                    note.deletedAt = new Date().toISOString();
                    store.put(note).onsuccess = () => resolve(true);
                } else {
                    resolve(false);
                }
            };
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async restore(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.get(parseInt(id));

            request.onsuccess = () => {
                const note = request.result;
                if (note) {
                    note.deleted = 0;
                    delete note.deletedAt;
                    store.put(note).onsuccess = () => resolve(true);
                } else {
                    resolve(false);
                }
            };
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async getDeleted() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.getAll();

            request.onsuccess = async () => {
                const notes = request.result;
                const deletedNotes = notes.filter(n => n.deleted === 1);
                
                // Sort by deletedAt desc
                deletedNotes.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

                const decrypted = await Promise.all(deletedNotes.map(async (note) => {
                    return {
                        ...note,
                        content: await this.decrypt(note.content),
                        title: note.title ? await this.decrypt(note.title) : ''
                    };
                }));
                resolve(decrypted);
            };
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async delete(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.delete(parseInt(id));

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },

    async clear() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },

    async search(query) {
        // Basic full-text search by fetching all and filtering (since IDB indexes are not full-text)
        // For larger datasets, we would use a more advanced approach or a dedicated search index (like Lunr.js)
        const allNotes = await this.getAll();
        const lowerQuery = query.toLowerCase();
        return allNotes.filter(note => 
            note.content.toLowerCase().includes(lowerQuery) || 
            (note.title && note.title.toLowerCase().includes(lowerQuery))
        );
    },

    async export() {
        const notes = await this.getAll();
        const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `terminal-notes-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return notes.length;
    },

    async import(jsonString) {
        try {
            const notes = JSON.parse(jsonString);
            if (!Array.isArray(notes)) throw new Error("Invalid format");
            
            let count = 0;
            for (const note of notes) {
                if (note.content) {
                    await this.add(note.content);
                    count++;
                }
            }
            return count;
        } catch (e) {
            console.error("Import failed:", e);
            throw e;
        }
    },

    // --- Summaries ---

    async addSummary(summaryData) {
        await this.init();
        // Encrypt summary text if needed, but since it's lightweight we can encrypt text
        const encryptedText = await this.encrypt(summaryData.text);
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.SUMMARIES_STORE], 'readwrite');
            const store = transaction.objectStore(this.SUMMARIES_STORE);
            
            const summary = {
                noteId: parseInt(summaryData.noteId),
                text: encryptedText,
                type: summaryData.type || 'full',
                createdAt: summaryData.createdAt || Date.now()
            };

            const request = store.add(summary);

            request.onsuccess = () => {
                resolve({
                    id: request.result,
                    ...summary,
                    text: summaryData.text // Return unencrypted for immediate use
                });
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },

    async getSummariesByNoteId(noteId) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.SUMMARIES_STORE], 'readonly');
            const store = transaction.objectStore(this.SUMMARIES_STORE);
            const index = store.index('noteId');
            const request = index.getAll(parseInt(noteId));

            request.onsuccess = async () => {
                const summaries = request.result;
                // Decrypt all summaries
                const decryptedSummaries = await Promise.all(summaries.map(async (summary) => {
                    return {
                        ...summary,
                        text: await this.decrypt(summary.text)
                    };
                }));
                resolve(decryptedSummaries);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },

    async deleteSummary(summaryId) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.SUMMARIES_STORE], 'readwrite');
            const store = transaction.objectStore(this.SUMMARIES_STORE);
            const request = store.delete(parseInt(summaryId));

            request.onsuccess = () => resolve(true);
            request.onerror = (event) => reject(event.target.error);
        });
    },

    // --- Embeddings ---
    async saveEmbedding(noteId, vector, contentSnapshot) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.EMBEDDINGS_STORE], 'readwrite');
            const store = transaction.objectStore(this.EMBEDDINGS_STORE);
            const index = store.index('noteId');
            const getReq = index.get(parseInt(noteId));

            getReq.onsuccess = () => {
                const existing = getReq.result;
                const record = {
                    noteId: parseInt(noteId),
                    vector: vector,
                    contentSnapshot: contentSnapshot,
                    createdAt: existing ? existing.createdAt : Date.now()
                };
                if (existing) record.id = existing.id;

                store.put(record).onsuccess = () => resolve(true);
            };
            getReq.onerror = (e) => reject(e.target.error);
        });
    },

    async getAllEmbeddings() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.EMBEDDINGS_STORE], 'readonly');
            const store = transaction.objectStore(this.EMBEDDINGS_STORE);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    // --- Command History ---
    async addHistory(entry) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.HISTORY_STORE], 'readwrite');
            const store = transaction.objectStore(this.HISTORY_STORE);
            const record = {
                command: entry.command || '',
                result: entry.result || '',
                type: entry.type || 'system',
                timestamp: entry.timestamp || Date.now()
            };
            const request = store.add(record);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async getHistory() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.HISTORY_STORE], 'readonly');
            const store = transaction.objectStore(this.HISTORY_STORE);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async clearHistory() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.HISTORY_STORE], 'readwrite');
            const store = transaction.objectStore(this.HISTORY_STORE);
            const request = store.clear();
            request.onsuccess = () => resolve(true);
            request.onerror = (e) => reject(e.target.error);
        });
    }
};

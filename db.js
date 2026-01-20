const DB = {
    DB_NAME: 'TerminalNotesDB',
    DB_VERSION: 2,
    STORE_NAME: 'notes',
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
            };
        });
    },

    async initEncryption() {
        // Simple key management: check localStorage or generate new
        // In a real app, this should come from user password
        const storedKey = localStorage.getItem('terminal_notes_key');
        if (storedKey) {
            this.encryptionKey = await this.importKey(storedKey);
        } else {
            this.encryptionKey = await window.crypto.subtle.generateKey(
                { name: "AES-GCM", length: 256 },
                true,
                ["encrypt", "decrypt"]
            );
            const exported = await window.crypto.subtle.exportKey("jwk", this.encryptionKey);
            localStorage.setItem('terminal_notes_key', JSON.stringify(exported));
        }
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

    async add(content) {
        await this.init();
        const encryptedContent = await this.encrypt(content);
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            
            const note = {
                content: encryptedContent,
                timestamp: new Date().toISOString()
            };

            const request = store.add(note);

            request.onsuccess = async () => {
                // Return the note with the new ID and decrypted content
                resolve({ 
                    id: request.result, 
                    content: content, 
                    timestamp: note.timestamp 
                });
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },

    async getAll() {
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
                        content: await this.decrypt(note.content)
                    };
                }));
                resolve(decryptedNotes);
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
                if (note) {
                    note.content = await this.decrypt(note.content);
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
        return allNotes.filter(note => note.content.toLowerCase().includes(lowerQuery));
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
    }
};

const Storage = {
    KEY: 'terminal-notes-data',

    getAll() {
        const data = localStorage.getItem(this.KEY);
        return data ? JSON.parse(data) : [];
    },

    save(notes) {
        localStorage.setItem(this.KEY, JSON.stringify(notes));
    },

    add(content) {
        const notes = this.getAll();
        const id = notes.length > 0 ? Math.max(...notes.map(n => n.id)) + 1 : 1;
        const note = {
            id,
            content,
            timestamp: new Date().toISOString()
        };
        notes.push(note);
        this.save(notes);
        return note;
    },

    delete(id) {
        const notes = this.getAll();
        const initialLength = notes.length;
        const filteredNotes = notes.filter(n => n.id !== parseInt(id));
        
        if (filteredNotes.length === initialLength) {
            return false;
        }

        this.save(filteredNotes);
        return true;
    },

    get(id) {
        const notes = this.getAll();
        return notes.find(n => n.id === parseInt(id));
    },

    clear() {
        localStorage.removeItem(this.KEY);
    }
};

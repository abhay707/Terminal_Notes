const Commands = {
    async process(input) {
        const parts = input.trim().split(' ');
        const command = parts[0].toLowerCase().replace('/', ''); // Support both /cmd and cmd
        const args = parts.slice(1);

        switch (command) {
            case 'n':
            case 'add':
                // Note: The UI now handles adding via overlay mostly, but this command supports CLI add
                return await this.add(args.join(' '));
            case 'a':
            case 'list':
                return await this.list();
            case 'view':
            case 'v':
                return await this.view(args[0]);
            case 'delete':
            case 'd':
                return await this.delete(args[0]);
            case 'clear':
                return this.clear();
            case 'help':
                return this.help();
            case 'search':
                return await this.search(args.join(' '));
            case 'export':
                return await this.export();
            case 'import':
                return await this.import(args.join(' ')); // This might need a way to input JSON, maybe just triggering a prompt
            case '':
                return '';
            default:
                return `<div class="error">Command not found: ${command}. Type 'help' for available commands.</div>`;
        }
    },

    async add(content) {
        if (!content) {
            return '<div class="error">Usage: /n <note content></div>';
        }
        const note = await Storage.add(content);
        return `<div class="success">Note added with ID: ${note.id}</div>`;
    },

    async list() {
        const notes = await Storage.getAll();
        if (notes.length === 0) {
            return '<div class="response">No notes found.</div>';
        }
        
        let html = '<div class="response">';
        notes.forEach(note => {
            const preview = note.content.length > 50 ? note.content.substring(0, 50) + '...' : note.content;
            html += `<div class="note-item"><span class="note-id">[${note.id}]</span> <span class="note-content">${this.escapeHtml(preview)}</span></div>`;
        });
        html += '</div>';
        return html;
    },

    async view(id) {
        if (!id) {
            return '<div class="error">Usage: /view <id></div>';
        }
        const note = await Storage.get(id);
        if (!note) {
            return `<div class="error">Note with ID ${id} not found.</div>`;
        }
        return `
            <div class="response">
                <div class="note-item"><span class="note-id">ID:</span> ${note.id}</div>
                <div class="note-item"><span class="note-id">Date:</span> ${new Date(note.timestamp).toLocaleString()}</div>
                <div class="note-item"><span class="note-id">Content:</span></div>
                <div class="note-content" style="white-space: pre-wrap; margin-top: 5px;">${this.escapeHtml(note.content)}</div>
            </div>
        `;
    },

    async delete(id) {
        if (!id) {
            return '<div class="error">Usage: /delete <id></div>';
        }
        const success = await Storage.delete(id);
        if (success) {
            return `<div class="success">Note ${id} deleted.</div>`;
        } else {
            return `<div class="error">Note with ID ${id} not found.</div>`;
        }
    },

    async search(query) {
        if (!query) return '<div class="error">Usage: /search <query></div>';
        const notes = await Storage.search(query);
        if (notes.length === 0) return '<div class="response">No matching notes found.</div>';
        
        let html = '<div class="response"><div>Search Results:</div>';
        notes.forEach(note => {
             const preview = note.content.length > 50 ? note.content.substring(0, 50) + '...' : note.content;
             html += `<div class="note-item"><span class="note-id">[${note.id}]</span> <span class="note-content">${this.escapeHtml(preview)}</span></div>`;
        });
        html += '</div>';
        return html;
    },

    async export() {
        const count = await Storage.export();
        return `<div class="success">Exported ${count} notes. Check your downloads.</div>`;
    },

    async import(jsonString) {
        // Since CLI input of JSON is hard, we'll suggest using a file input or just say not supported in CLI
        // Or we could try to parse if it's short.
        // Better UX: Trigger a file picker or just say "Use console to run Storage.import() for now"
        // But let's try to support pasting if user insists.
        if (!jsonString) return '<div class="error">Usage: /import <json_string> (Note: Large imports not supported via CLI)</div>';
        try {
            const count = await Storage.import(jsonString);
            return `<div class="success">Imported ${count} notes.</div>`;
        } catch (e) {
            return `<div class="error">Import failed: ${e.message}</div>`;
        }
    },

    clear() {
        return 'CLEAR_SCREEN';
    },

    help() {
        return `
            <div class="response">
                <div>Available commands:</div>
                <div class="note-item"><span class="note-id">/n &lt;note&gt;</span> - Add a new note</div>
                <div class="note-item"><span class="note-id">/a</span> - List all notes</div>
                <div class="note-item"><span class="note-id">/view &lt;id&gt;</span> - View a specific note</div>
                <div class="note-item"><span class="note-id">/delete &lt;id&gt;</span> - Delete a specific note</div>
                <div class="note-item"><span class="note-id">/search &lt;query&gt;</span> - Search notes</div>
                <div class="note-item"><span class="note-id">/export</span> - Export notes to JSON</div>
                <div class="note-item"><span class="note-id">/clear</span> - Clear the terminal screen</div>
                <div class="note-item"><span class="note-id">/help</span> - Show this help message</div>
            </div>
        `;
    },

    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};

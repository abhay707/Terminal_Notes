const Commands = {
    process(input) {
        const parts = input.trim().split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (command) {
            case 'add':
                return this.add(args.join(' '));
            case 'list':
                return this.list();
            case 'view':
                return this.view(args[0]);
            case 'delete':
                return this.delete(args[0]);
            case 'clear':
                return this.clear();
            case 'help':
                return this.help();
            case '':
                return '';
            default:
                return `<div class="error">Command not found: ${command}. Type 'help' for available commands.</div>`;
        }
    },

    add(content) {
        if (!content) {
            return '<div class="error">Usage: add <note content></div>';
        }
        const note = Storage.add(content);
        return `<div class="success">Note added with ID: ${note.id}</div>`;
    },

    list() {
        const notes = Storage.getAll();
        if (notes.length === 0) {
            return '<div class="response">No notes found.</div>';
        }
        
        let html = '<div class="response">';
        notes.forEach(note => {
            const preview = note.content.length > 50 ? note.content.substring(0, 50) + '...' : note.content;
            html += `<div class="note-item"><span class="note-id">[${note.id}]</span> <span class="note-content">${preview}</span></div>`;
        });
        html += '</div>';
        return html;
    },

    view(id) {
        if (!id) {
            return '<div class="error">Usage: view <id></div>';
        }
        const note = Storage.get(id);
        if (!note) {
            return `<div class="error">Note with ID ${id} not found.</div>`;
        }
        return `
            <div class="response">
                <div class="note-item"><span class="note-id">ID:</span> ${note.id}</div>
                <div class="note-item"><span class="note-id">Date:</span> ${new Date(note.timestamp).toLocaleString()}</div>
                <div class="note-item"><span class="note-id">Content:</span></div>
                <div class="note-content" style="white-space: pre-wrap; margin-top: 5px;">${note.content}</div>
            </div>
        `;
    },

    delete(id) {
        if (!id) {
            return '<div class="error">Usage: delete <id></div>';
        }
        const success = Storage.delete(id);
        if (success) {
            return `<div class="success">Note ${id} deleted.</div>`;
        } else {
            return `<div class="error">Note with ID ${id} not found.</div>`;
        }
    },

    clear() {
        return 'CLEAR_SCREEN';
    },

    help() {
        return `
            <div class="response">
                <div>Available commands:</div>
                <div class="note-item"><span class="note-id">add &lt;note&gt;</span> - Add a new note</div>
                <div class="note-item"><span class="note-id">list</span> - List all notes</div>
                <div class="note-item"><span class="note-id">view &lt;id&gt;</span> - View a specific note</div>
                <div class="note-item"><span class="note-id">delete &lt;id&gt;</span> - Delete a specific note</div>
                <div class="note-item"><span class="note-id">clear</span> - Clear the terminal screen</div>
                <div class="note-item"><span class="note-id">help</span> - Show this help message</div>
            </div>
        `;
    }
};

/**
 * MONOLITH_CMD Command Orchestrator
 * Handles terminal commands, state management, and AI interaction.
 * Updated to support local Ollama with streaming and chunking.
 */
const Commands = {
    commandHistory: [],
    pendingSummary: null,
    chatSession: [],

    async process(input) {
        const commands = input.split(/&&|;/);
        let results = '';

        for (const cmdStr of commands) {
            if (cmdStr.trim()) {
                const result = await this.executeSingle(cmdStr.trim());
                results += result;
            }
        }
        return results;
    },

    async executeSingle(input, onChunk = null) {
        // Discard pending if a new command starts with '/'
        if (this.pendingSummary && input.trim().startsWith('/')) {
            this.pendingSummary = null;
        }

        // Handle pending summary confirmation (y/n)
        if (this.pendingSummary) {
            const answer = input.trim().toLowerCase();
            const summaryData = this.pendingSummary;
            this.pendingSummary = null;

            if (answer === 'y' || answer === 'yes') {
                try {
                    await Storage.saveSummary(summaryData);
                    return '<div class="success">Summary saved successfully.</div>';
                } catch (e) {
                    return `<div class="error">Error saving summary: ${e.message}</div>`;
                }
            } else if (answer === 'n' || answer === 'no') {
                return '<div class="response">Summary discarded.</div>';
            } else {
                this.pendingSummary = summaryData;
                return `<div class="response" style="color: var(--accent-prompt);">You have a pending save. Save it? (y/n) or type a new command to discard.</div>`;
            }
        }

        const parts = input.trim().split(' ');
        const command = parts[0].toLowerCase().replace('/', ''); 
        const args = parts.slice(1);

        switch (command) {
            case 'n':
            case 'add':
                // Handled in main.js UI interceptors
                return '';
            case 'a':
            case 'list':
                return await this.list();
            case 'view':
            case 'v':
                return await this.view(args[0]);
            case 'delete':
            case 'd':
                return await this.delete(args[0]);
            case 'undo':
                return await this.undo();
            case 'history':
                return this.showHistory();
            case 'clear':
                return 'CLEAR_SCREEN';
            case 'help':
                return this.help();
            case 'search':
                return await this.search(args.join(' '));
            case 'ask':
                return await this.ask(args.join(' '), onChunk);
            case 'chat':
                return await this.chat(args.join(' '), onChunk);
            case 'summarize':
                return await this.summarize(args[0], onChunk);
            case 'rewrite':
                return await this.executeAIUtility(args[0], 'rewrite', 'Rewritten Note', onChunk);
            case 'explain':
                return await this.executeAIUtility(args[0], 'explain', 'Explanation', onChunk);
            case 'tags':
                return await this.executeAIUtility(args[0], 'generateTags', 'Tags', onChunk);
            case 'summaries':
                return await this.viewSummaries(args[0]);
            case 'tag':
                return await this.tag(args);
            case 'export':
                return await this.export();
            case 'import':
                return await this.import(args.join(' '));
            default:
                return `<div class="error">Command not recognized: ${this.escapeHtml(command)}. Type /help for assistance.</div>`;
        }
    },

    // --- CORE COMMAND IMPLEMENTATIONS ---

    async tag(args) {
        if (args.length < 1) return '<div class="error">Usage: /tag <name> [id]</div>';
        
        const tagNameInput = args[0].toLowerCase();
        const predefined = {
            'urgent': 'Urgent',
            'progress': 'In progress',
            'done': 'Done',
            'ref': 'Reference',
            'reference': 'Reference',
            'idea': 'Idea',
            'personal': 'Personal'
        };

        const resolvedTag = predefined[tagNameInput] || args[0];
        
        let noteId = args[1];
        if (!noteId) {
            const all = await Storage.getAll();
            if (all.length > 0) noteId = all[all.length - 1].id;
        }

        if (!noteId) return '<div class="error">No note found to tag.</div>';

        try {
            const note = await Storage.get(noteId);
            if (!note) return `<div class="error">Note #${noteId} not found.</div>`;
            
            const tags = note.tags || [];
            const index = tags.indexOf(resolvedTag);
            if (index > -1) {
                tags.splice(index, 1);
                await Storage.update(noteId, undefined, undefined, tags);
                return `<div class="success">Removed tag "${resolvedTag}" from note #${noteId}.</div>`;
            } else {
                tags.push(resolvedTag);
                await Storage.update(noteId, undefined, undefined, tags);
                return `<div class="success">Added tag "${resolvedTag}" to note #${noteId}.</div>`;
            }
        } catch (e) {
            return `<div class="error">Tag Error: ${e.message}</div>`;
        }
    },

    async add(content, title) {
        try {
            const id = await Storage.add(content, title);
            return `<div class="success">Note #${id.id} created successfully.</div>`;
        } catch (e) {
            return `<div class="error">Error creating note: ${e.message}</div>`;
        }
    },

    async update(id, content, title) {
        try {
            await Storage.update(id, content, title);
            return `<div class="success">Note #${id} updated.</div>`;
        } catch (e) {
            return `<div class="error">Error updating note: ${e.message}</div>`;
        }
    },

    async list() {
        const notes = await Storage.getAll();
        if (notes.length === 0) return '<div class="response">No notes found. Create one with <span class="note-id">/n &lt;title&gt;</span></div>';

        let html = '<div class="response"><div>Your Notes:</div>';
        notes.forEach(note => {
            const tagHtml = (note.tags || []).map(t => {
                const color = this.getTagColor(t);
                return `<span class="note-tag-chip ${color}">${t}</span>`;
            }).join('');
            
            html += `<div class="note-item"><span class="note-id">[${note.id}]</span> ${this.escapeHtml(note.title || 'Untitled')} ${tagHtml}</div>`;
        });
        html += '</div>';
        return html;
    },

    getTagColor(tag) {
        const map = {
            'Urgent': 'red',
            'In progress': 'yellow',
            'Done': 'green',
            'Reference': 'blue',
            'Idea': 'white',
            'Personal': 'purple'
        };
        return map[tag] || 'white';
    },

    async view(id) {
        if (!id) return '<div class="error">Usage: /view <id></div>';
        const note = await Storage.get(id);
        if (!note) return `<div class="error">Note with ID ${id} not found.</div>`;
        
        return `
            <div class="response">
                <div class="note-item"><span class="note-id">ID:</span> ${note.id}</div>
                <div class="note-item"><span class="note-id">Title:</span> ${this.escapeHtml(note.title || 'Untitled')}</div>
                <div class="note-item"><span class="note-id">Content:</span></div>
                <div class="note-content" style="white-space: pre-wrap; margin-top: 5px;">${this.escapeHtml(note.content)}</div>
            </div>
        `;
    },

    async delete(id) {
        if (!id) return '<div class="error">Usage: /delete <id></div>';
        const success = await Storage.delete(id);
        return success ? `<div class="success">Note ${id} deleted. (Type /undo to restore)</div>` : `<div class="error">Note ${id} not found.</div>`;
    },

    async undo() {
        const success = await Storage.undoDelete();
        return success ? '<div class="success">Last deletion restored.</div>' : '<div class="error">Nothing to undo.</div>';
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

    // --- AI COMMANDS (UPDATED FOR OLLAMA + STREAMING) ---

    async ask(query, onChunk) {
        if (!query) return '<div class="error">Usage: /ask &lt;query&gt;</div>';
        if (typeof AI === 'undefined') return '<div class="error">AI offline — ensure local AI service is running.</div>';

        const results = await Storage.search(query);
        const context = results.slice(0, 3).map(n => `[Note ${n.id}]: ${n.content}`).join('\n\n');

        if (onChunk) onChunk(`\n--- AI RESPONSE ---\n\n`);
        const res = await AI.ask(query, context, onChunk);

        if (!onChunk) {
            if (!res.success) return `<div class="error">AI Error: ${this.escapeHtml(res.error)}</div>`;
            return `<div class="response">--- AI RESPONSE ---\n\n${this.escapeHtml(res.data)}</div>`;
        }

        if (!res.success) onChunk(`\n\n[ERROR: ${res.error}]`);
        return ' ';
    },

    async chat(message, onChunk) {
        if (!message) return '<div class="error">Usage: /chat &lt;message&gt; (or /chat clear)</div>';
        if (message.toLowerCase() === 'clear') {
            this.chatSession = [];
            return '<div class="success">Chat history cleared.</div>';
        }
        if (typeof AI === 'undefined') return '<div class="error">AI offline — ensure local AI service is running.</div>';

        const results = await Storage.search(message);
        const context = results.slice(0, 2).map(n => `[Context Note ${n.id}]: ${n.content}`).join('\n\n');

        this.chatSession.push({ role: 'user', content: message });
        if (this.chatSession.length > (AI_CONFIG.CHAT_HISTORY_LIMIT || 10)) this.chatSession.shift();

        if (onChunk) onChunk(`\n--- CHAT ---\n\n`);
        const res = await AI.chat(message, this.chatSession, context, onChunk);

        if (res.success) {
            this.chatSession.push({ role: 'assistant', content: res.data });
            if (this.chatSession.length > (AI_CONFIG.CHAT_HISTORY_LIMIT || 10)) this.chatSession.shift();
            
            // Set pending summary to ask for save (linked to first context note if available)
            const noteId = results.length > 0 ? results[0].id : null;
            if (noteId) {
                this.pendingSummary = { noteId: parseInt(noteId), text: res.data, type: 'chat', createdAt: Date.now() };
                return `\n\n<span style="color:var(--accent-prompt);">Save this response? (y/n)</span>`;
            }
        }

        if (!onChunk) {
            if (!res.success) return `<div class="error">AI Error: ${this.escapeHtml(res.error)}</div>`;
            return `<div class="response">--- CHAT ---\n\n${this.escapeHtml(res.data)}</div>`;
        }

        if (!res.success) onChunk(`\n\n[ERROR: ${res.error}]`);
        return ' ';
    },

    async summarize(id, onChunk) {
        if (!id || !/^\d+$/.test(id)) return '<div class="error">Usage: /summarize &lt;id&gt;</div>';
        const note = await Storage.get(id);
        if (!note) return `<div class="error">Note ${id} not found.</div>`;
        if (typeof AI === 'undefined') return '<div class="error">AI offline — ensure local AI service is running.</div>';

        if (onChunk) onChunk(`\n--- SUMMARY (#${id}) ---\n\n`);
        const res = await AI.summarize(note.content, onChunk);

        if (res.success) {
            this.pendingSummary = { noteId: parseInt(id), text: res.data, type: 'full', createdAt: Date.now() };
            return `\n\n<span style="color:var(--accent-prompt);">Save this summary? (y/n)</span>`;
        } else {
            if (onChunk) onChunk(`\n\n[ERROR: ${res.error}]`);
            return ``;
        }
    },

    async executeAIUtility(id, task, label, onChunk) {
        if (!id || !/^\d+$/.test(id)) return `<div class="error">Usage: /${task} &lt;id&gt;</div>`;
        const note = await Storage.get(id);
        if (!note) return `<div class="error">Note #${id} not found.</div>`;
        if (typeof AI === 'undefined') return '<div class="error">AI offline — ensure local AI service is running.</div>';

        if (onChunk) onChunk(`\n--- ${label.toUpperCase()} ---\n\n`);
        const res = await AI[task](note.content, onChunk);

        if (!onChunk) {
            if (!res.success) return `<div class="error">${label} Error: ${res.error}</div>`;
            return `<div class="response">--- ${label.toUpperCase()} ---\n\n${res.data}</div>`;
        }
        
        if (!res.success) onChunk(`\n\n[ERROR: ${res.error}]`);
        return ' '; 
    },

    // --- SYSTEM & HELP ---

    viewSummaries(id) {
        return Storage.getSummariesByNoteId(id).then(summaries => {
            if (!summaries || summaries.length === 0) return `<div class="response">No summaries found for Note #${id}.</div>`;
            let html = `<div class="response"><div style="font-weight: 600; color: var(--color-text);">Summaries for Note #${id}</div><br>`;
            summaries.forEach((s, i) => {
                const dateStr = new Date(s.createdAt).toISOString().slice(0, 10);
                html += `<div class="note-item"><span class="note-id">[${i + 1}]</span> Created: ${dateStr}</div>`;
                html += `<div class="note-content" style="white-space: pre-wrap; margin-bottom: 12px;">${this.escapeHtml(s.text)}</div>`;
            });
            html += '</div>';
            return html;
        });
    },

    showHistory() {
        if (this.commandHistory.length === 0) return '<div class="response">Command history is empty.</div>';
        return `<div class="response"><div>Command History:</div>${this.commandHistory.map(c => `<div class="note-item">${this.escapeHtml(c)}</div>`).join('')}</div>`;
    },

    help() {
        return `
            <div class="ai-response-block">
                <div class="ai-response-header">
                    <span class="material-symbols-outlined">terminal</span>
                    MONOLITH_CMD COMMAND REFERENCE (LOCAL AI)
                </div>
                <div class="ai-response-content">
                    <div style="margin-bottom:12px;opacity:0.5;font-size:0.75rem">CORE OPERATIONS</div>
                    <div class="note-item"><span class="note-id">/n &lt;title&gt;</span> Create a new note</div>
                    <div class="note-item"><span class="note-id">/a</span> List all notes</div>
                    <div class="note-item"><span class="note-id">/view &lt;id&gt;</span> View a note</div>
                    <div class="note-item"><span class="note-id">/delete &lt;id&gt;</span> Delete a note</div>
                    <div class="note-item"><span class="note-id">/search &lt;query&gt;</span> Keyword search</div>
                    <div class="note-item"><span class="note-id">/tag &lt;name&gt; [id]</span> Assign/toggle a tag</div>

                    <div style="margin:16px 0 8px;opacity:1;font-color:var(--color-success);font-size:0.75rem">NAVIGATION</div>
                    <div class="note-item"><span class="note-id">/history</span> View command & AI history</div>
                    <div class="note-item"><span class="note-id">/commands</span> Command reference explorer</div>
                    <div class="note-item"><span class="note-id">/notes</span> Browse all saved notes</div>
                    <div class="note-item"><span class="note-id">/settings</span> Configure your experience</div>
                    <div class="note-item"><span class="note-id">/terminal</span> Return to terminal focus</div>

                    <div style="margin:16px 0 8px;opacity:1;font-color:var(--color-success);font-size:0.75rem">AI / INTELLIGENCE (Llama 3.2)</div>
                    <div class="note-item"><span class="note-id">/ask &lt;query&gt;</span> Question answering using your notes</div>
                    <div class="note-item"><span class="note-id">/chat &lt;message&gt;</span> Continuous chat with notes context</div>
                    <div class="note-item"><span class="note-id">/summarize &lt;id&gt;</span> Bullet-point summary (saves to history)</div>
                    <div class="note-item"><span class="note-id">/rewrite &lt;id&gt;</span> Improve clarity of a note</div>
                    <div class="note-item"><span class="note-id">/explain &lt;id&gt;</span> Simplified ELI5 explanation</div>
                    <div class="note-item"><span class="note-id">/tags &lt;id&gt;</span> Auto-generate JSON tags</div>

                    <div style="margin-top:16px;padding-top:12px;border-top:1px solid rgba(72,69,85,0.15);opacity:0.4;font-size:0.6875rem">
                        System status: Local AI @ 127.0.0.1:11434 | model: llama3.2:3b
                    </div>
                </div>
            </div>
        `;
    },

    escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    },

    async export() {
        const count = await Storage.export();
        return `<div class="success">Exported ${count} notes.</div>`;
    },

    async import(jsonString) {
        if (!jsonString) return '<div class="error">Usage: /import <json_string></div>';
        try {
            const count = await Storage.import(jsonString);
            return `<div class="success">Imported ${count} notes.</div>`;
        } catch (e) {
            return `<div class="error">Import failed: ${e.message}</div>`;
        }
    }
};

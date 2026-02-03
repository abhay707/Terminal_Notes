document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('command-input');
    const output = document.getElementById('output');
    const terminalContainer = document.getElementById('terminal-container');
    
    // Editor Elements
    const editorOverlay = document.getElementById('editor-overlay');
    const editorTextarea = document.getElementById('editor-textarea');
    const editorTitle = document.getElementById('editor-title');
    const editorSave = document.getElementById('editor-save');
    const editorDelete = document.getElementById('editor-delete');
    const editorCancel = document.getElementById('editor-cancel');
    
    // Viewer Elements
    const viewerOverlay = document.getElementById('viewer-overlay');
    const viewerContent = document.getElementById('viewer-content');
    const viewerHeader = document.getElementById('viewer-header');
    const viewerClose = document.getElementById('viewer-close');
    const viewerEdit = document.getElementById('viewer-edit');
    const viewerDelete = document.getElementById('viewer-delete');
    
    // Modal Elements
    const deleteModal = document.getElementById('delete-modal');
    const modalYes = document.getElementById('modal-yes');
    const modalNo = document.getElementById('modal-no');

    const chips = document.querySelectorAll('.chip');

    // Theme management
    const AVAILABLE_THEMES = ['dark', 'light', 'solarized-dark', 'dracula'];

    function applyTheme(themeName) {
        if (!AVAILABLE_THEMES.includes(themeName)) return false;
        document.documentElement.setAttribute('data-theme', themeName);
        try {
            localStorage.setItem('terminal-notes-theme', themeName);
        } catch (_) {
            // Ignore storage errors (e.g. private mode)
        }
        return true;
    }

    function getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || 'dark';
    }

    (function initTheme() {
        let initial = 'dark';
        try {
            const saved = localStorage.getItem('terminal-notes-theme');
            if (saved && AVAILABLE_THEMES.includes(saved)) {
                initial = saved;
            }
        } catch (_) {
            // Fallback to default
        }
        applyTheme(initial);
    })();

    // State
    let history = [];
    let historyIndex = -1;
    let currentNoteId = null; // For editing existing notes
    let noteToDeleteId = null; // For modal confirmation

    // Focus input on load
    input.focus();
    
    // Global Click Handler
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#editor-overlay') && 
            !e.target.closest('#viewer-overlay') && 
            !e.target.closest('#delete-modal')) {
            input.focus();
        }
    });

    // Welcome message
    addToOutput(`
        <div class="response">
            Welcome to Terminal Notes v1.1<br>
            Type '/help' to see available commands.
        </div>
    `);

    // Sync history with Commands object
    function updateCommandHistory(cmd) {
        history.push(cmd);
        historyIndex = history.length;
        Commands.commandHistory = [...history];
    }

    // Handle chip clicks
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const cmd = chip.dataset.cmd;
            input.value = cmd + ' ';
            input.focus();
        });
    });

    // --- Editor Logic ---
    function openEditor(content = '', title = '', id = null) {
        editorTextarea.value = content;
        editorTitle.value = title;
        currentNoteId = id;
        editorOverlay.classList.remove('hidden');
        if (!title) {
            editorTitle.focus();
        } else {
            editorTextarea.focus();
        }
    }

    function closeEditor() {
        editorOverlay.classList.add('hidden');
        editorTextarea.value = '';
        editorTitle.value = '';
        currentNoteId = null;
        input.focus();
    }

    async function saveNote() {
        const content = editorTextarea.value;
        const title = editorTitle.value;
        
        if (content.trim() || title.trim()) {
            let result;
            if (currentNoteId) {
                // Update existing
                try {
                    await Storage.update(currentNoteId, content, title);
                    result = `<div class="success">Note [${currentNoteId}] updated.</div>`;
                } catch (e) {
                    result = `<div class="error">Error updating note: ${e.message}</div>`;
                }
            } else {
                // Create new
                result = await Commands.add(content, title);
            }
            addToOutput(result);
        }
        closeEditor();
    }

    // Paste Image Logic
    editorTextarea.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (const item of items) {
            if (item.kind === 'file') {
                const blob = item.getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target.result;
                    const markdownImage = `\n![image](${base64})\n`;
                    
                    const start = editorTextarea.selectionStart;
                    const end = editorTextarea.selectionEnd;
                    const text = editorTextarea.value;
                    editorTextarea.value = text.substring(0, start) + markdownImage + text.substring(end);
                };
                reader.readAsDataURL(blob);
            }
        }
    });

    editorSave.addEventListener('click', saveNote);
    editorCancel.addEventListener('click', closeEditor);
    
    // Editor Shortcuts
    const handleEditorKeydown = (e) => {
        if (e.key === 'Escape') {
            closeEditor();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            saveNote();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            // If currentNoteId is null, we are discarding an unsaved note
            openDeleteModal(currentNoteId || 'unsaved');
        }
    };
    editorTextarea.addEventListener('keydown', handleEditorKeydown);
    editorTitle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') editorTextarea.focus();
        handleEditorKeydown(e);
    });


    // --- Viewer Logic ---
    function openViewer(htmlContent, headerText = '', id = null) {
        viewerContent.innerHTML = htmlContent;
        viewerHeader.textContent = headerText;
        if (id) {
            viewerOverlay.dataset.noteId = id;
            viewerEdit.classList.remove('hidden'); // Show edit button
        } else {
            delete viewerOverlay.dataset.noteId;
            viewerEdit.classList.add('hidden'); // Hide edit if list view
        }
        viewerOverlay.classList.remove('hidden');
    }

    function closeViewer() {
        viewerOverlay.classList.add('hidden');
        viewerContent.innerHTML = '';
        viewerHeader.textContent = '';
        input.focus();
    }

    viewerClose.addEventListener('click', closeViewer);
    
    viewerEdit.addEventListener('click', async () => {
        const id = viewerOverlay.dataset.noteId;
        if (id) {
            const note = await Storage.get(id);
            if (note) {
                closeViewer();
                openEditor(note.content, note.title, note.id);
            }
        }
    });

    viewerDelete.addEventListener('click', () => {
        const id = viewerOverlay.dataset.noteId;
        if (id) {
            openDeleteModal(id);
        } else {
            // In list view, maybe prompt for ID? Or disable button?
            // For now, let's assume delete button in viewer is only for single note view.
            // But if user clicked delete in list view, nothing happens.
        }
    });

    // Viewer Shortcuts
    document.addEventListener('keydown', (e) => {
        if (!viewerOverlay.classList.contains('hidden') && deleteModal.classList.contains('hidden')) {
            if (e.key === 'Escape') {
                closeViewer();
            } else if (e.key === 'e' && viewerOverlay.dataset.noteId) {
                 // Edit shortcut
                 e.preventDefault();
                 viewerEdit.click();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'd' && viewerOverlay.dataset.noteId) {
                // Delete shortcut
                e.preventDefault();
                openDeleteModal(viewerOverlay.dataset.noteId);
            }
        }
    });

    // --- Delete Modal Logic ---
    function openDeleteModal(id) {
        noteToDeleteId = id;
        deleteModal.classList.remove('hidden');
        modalYes.focus();
        modalYes.classList.add('selected');
        modalNo.classList.remove('selected');
    }

    function closeDeleteModal() {
        deleteModal.classList.add('hidden');
        noteToDeleteId = null;
        // Return focus to viewer if open
        if (!viewerOverlay.classList.contains('hidden')) {
            // focus something in viewer?
        } else {
            input.focus();
        }
    }

    async function confirmDelete() {
        if (noteToDeleteId) {
            if (noteToDeleteId === 'unsaved') {
                closeDeleteModal();
                closeEditor();
                addToOutput('<div class="response">Note discarded.</div>');
            } else {
                const result = await Commands.delete(noteToDeleteId);
                addToOutput(result);
                closeDeleteModal();
                closeViewer(); // Close viewer after delete
                closeEditor(); // Close editor if it was open
            }
        }
    }

    modalYes.addEventListener('click', confirmDelete);
    modalNo.addEventListener('click', closeDeleteModal);

    // Modal Keyboard Navigation
    document.addEventListener('keydown', (e) => {
        if (!deleteModal.classList.contains('hidden')) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                if (document.activeElement === modalYes) {
                    modalNo.focus();
                    modalNo.classList.add('selected');
                    modalYes.classList.remove('selected');
                } else {
                    modalYes.focus();
                    modalYes.classList.add('selected');
                    modalNo.classList.remove('selected');
                }
            } else if (e.key === 'Enter') {
                if (document.activeElement === modalYes) confirmDelete();
                else closeDeleteModal();
            } else if (e.key === 'Escape') {
                closeDeleteModal();
            }
        }
    });


    // --- Main Input Handler ---
    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const commandLine = input.value;
            
            if (commandLine.trim() !== '') {
                updateCommandHistory(commandLine);

                // Echo command
                addToOutput(`
                    <div class="command-line">
                        <span class="prompt">$</span>
                        <span class="command-text">${escapeHtml(commandLine)}</span>
                    </div>
                `);

                // Support Chaining for UI interception?
                // Complex if mixed UI and non-UI commands.
                // For now, let's process split here to intercept UI commands
                const commands = commandLine.split(/&&|;/);
                
                for (const cmdStr of commands) {
                    const command = cmdStr.trim();
                    if (!command) continue;

                    const parts = command.split(' ');
                    const baseCmd = parts[0].toLowerCase().replace('/', '');
                    const args = parts.slice(1);

                    // UI Interceptions
                    if (baseCmd === 'n' || baseCmd === 'add') {
                        // /n <title> -> Open editor with title
                        const title = args.join(' ');
                        openEditor('', title); // Content empty, title from args
                    } else if (baseCmd === 'edit') {
                        const query = args.join(' ');
                        if (!query) {
                            addToOutput('<div class="error">Usage: /edit <id or title></div>');
                            continue;
                        }
                        
                        // Try ID first
                        let note = await Storage.get(query);
                        if (!note) {
                            // Try search by title (approximate via search)
                            const results = await Storage.search(query);
                            if (results.length > 0) {
                                note = results[0]; // Take best match
                            }
                        }

                        if (note) {
                            openEditor(note.content, note.title, note.id);
                        } else {
                            addToOutput(`<div class="error">Note not found: ${query}</div>`);
                        }

                    } else if ((baseCmd === 'a' || baseCmd === 'list') && args.length === 0) {
                        const result = await Commands.list();
                        openViewer(result, 'All Notes');
                    } else if (baseCmd === 'view' || baseCmd === 'v') {
                        // /view <id>
                        if (args.length === 0) {
                             addToOutput('<div class="error">Usage: /view <id></div>');
                             continue;
                        }
                        const id = args[0];
                        const note = await Storage.get(id);
                        if (note) {
                             // Custom rendering for viewer
                             const html = `
                                <div class="note-item"><span class="note-id">ID:</span> ${note.id}</div>
                                <div class="note-item"><span class="note-id">Date:</span> ${new Date(note.timestamp).toLocaleString()}</div>
                                <div class="note-content-view">${renderMarkdown(note.content)}</div>
                             `;
                             openViewer(html, note.title || `Note ${note.id}`, note.id);
                        } else {
                            addToOutput(`<div class="error">Note ${id} not found.</div>`);
                        }
                    } else if (baseCmd === 'theme') {
                        // /theme -> list themes
                        // /theme <name> -> switch
                        if (args.length === 0) {
                            const current = getCurrentTheme();
                            const items = AVAILABLE_THEMES.map(t => {
                                const label = t === current ? `${t} (current)` : t;
                                return `<div class="note-item">${label}</div>`;
                            }).join('');
                            addToOutput(`
                                <div class="response">
                                    <div>Available themes:</div>
                                    ${items}
                                    <div class="note-item" style="margin-top: 8px; font-size: 12px;">
                                        Use <span class="note-id">/theme &lt;name&gt;</span> to switch.
                                    </div>
                                </div>
                            `);
                        } else {
                            const name = args[0].toLowerCase();
                            if (applyTheme(name)) {
                                addToOutput(`<div class="success">Theme switched to ${name}.</div>`);
                            } else {
                                const list = AVAILABLE_THEMES.join(', ');
                                addToOutput(`<div class="error">Unknown theme: ${escapeHtml(name)}. Available themes: ${list}.</div>`);
                            }
                        }
                    } else {
                        // Standard execution
                        const result = await Commands.executeSingle(command);
                        if (result === 'CLEAR_SCREEN') {
                            output.innerHTML = '';
                        } else {
                            addToOutput(result);
                        }
                    }
                }
            } else {
                 addToOutput(`
                    <div class="command-line">
                        <span class="prompt">$</span>
                    </div>
                `);
            }

            input.value = '';
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIndex > 0) {
                historyIndex--;
                input.value = history[historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex < history.length - 1) {
                historyIndex++;
                input.value = history[historyIndex];
            } else {
                historyIndex = history.length;
                input.value = '';
            }
        }
    });

    function addToOutput(html) {
        output.insertAdjacentHTML('beforeend', html);
        requestAnimationFrame(() => {
            terminalContainer.scrollTop = terminalContainer.scrollHeight;
        });
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function renderMarkdown(text) {
        if (!text) return '';
        let html = escapeHtml(text);
        
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Images: ![alt](url) - Note: url might be base64, so it can be long.
        // The escapeHtml escapes [ ] ( ) so we need to match escaped versions?
        // Actually escapeHtml replaces < > & " '
        // It does NOT replace [ ] ( )
        
        // Image regex
        html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; border-radius: 8px; margin: 10px 0;">');
        
        // Link regex
        html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color: #58a6ff;">$1</a>');

        // Newlines
        html = html.replace(/\n/g, '<br>');

        return html;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('command-input');
    const output = document.getElementById('output');
    const editorOverlay = document.getElementById('editor-overlay');
    const editorTextarea = document.getElementById('editor-textarea');
    const editorSave = document.getElementById('editor-save');
    const editorCancel = document.getElementById('editor-cancel');
    const viewerOverlay = document.getElementById('viewer-overlay');
    const viewerContent = document.getElementById('viewer-content');
    const viewerClose = document.getElementById('viewer-close');
    const chips = document.querySelectorAll('.chip');

    // Focus input on load and click (unless clicking in overlay)
    input.focus();
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#editor-overlay') && !e.target.closest('#viewer-overlay')) {
            input.focus();
        }
    });

    // Command history
    let history = [];
    let historyIndex = -1;

    // Welcome message
    addToOutput(`
        <div class="response">
            Welcome to Terminal Notes v1.0
            Type '/help' to see available commands.
        </div>
    `);

    // Handle chip clicks
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const cmd = chip.dataset.cmd;
            input.value = cmd + ' ';
            input.focus();
        });
    });

    // Overlay controls
    function openEditor(initialContent = '') {
        editorTextarea.value = initialContent;
        editorOverlay.classList.remove('hidden');
        editorTextarea.focus();
    }

    function closeEditor() {
        editorOverlay.classList.add('hidden');
        editorTextarea.value = '';
        input.focus();
    }

    async function saveNote() {
        const content = editorTextarea.value;
        if (content.trim()) {
            const result = await Commands.add(content);
            addToOutput(result);
        }
        closeEditor();
    }

    function openViewer(htmlContent) {
        viewerContent.innerHTML = htmlContent;
        viewerOverlay.classList.remove('hidden');
        // If viewing a single note, we might want to capture its ID for shortcuts?
        // For now, viewer is just display.
    }

    function closeViewer() {
        viewerOverlay.classList.add('hidden');
        viewerContent.innerHTML = '';
        input.focus();
    }

    // Editor Events
    editorSave.addEventListener('click', saveNote);
    editorCancel.addEventListener('click', closeEditor);
    editorTextarea.addEventListener('keydown', (e) => {
        const isEnter = e.key === 'Enter';
        const isSaveShortcut = (e.ctrlKey || e.metaKey) && isEnter;

        if (isSaveShortcut) {
            e.preventDefault();
            saveNote();
        } else if (e.key === 'Escape') {
            closeEditor();
        }
    });

    // Viewer Events
    viewerClose.addEventListener('click', closeViewer);
    document.addEventListener('keydown', (e) => {
        if (!viewerOverlay.classList.contains('hidden')) {
            if (e.key === 'Escape') {
                closeViewer();
            } else if (e.ctrlKey && e.key === 'd') {
                // Try to extract ID from viewer content if possible
                // This is a bit hacky as we rely on DOM structure
                const idSpan = viewerContent.querySelector('.note-id');
                if (idSpan) {
                    // Assuming format "ID: 123" or "[123]"
                    const text = idSpan.textContent;
                    const idMatch = text.match(/\d+/);
                    if (idMatch) {
                        e.preventDefault();
                        const id = idMatch[0];
                        // Execute delete
                        Commands.delete(id).then(result => {
                            closeViewer();
                            addToOutput(result);
                        });
                    }
                }
            }
        }
    });


    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const command = input.value;
            
            if (command.trim() !== '') {
                // Add to history
                history.push(command);
                historyIndex = history.length;

                // Echo command
                addToOutput(`
                    <div class="command-line">
                        <span class="prompt">$</span>
                        <span class="command-text">${escapeHtml(command)}</span>
                    </div>
                `);

                // Special handling for UI triggers
                const parts = command.trim().split(' ');
                const baseCmd = parts[0].toLowerCase().replace('/', '');

                if ((baseCmd === 'n' || baseCmd === 'add') && parts.length === 1) {
                    // Open editor
                    openEditor();
                } else if ((baseCmd === 'n' || baseCmd === 'add') && parts.length > 1) {
                    // Pre-fill editor
                    openEditor(parts.slice(1).join(' '));
                } else if ((baseCmd === 'a' || baseCmd === 'list') && parts.length === 1) {
                    // Open viewer with list
                    const result = await Commands.list();
                    openViewer(result);
                } else if (baseCmd === 'view') {
                     // Open viewer with specific note
                     const result = await Commands.process(command);
                     if (!result.includes('class="error"')) {
                         openViewer(result);
                     } else {
                         addToOutput(result);
                     }
                } else {
                    // Process standard command
                    const result = await Commands.process(command);

                    if (result === 'CLEAR_SCREEN') {
                        output.innerHTML = '';
                    } else {
                        addToOutput(result);
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
            output.scrollTop = output.scrollHeight;
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});

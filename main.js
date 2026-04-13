/* ============================================================
   MONOLITH_CMD — Main Application Controller
   Coordinates router, views, terminal, editor, and modals
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  // --- Core Elements ---
  const input = document.getElementById('commandInput');
  const output = document.getElementById('output');
  const terminalContainer = document.getElementById('terminal-container');

  // Editor Elements
  const editorTitleInput = document.getElementById('editor-title');
  const editorTextarea = document.getElementById('editor-textarea');
  const editorGutter = document.getElementById('editor-gutter');
  const editorWordCount = document.getElementById('editor-word-count');
  const editorBreadcrumb = document.getElementById('editor-breadcrumb');
  const editorMetaCreated = document.getElementById('editor-meta-created');
  const editorMetaDelete = document.getElementById('editor-meta-delete');

  // Nav Editor Actions
  const btnEditorCancel = document.getElementById('btn-editor-cancel');
  const btnEditorSave = document.getElementById('btn-editor-save');

  // Delete Modal
  const deleteOverlay = document.getElementById('delete-overlay');
  const deleteMessage = document.getElementById('delete-message');
  const btnDeleteYes = document.getElementById('btn-delete-yes');
  const btnDeleteNo = document.getElementById('btn-delete-no');

  // Nav Elements
  const navLinks = document.querySelectorAll('#nav-links .nav-link');
  const btnSettings = document.getElementById('btn-settings');
  const navLogo = document.getElementById('nav-logo');

  // --- State ---
  let commandHistory = [];
  let historyIndex = -1;
  let currentNoteId = null;
  let noteToDeleteId = null;
  let lastDeletedNoteId = null;
  let zenMode = false;

  // --- Initialize Storage ---
  await Storage.init();

  // --- Initialize Views ---
  if (typeof NotesExplorer !== 'undefined') NotesExplorer.init();
  if (typeof CommandsExplorer !== 'undefined') CommandsExplorer.init();
  if (typeof HistoryView !== 'undefined') HistoryView.init();
  if (typeof SettingsView !== 'undefined') SettingsView.init();

  // --- Initialize Router ---
  Router.onChange((viewName, params) => {
    handleViewChange(viewName, params);
  });
  Router.init();

  // --- Nav Bar Listeners ---
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.getAttribute('data-view');
      if (view) Router.navigateTo(view);
    });
  });

  if (btnSettings) {
    btnSettings.addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigateTo('settings');
    });
  }

  const btnTerminal = document.getElementById('btn-terminal');
  if (btnTerminal) {
    btnTerminal.addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigateTo('terminal');
    });
  }

  if (navLogo) {
    navLogo.addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigateTo('terminal');
    });
  }

  // --- Welcome Message ---
  renderStartupSplash();

  function renderStartupSplash() {
    const showArt = SettingsView.get('showStartupArt');
    
    if (showArt) {
      const art = startupArt().join('\n');
      addToOutput(`<div class="startup-logo">${art}</div>`);
      addToOutput(`
        <div class="response" style="opacity:0.5; margin-top:-16px; margin-bottom:24px">
          v1.0  ·  terminal-first notes  ·  type <span class="note-id">/help</span> to begin
        </div>
      `);
    }

    addToOutput(`
      <div class="command-line">
        <span class="prompt">→</span>
        <span class="command-text">Last login: ${new Date().toString().substring(0, 24)} on ttys001</span>
      </div>
      ${!showArt ? '<div class="response">Type <span class="note-id">/help</span> to see available commands.</div>' : ''}
    `);
  }

  // --- View Change Handler ---
  function handleViewChange(viewName, params = {}) {
    const navMain = document.querySelector('.nav-bar-inner:not([id])');
    const navEditor = document.getElementById('nav-editor-actions');

    // Toggle Nav Bar Visibility
    if (viewName === 'editor') {
      if (navMain) navMain.classList.add('hidden');
      if (navEditor) navEditor.classList.remove('hidden');
      openEditor(params);
    } else {
      if (navMain) navMain.classList.remove('hidden');
      if (navEditor) navEditor.classList.add('hidden');
      
      switch (viewName) {
        case 'notes':
          if (typeof NotesExplorer !== 'undefined') NotesExplorer.load();
          break;
        case 'commands':
          if (typeof CommandsExplorer !== 'undefined') CommandsExplorer.load();
          break;
        case 'history':
          if (typeof HistoryView !== 'undefined') HistoryView.load();
          break;
        case 'terminal':
          requestAnimationFrame(() => {
            if (input) input.focus();
          });
          break;
        case 'settings':
          if (typeof SettingsView !== 'undefined') SettingsView.applySettingsToUI();
          break;
      }
    }

    // Apply global font size and line numbers everywhere on view change if needed
    if (typeof SettingsView !== 'undefined') {
      const gs = SettingsView.get('fontSize');
      if (gs) document.documentElement.style.setProperty('--editor-font-size', gs + 'px');
      
      const sln = SettingsView.get('showLineNumbers');
      const gutter = document.getElementById('editor-gutter');
      if (gutter) gutter.style.display = sln ? '' : 'none';
      
      const theme = SettingsView.get('theme');
      if (theme) document.documentElement.setAttribute('data-theme', theme);
    }

    // Update active state in nav links
    navLinks.forEach(link => {
      if (link.getAttribute('data-view') === viewName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // ============================================================
  // EDITOR LOGIC
  // ============================================================

  function openEditor(params = {}) {
    currentNoteId = params.noteId || null;

    if (params.mode === 'edit' && params.noteId) {
      Storage.get(params.noteId).then(note => {
        if (note) {
          if (editorTitleInput) editorTitleInput.value = note.title || '';
          if (editorTextarea) editorTextarea.value = note.content || '';
          const navCtx = document.getElementById('nav-context-editor');
          if (navCtx) navCtx.textContent = 'EDIT_NOTE';
          const safeName = (note.title || 'untitled').replace(/\s+/g, '_').toLowerCase();
          if (editorBreadcrumb) editorBreadcrumb.textContent = `root@monolith:~/notes/${safeName}.md`;
          if (editorMetaCreated) {
            editorMetaCreated.textContent = note.createdAt
              ? new Date(note.createdAt).toISOString().replace('T', ' ').substring(0, 19)
              : '—';
          }
          updateLineNumbers();
          updateWordCount();
          requestAnimationFrame(() => editorTextarea && editorTextarea.focus());
        }
      });
    } else {
      if (editorTitleInput) editorTitleInput.value = params.title || '';
      if (editorTextarea) editorTextarea.value = '';
      const navCtx = document.getElementById('nav-context-editor');
      if (navCtx) navCtx.textContent = 'NEW_NOTE';
      if (editorBreadcrumb) editorBreadcrumb.textContent = 'root@monolith:~/notes/new_draft.md';
      if (editorMetaCreated) editorMetaCreated.textContent = new Date().toISOString().replace('T', ' ').substring(0, 19);
      updateLineNumbers();
      updateWordCount();
      requestAnimationFrame(() => {
        if (params.title && editorTextarea) editorTextarea.focus();
        else if (editorTitleInput) editorTitleInput.focus();
      });
    }
  }

  function closeEditor() {
    Router.navigateTo('terminal');
  }

  let isSaving = false;
  async function saveNote() {
    if (isSaving) return;
    const content = editorTextarea ? editorTextarea.value : '';
    const title = editorTitleInput ? editorTitleInput.value : '';

    if (content.trim() || title.trim()) {
      isSaving = true;
      try {
        let result;
        if (currentNoteId) {
          try {
            await Storage.update(currentNoteId, content, title);
            result = `<div class="success">Note [${currentNoteId}] updated.</div>`;
            addHistoryEntry(`/edit ${currentNoteId}`, `Updated: ${title || 'Untitled'}`, 'edit');
          } catch (e) {
            result = `<div class="error">Error updating note: ${e.message}</div>`;
          }
        } else {
          try {
            result = await Commands.add(content, title);
            addHistoryEntry(`/n ${title}`, `Created new note: ${title || 'Untitled'}`, 'create');
          } catch (e) {
            result = `<div class="error">Error creating note: ${e.message}</div>`;
          }
        }
        addToOutput(result);
      } finally {
        isSaving = false;
      }
    }
    closeEditor();
  }

  // --- Editor Listeners ---
  if (btnEditorCancel) btnEditorCancel.addEventListener('click', closeEditor);
  if (btnEditorSave) btnEditorSave.addEventListener('click', saveNote);

  async function handleDeleteNote() {
    const id = currentNoteId || noteToDeleteId;
    if (!id) return;
    
    try {
      await Storage.delete(id);
      lastDeletedNoteId = id;
      addToOutput(`<div class="success">Note [${id}] deleted. Press ⌘+Z to undo.</div>`);
      closeEditor();
      if (Router.getCurrentView() === 'notes') NotesExplorer.load();
    } catch (e) {
      addToOutput(`<div class="error">Error deleting note: ${e.message}</div>`);
    }
  }

  async function handleUndoDelete() {
    if (!lastDeletedNoteId) {
      addToOutput(`<div class="response">No recently deleted note to restore.</div>`);
      return;
    }
    try {
      await Storage.restore(lastDeletedNoteId);
      addToOutput(`<div class="success">Note [${lastDeletedNoteId}] restored.</div>`);
      lastDeletedNoteId = null;
      if (Router.getCurrentView() === 'notes') NotesExplorer.load();
    } catch (e) {
      addToOutput(`<div class="error">Error restoring note: ${e.message}</div>`);
    }
  }

  if (editorMetaDelete) {
    editorMetaDelete.addEventListener('click', () => {
      if (currentNoteId) handleDeleteNote();
    });
  }

  if (editorTextarea) {
    editorTextarea.addEventListener('input', () => {
      updateLineNumbers();
      updateWordCount();
    });
    editorTextarea.addEventListener('keydown', handleEditorKeydown);
  }

  if (editorTitleInput) {
    editorTitleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') editorTextarea && editorTextarea.focus();
      handleEditorKeydown(e);
    });
  }

  function handleEditorKeydown(e) {
    if (Router.getCurrentView() !== 'editor') return;
    if (e.key === 'Escape') closeEditor();
  }

  function updateLineNumbers() {
    if (!editorGutter || !editorTextarea) return;
    
    // Check setting
    if (typeof SettingsView !== 'undefined' && !SettingsView.get('showLineNumbers')) {
      editorGutter.style.display = 'none';
      return;
    } else {
      editorGutter.style.display = '';
    }

    const lines = editorTextarea.value.split('\n').length;
    const maxLines = Math.max(lines, 6);
    let html = '';
    for (let i = 1; i <= maxLines; i++) {
      html += `<span>${String(i).padStart(2, '0')}</span>`;
    }
    editorGutter.innerHTML = html;
  }

  function updateWordCount() {
    if (!editorWordCount || !editorTextarea) return;
    const words = editorTextarea.value.trim().split(/\s+/).filter(w => w.length > 0).length;
    editorWordCount.textContent = `${words} word${words !== 1 ? 's' : ''}`;
  }

  // ============================================================
  // TERMINAL INPUT HANDLER
  // ============================================================

  async function processCommandLine(commandLine) {
    if (commandLine.trim() === '') return;

    updateCommandHistory(commandLine);
    addToOutput(`
      <div class="command-line">
        <span class="prompt">→</span>
        <span class="command-text">${escapeHtml(commandLine)}</span>
      </div>
    `);

    const commands = commandLine.split(/&&|;/);
    for (const cmdStr of commands) {
      const command = cmdStr.trim();
      if (!command) continue;

      const parts = command.split(' ');
      const baseCmd = parts[0].toLowerCase().replace('/', '');
      const args = parts.slice(1);

      // UI Interceptions
      if (['history', 'commands', 'settings', 'terminal', 'notes', 'setting'].includes(baseCmd)) {
        const destView = baseCmd === 'setting' ? 'settings' : baseCmd;
        Router.navigateTo(destView);
      } else if (baseCmd === 'n' || baseCmd === 'add') {
        Router.navigateTo('editor', { mode: 'new', title: args.join(' ') });
      } else if (baseCmd === 'edit') {
        const query = args.join(' ');
        if (query) {
          let note = await Storage.get(query);
          if (!note) {
            const results = await Storage.search(query);
            if (results.length > 0) note = results[0];
          }
          if (note) Router.navigateTo('editor', { noteId: note.id, mode: 'edit' });
          else addToOutput(`<div class="error">Note not found: ${escapeHtml(query)}</div>`);
        }
      } else if (['summarize', 'ask', 'chat', 'rewrite', 'explain', 'tags'].includes(baseCmd)) {
        handleAICommand(baseCmd, command);
      } else {
        // Track ID for /v and /view commands in terminal to help tagging system
        if ((baseCmd === 'v' || baseCmd === 'view') && args.length > 0) {
          const id = parseInt(args[0]);
          if (!isNaN(id)) currentNoteId = id;
        }

        const result = await Commands.executeSingle(command);
        if (result === 'CLEAR_SCREEN') output.innerHTML = '';
        else if (result) addToOutput(result);
      }
    }
    input.value = '';
    input.focus();
  }

  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      processCommandLine(input.value);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        historyIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        input.value = commandHistory[commandHistory.length - 1 - historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        input.value = commandHistory[commandHistory.length - 1 - historyIndex];
      } else {
        historyIndex = -1;
        input.value = '';
      }
    }
  });

  // --- Quick Actions Menu ---
  const btnQuickActions = document.getElementById('btn-quick-actions');
  const quickActionsPanel = document.getElementById('quick-actions-panel');

  if (btnQuickActions && quickActionsPanel) {
    btnQuickActions.addEventListener('click', (e) => {
      e.stopPropagation();
      quickActionsPanel.classList.toggle('hidden');
    });

    // Close on click outside
    window.addEventListener('click', (e) => {
      if (!quickActionsPanel.classList.contains('hidden') && !quickActionsPanel.contains(e.target)) {
        quickActionsPanel.classList.add('hidden');
      }
    });

    // Handle Tiles
    const tiles = quickActionsPanel.querySelectorAll('.quick-action-tile');
    tiles.forEach(tile => {
      tile.addEventListener('click', async () => {
        const action = tile.getAttribute('data-action');
        quickActionsPanel.classList.add('hidden');

        switch (action) {
          case 'new_note':
            input.value = '/n ';
            input.focus();
            break;
          case 'list_notes':
            processCommandLine('/a');
            break;
          case 'search':
            input.value = '/search ';
            input.focus();
            break;
          case 'view_last':
            const all = await Storage.getAll();
            if (all.length > 0) {
              const last = all[all.length - 1];
              processCommandLine(`/v ${last.id}`);
            } else {
              addToOutput('<div class="response">No notes found.</div>');
            }
            break;
          case 'delete':
            input.value = '/d ';
            input.focus();
            break;
          case 'clear':
            processCommandLine('/clear');
            break;
        }
      });
    });

    // Close on Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        quickActionsPanel.classList.add('hidden');
      }
    });
  }

  // --- Tag Picker Menu ---
  const btnTagPicker = document.getElementById('btn-tag-picker');
  const tagPickerPanel = document.getElementById('tag-picker-panel');
  const tagChips = document.querySelectorAll('.tag-chips-container .tag-chip');

  if (btnTagPicker && tagPickerPanel) {
    btnTagPicker.addEventListener('click', async (e) => {
      e.stopPropagation();
      const isHidden = tagPickerPanel.classList.contains('hidden');
      
      // Close other panels
      if (quickActionsPanel) quickActionsPanel.classList.add('hidden');
      
      if (isHidden) {
        // Refresh active tags for current note if in editor or last viewed
        await refreshActiveTags();
        tagPickerPanel.classList.remove('hidden');
      } else {
        tagPickerPanel.classList.add('hidden');
      }
    });

    tagChips.forEach(chip => {
      chip.addEventListener('click', async () => {
        const tagName = chip.getAttribute('data-tag');
        await toggleTag(tagName);
        chip.classList.toggle('active');
      });
    });

    // Close on click outside
    window.addEventListener('click', (e) => {
      if (!tagPickerPanel.classList.contains('hidden') && !tagPickerPanel.contains(e.target)) {
        tagPickerPanel.classList.add('hidden');
      }
    });

    // Close on Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        tagPickerPanel.classList.add('hidden');
      }
    });
  }

  async function refreshActiveTags() {
    let noteId = currentNoteId;
    
    // If not in editor, try to find last viewed note from history or state
    if (!noteId) {
      const all = await Storage.getAll();
      if (all.length > 0) noteId = all[all.length - 1].id;
    }

    if (noteId) {
      const note = await Storage.get(noteId);
      const activeTags = note.tags || [];
      tagChips.forEach(chip => {
        const tagName = chip.getAttribute('data-tag');
        if (activeTags.includes(tagName)) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      });
    }
  }

  async function toggleTag(tagName) {
    let noteId = currentNoteId;
    if (!noteId) {
      const all = await Storage.getAll();
      if (all.length > 0) noteId = all[all.length - 1].id;
    }

    if (!noteId) {
      addToOutput('<div class="error">Create or select a note first to assign tags.</div>');
      return;
    }

    try {
      const note = await Storage.get(noteId);
      const currentTags = note.tags || [];
      const index = currentTags.indexOf(tagName);
      
      if (index > -1) {
        currentTags.splice(index, 1);
      } else {
        currentTags.push(tagName);
      }
      
      await Storage.update(noteId, undefined, undefined, currentTags);
      
      // If we are in the notes explorer, refresh it
      if (Router.getCurrentView() === 'notes') NotesExplorer.load();
      
    } catch (e) {
      addToOutput(`<div class="error">Failed to toggle tag: ${e.message}</div>`);
    }
  }

  function updateCommandHistory(cmd) {
    commandHistory.push(cmd);
    if (commandHistory.length > 100) commandHistory.shift();
    historyIndex = -1;
    if (typeof Commands !== 'undefined') Commands.commandHistory = [...commandHistory];
  }

  function addToOutput(html) {
    if (!output) return;
    output.insertAdjacentHTML('beforeend', html);
    if (terminalContainer) terminalContainer.scrollTop = terminalContainer.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function buildAILoadingMessage(text) {
    return `<div class="response ai-loading" style="opacity:0.5;display:flex;align-items:center;gap:8px"><span class="material-symbols-outlined" style="font-size:14px;animation:spin 1s linear infinite">progress_activity</span>${text}</div>`;
  }

  function removeLastLoading() {
    const el = output.querySelector('.ai-loading:last-of-type');
    if (el) el.remove();
  }

  function wrapAIResponse(html) {
    return `<div class="ai-response-block"><div class="ai-response-header"><span class="material-symbols-outlined">auto_awesome</span>INTELLIGENT RESPONSE ENGINE</div><div class="ai-response-content">${html}</div></div>`;
  }

  async function handleAICommand(baseCmd, command) {
    addToOutput(buildAILoadingMessage('Initializing local AI...'));
    const streamId = 'stream-' + Date.now();
    addToOutput(wrapAIResponse(`<div id="${streamId}" style="white-space: pre-wrap;"></div>`));
    const streamTarget = document.getElementById(streamId);
    let hasReceivedFirstChunk = false;

    const onChunk = (text) => {
      if (!hasReceivedFirstChunk) { removeLastLoading(); hasReceivedFirstChunk = true; }
      if (streamTarget) {
        streamTarget.textContent += text;
        if (terminalContainer) terminalContainer.scrollTop = terminalContainer.scrollHeight;
      }
    };

    try {
      const result = await Commands.executeSingle(command, onChunk);
      if (result) {
        if (streamTarget) streamTarget.insertAdjacentHTML('beforeend', result);
      }
      if (!hasReceivedFirstChunk) removeLastLoading();
      addHistoryEntry(command, 'AI Response', 'ai');
    } catch (err) {
      removeLastLoading();
      if (streamTarget) streamTarget.innerHTML = `<div class="error">AI Error: ${err.message}</div>`;
    }
  }

  // --- Global Keyboard Shortcuts ---
  document.addEventListener('keydown', async (e) => {
    const isEditing = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';
    if (typeof SettingsView === 'undefined') return;

    const shortcuts = SettingsView.get('shortcuts');
    if (!shortcuts) return;

    function matches(actionId) {
      const combo = shortcuts[actionId];
      if (!combo) return false;
      return compareEventToShortcut(e, combo);
    }

    // New note
    if (matches('new_note')) {
      e.preventDefault();
      Router.navigateTo('editor', { mode: 'new' });
    }
    
    // Search notes
    else if (matches('search_notes')) {
      e.preventDefault();
      Router.navigateTo('notes');
      setTimeout(() => {
        const searchInput = document.getElementById('notes-search');
        if (searchInput) searchInput.focus();
      }, 50);
    }

    // Save note
    else if (matches('save_note')) {
      if (Router.getCurrentView() === 'editor') {
        e.preventDefault();
        saveNote();
      }
    }

    // Toggle note list
    else if (matches('toggle_note_list')) {
      e.preventDefault();
      if (Router.getCurrentView() === 'notes') Router.navigateTo('terminal');
      else Router.navigateTo('notes');
    }

    // Delete note
    else if (matches('delete_note')) {
      if (Router.getCurrentView() === 'editor' && currentNoteId) {
        e.preventDefault();
        handleDeleteNote();
      }
    }

    // Undo delete
    else if (matches('undo_delete') && !isEditing) {
      e.preventDefault();
      handleUndoDelete();
    }

    // Open command palette
    else if (matches('open_command_palette')) {
      e.preventDefault();
      Router.navigateTo('commands');
    }

    // View note / Confirm
    else if (matches('view_note')) {
      if (Router.getCurrentView() === 'editor') {
        e.preventDefault();
        saveNote();
      }
    }

    // Switch theme
    else if (matches('switch_theme')) {
      e.preventDefault();
      toggleTheme();
    }

    // Toggle zen mode
    else if (matches('toggle_zen_mode')) {
      e.preventDefault();
      toggleZenMode();
    }

    // '/' focuses the active command/action input
    else if (e.key === '/' && !isEditing) {
      const currentView = Router.getCurrentView();
      let targetInput = null;

      switch (currentView) {
        case 'terminal': targetInput = document.getElementById('commandInput'); break;
        case 'history':  targetInput = document.getElementById('history-input'); break;
        case 'notes':    targetInput = document.getElementById('notes-action-input'); break;
        case 'commands': targetInput = document.getElementById('commands-action-input'); break;
      }

      if (targetInput) {
        e.preventDefault();
        targetInput.focus();
        targetInput.value = '/';
      }
    }
  });

  /**
   * Compare a keyboard event to a shortcut string (e.g. "⌘ + Shift + T")
   */
  function compareEventToShortcut(e, shortcutStr) {
    if (!shortcutStr) return false;
    const parts = shortcutStr.split(' + ').map(p => p.trim());
    
    // Check modifiers
    const needsCmd = parts.includes('⌘');
    const needsShift = parts.includes('Shift');
    const needsAlt = parts.includes('Alt');
    
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const hasCmd = isMac ? e.metaKey : e.ctrlKey;
    
    if (needsCmd !== hasCmd) return false;
    if (needsShift !== e.shiftKey) return false;
    if (needsAlt !== e.altKey) return false;
    
    // Check main key
    const mainKey = parts[parts.length - 1].toUpperCase();
    let eventKey = e.key.toUpperCase();
    if (eventKey === ' ') eventKey = 'SPACE';
    if (eventKey === 'ESCAPE') eventKey = 'ESC';
    if (eventKey === 'BACKSPACE') eventKey = 'DELETE';
    
    return mainKey === eventKey;
  }

  // --- Settings Navigation ---
  const btnSettingsTerminal = document.getElementById('btn-settings-terminal');
  if (btnSettingsTerminal) {
    btnSettingsTerminal.addEventListener('click', () => {
      Router.navigateTo('terminal');
    });
  }

  function toggleZenMode() {
    zenMode = !zenMode;
    document.body.classList.toggle('zen-mode', zenMode);
    addToOutput(`<div class="response">Zen mode ${zenMode ? 'enabled' : 'disabled'}.</div>`);
  }

  function toggleTheme() {
    if (typeof SettingsView === 'undefined') return;
    const currentTheme = SettingsView.get('theme') || 'monolith';
    const nextTheme = currentTheme === 'monolith' ? 'high-contrast' : 'monolith';
    
    SettingsView.set('theme', nextTheme);
    addToOutput(`<div class="response">Theme switched to ${nextTheme.replace('-', ' ').toUpperCase()}.</div>`);
  }

  async function addHistoryEntry(command, result, type) {
    try { await Storage.addHistory({ command, result, type, timestamp: Date.now() }); } catch (e) {}
  }

  /**
   * Returns ASCII art logo as an array of lines
   */
  function startupArt() {
    return [
      " ███╗   ███╗ ██████╗ ███╗   ██╗ ██████╗ ██╗     ██╗████████╗██╗  ██╗     ██████╗███╗   ███╗██████╗ ",
      " ████╗ ████║██╔═══██╗████╗  ██║██╔═══██╗██║     ██║╚══██╔══╝██║  ██║    ██╔════╝████╗ ████║██╔══██╗",
      " ██╔████╔██║██║   ██║██╔██╗ ██║██║   ██║██║     ██║   ██║   ███████║    ██║     ██╔████╔██║██║  ██║",
      " ██║╚██╔╝██║██║   ██║██║╚██╗██║██║   ██║██║     ██║   ██║   ██╔══██║    ██║     ██║╚██╔╝██║██║  ██║",
      " ██║ ╚═╝ ██║╚██████╔╝██║ ╚████║╚██████╔╝███████╗██║   ██║   ██║  ██║    ╚██████╗██║ ╚═╝ ██║██████╔╝",
      " ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚══════╝╚═╝   ╚═╝   ╚═╝  ╚═╝     ╚═════╝╚═╝     ╚═╝╚═════╝ "
    ];
  }
});

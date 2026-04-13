/* ============================================================
   MONOLITH_CMD — Notes Explorer View
   Renders notes as rich cards with search, tags, and navigation
   ============================================================ */

const NotesExplorer = (() => {
  let allNotes = [];
  let filteredNotes = [];

  /**
   * Initialize the notes explorer
   */
  function init() {
    const searchInput = document.getElementById('notes-search');
    const clearBtn = document.getElementById('notes-clear-search');
    const actionInput = document.getElementById('notes-action-input');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filterNotes(e.target.value);
      });
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          searchInput.value = '';
          filterNotes('');
          searchInput.blur();
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        filterNotes('');
      });
    }

    if (actionInput) {
      actionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const cmd = actionInput.value.trim().toLowerCase();
          handleAction(cmd);
          actionInput.value = '';
        }
      });
    }
  }

  /**
   * Load and render all notes
   */
  async function load() {
    try {
      allNotes = await Storage.getAll();
      allNotes.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
      filteredNotes = [...allNotes];
      render(filteredNotes);
    } catch (err) {
      console.error('[NotesExplorer] Failed to load notes:', err);
      render([]);
    }
  }

  /**
   * Filter notes by search query
   */
  function filterNotes(query) {
    if (!query.trim()) {
      filteredNotes = [...allNotes];
    } else {
      const q = query.toLowerCase();
      filteredNotes = allNotes.filter(note =>
        (note.title && note.title.toLowerCase().includes(q)) ||
        (note.content && note.content.toLowerCase().includes(q))
      );
    }
    render(filteredNotes);
  }

  /**
   * Render note cards to the DOM
   */
  function render(notes) {
    const container = document.getElementById('notes-list');
    const countEl = document.getElementById('notes-count');

    if (countEl) {
      countEl.textContent = `${notes.length} OBJECT${notes.length !== 1 ? 'S' : ''} FOUND`;
    }

    if (!container) return;

    if (notes.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:48px 24px;opacity:0.3">
          <span class="material-symbols-outlined" style="font-size:48px;display:block;margin-bottom:16px">folder_open</span>
          <p style="font-family:var(--font-mono);font-size:0.8125rem">No notes found. Type <strong>/n Title</strong> in the terminal to create one.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = notes.map(note => {
      const title = note.title || 'Untitled';
      const preview = getPreview(note.content);
      const dateStr = formatDate(note.updatedAt || note.createdAt);
      const status = note.updatedAt && note.updatedAt !== note.createdAt ? 'MODIFIED' : 'CREATED';
      const autoTags = extractTags(note.title, note.content);
      const userTags = note.tags || [];
      const allTags = [...new Set([...userTags, ...autoTags])];
      const icon = getIcon(note);

      return `
        <div class="note-card" data-id="${note.id}" onclick="NotesExplorer.openNote(${note.id})">
          <div class="note-card-icon">
            <span class="material-symbols-outlined">${icon}</span>
          </div>
          <div class="note-card-body">
            <div class="note-card-title">${escapeHtml(title)}</div>
            <div class="note-card-preview">${escapeHtml(preview)}</div>
            <div class="note-card-tags">
              ${allTags.map(t => `<span class="tag-chip">${t}</span>`).join('')}
            </div>
          </div>
          <div class="note-card-meta">
            <div class="note-card-status">${status}</div>
            <div class="note-card-date">${dateStr}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Open a note in the editor
   */
  function openNote(id) {
    Router.navigateTo('editor', { noteId: id, mode: 'edit' });
  }

  /**
   * Handle action commands from the notes prompt
   */
  function handleAction(cmd) {
    if (['/history', 'history', '/commands', 'commands', '/settings', 'settings', '/terminal', 'terminal', '/setting', 'setting'].includes(cmd)) {
      const view = cmd.replace('/', '');
      const destView = view === 'setting' ? 'settings' : view;
      Router.navigateTo(destView);
      return;
    }
    if (cmd === 'new' || cmd === '/n') {
      Router.navigateTo('editor', { mode: 'new' });
    } else if (cmd.startsWith('search ') || cmd.startsWith('/search ')) {
      const query = cmd.replace(/^(\/search |search )/, '');
      const searchInput = document.getElementById('notes-search');
      if (searchInput) searchInput.value = query;
      filterNotes(query);
    } else if (cmd.startsWith('delete ') || cmd.startsWith('/d ')) {
      // Delegate to terminal for delete
      const parts = cmd.replace(/^(\/d |delete )/, '');
      if (typeof Commands !== 'undefined') {
        Commands.executeSingle(`/delete ${parts}`);
      }
    }
  }

  // --- Utility functions ---

  function getPreview(content) {
    if (!content) return 'Empty note...';
    // Strip markdown and truncate
    const plain = content
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n/g, ' ')
      .trim();
    return plain.length > 120 ? plain.substring(0, 120) + '...' : plain;
  }

  function formatDate(timestamp) {
    if (!timestamp) return '—';
    const d = new Date(timestamp);
    return d.toISOString().split('T')[0].replace(/-/g, '.');
  }

  function extractTags(title, content) {
    const tags = [];
    const text = `${title} ${content}`.toLowerCase();

    // Simple keyword-based tagging
    if (text.includes('api') || text.includes('endpoint'))   tags.push('API');
    if (text.includes('architect'))                           tags.push('ARCHITECTURE');
    if (text.includes('deploy') || text.includes('docker'))  tags.push('DEVOPS');
    if (text.includes('draft'))                               tags.push('DRAFT');
    if (text.includes('refactor'))                            tags.push('INTERNAL');
    if (text.includes('document'))                            tags.push('DOCUMENTATION');
    if (text.includes('bug') || text.includes('fix'))        tags.push('BUGFIX');
    if (text.includes('test'))                                tags.push('TESTING');

    if (tags.length === 0) tags.push('NOTE');
    return tags.slice(0, 3); // max 3 tags
  }

  function getIcon(note) {
    const title = (note.title || '').toLowerCase();
    if (title.includes('api') || title.includes('code'))     return 'code';
    if (title.includes('log') || title.includes('daily'))    return 'schedule';
    if (title.includes('check') || title.includes('todo'))   return 'checklist';
    if (title.includes('deploy'))                            return 'rocket_launch';
    return 'description';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    init,
    load,
    openNote
  };
})();

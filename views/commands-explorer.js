/* ============================================================
   MONOLITH_CMD — Commands Explorer View
   Searchable grid of command cards with categories and syntax
   ============================================================ */

const CommandsExplorer = (() => {
  // Command registry with metadata for display
  const COMMAND_REGISTRY = [
    {
      name: '/summarize',
      alias: null,
      category: 'INTELLIGENCE',
      icon: 'auto_awesome',
      description: 'Condense long-form technical notes into actionable bullet points while preserving context.',
      syntax: '/summarize [note_id] --focus=actionable',
      iconColor: 'var(--tertiary)'
    },
    {
      name: '/ask',
      alias: null,
      category: 'NEURAL SEARCH',
      icon: 'neurology',
      description: 'Execute a semantic query across your entire vault to retrieve specific knowledge kernels.',
      syntax: '/ask "How does the auth flow work?"',
      iconColor: 'var(--secondary)'
    },
    {
      name: '/chat',
      alias: null,
      category: 'INTERACTIVE',
      icon: 'forum',
      description: 'Initiate an interactive session with the Monolith AI for pair-programming and ideation.',
      syntax: '/chat --mode=pair_programmer',
      iconColor: 'var(--tertiary)'
    },
    {
      name: '/rewrite',
      alias: null,
      category: 'PIPELINE',
      icon: 'edit_note',
      description: 'Improve technical clarity, fix grammar, or adjust the tone of the selected block.',
      syntax: '/rewrite --tone=concise',
      iconColor: 'var(--primary)'
    },
    {
      name: '/explain',
      alias: null,
      category: 'INTELLIGENCE',
      icon: 'school',
      description: 'Breakdown complex code snippets or architectural logic into simple, digestable steps.',
      syntax: '/explain [note_id]',
      iconColor: 'var(--tertiary)'
    },
    {
      name: '/tags',
      alias: null,
      category: 'AUTOMATION',
      icon: 'label',
      description: 'Analyze note content to automatically suggest and apply relevant taxonomy tags.',
      syntax: '/tags [note_id] --auto',
      iconColor: 'var(--secondary)'
    },
    {
      name: '/n',
      alias: '/add',
      category: 'CORE',
      icon: 'add_circle',
      description: 'Create a new note with the given title. Opens the editor for content entry.',
      syntax: '/n My New Project',
      iconColor: 'var(--secondary)'
    },
    {
      name: '/a',
      alias: '/list',
      category: 'CORE',
      icon: 'list',
      description: 'List all notes with their IDs and titles for quick navigation.',
      syntax: '/a',
      iconColor: 'var(--on-surface-variant)'
    },
    {
      name: '/view',
      alias: '/v',
      category: 'CORE',
      icon: 'visibility',
      description: 'View a specific note in a formatted reader window. Supports markdown rendering.',
      syntax: '/view 1',
      iconColor: 'var(--primary)'
    },
    {
      name: '/edit',
      alias: null,
      category: 'CORE',
      icon: 'edit',
      description: 'Edit an existing note by ID or title. Opens the editor with current content.',
      syntax: '/edit 1',
      iconColor: 'var(--primary)'
    },
    {
      name: '/delete',
      alias: '/d',
      category: 'DESTRUCTIVE',
      icon: 'delete',
      description: 'Delete a note after confirmation. Supports undo for the last deletion.',
      syntax: '/delete 1',
      iconColor: 'var(--error)'
    },
    {
      name: '/search',
      alias: null,
      category: 'QUERY',
      icon: 'search',
      description: 'Search notes by content or title using full-text matching.',
      syntax: '/search meeting notes',
      iconColor: 'var(--secondary)'
    },
    {
      name: '/export',
      alias: null,
      category: 'PIPELINE',
      icon: 'download',
      description: 'Export all notes to a JSON file for backup or migration.',
      syntax: '/export',
      iconColor: 'var(--tertiary)'
    },
    {
      name: '/history',
      alias: null,
      category: 'SYSTEM',
      icon: 'history',
      description: 'Switch to the history view to see a chronological log of all interactions.',
      syntax: '/history',
      iconColor: 'var(--on-surface-variant)'
    },
    {
      name: '/notes',
      alias: '/a',
      category: 'SYSTEM',
      icon: 'notes',
      description: 'Open the notes explorer to browse, search, and manage your saved content.',
      syntax: '/notes',
      iconColor: 'var(--secondary)'
    },
    {
      name: '/settings',
      alias: '/setting',
      category: 'SYSTEM',
      icon: 'settings',
      description: 'Configure application preferences, appearance, and keyboard shortcuts.',
      syntax: '/settings',
      iconColor: 'var(--on-surface-variant)'
    },
    {
      name: '/terminal',
      alias: null,
      category: 'SYSTEM',
      icon: 'terminal',
      description: 'Return to the primary terminal interface for command execution.',
      syntax: '/terminal',
      iconColor: 'var(--primary)'
    },
    {
      name: '/clear',
      alias: null,
      category: 'SYSTEM',
      icon: 'clear_all',
      description: 'Clear the terminal output. Does not delete any data.',
      syntax: '/clear',
      iconColor: 'var(--on-surface-variant)'
    },
    {
      name: '/help',
      alias: null,
      category: 'SYSTEM',
      icon: 'help',
      description: 'Display the complete help menu with all available commands.',
      syntax: '/help',
      iconColor: 'var(--on-surface-variant)'
    }
  ];

  let filteredCommands = [...COMMAND_REGISTRY];

  /**
   * Initialize command explorer
   */
  function init() {
    const searchInput = document.getElementById('commands-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filterCommands(e.target.value);
      });
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          searchInput.value = '';
          filterCommands('');
          searchInput.blur();
        }
      });
    }

    // CMD+K to focus search
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        if (Router.getCurrentView() === 'commands') {
          e.preventDefault();
          if (searchInput) searchInput.focus();
        }
      }
    });

    const actionInput = document.getElementById('commands-action-input');
    if (actionInput) {
      actionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const cmd = actionInput.value.trim().toLowerCase();
          if (cmd) {
            handleAction(cmd);
            actionInput.value = '';
          }
        }
      });
    }
  }

  /**
   * Handle navigation and actions from the commands prompt
   */
  function handleAction(cmd) {
    if (['/history', 'history', '/commands', 'commands', '/settings', 'settings', '/terminal', 'terminal', '/setting', 'setting', '/notes', 'notes'].includes(cmd)) {
      const view = cmd.replace('/', '');
      const destView = view === 'setting' ? 'settings' : view;
      Router.navigateTo(destView);
      return;
    }

    // Default: try to execute in terminal
    Router.navigateTo('terminal');
    const termInput = document.getElementById('commandInput');
    if (termInput) {
      termInput.value = cmd;
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        bubbles: true
      });
      termInput.dispatchEvent(enterEvent);
    }
  }

  /**
   * Load and render commands
   */
  function load() {
    filteredCommands = [...COMMAND_REGISTRY];
    render(filteredCommands);
  }

  /**
   * Filter commands by search query
   */
  function filterCommands(query) {
    if (!query.trim()) {
      filteredCommands = [...COMMAND_REGISTRY];
    } else {
      const q = query.toLowerCase();
      filteredCommands = COMMAND_REGISTRY.filter(cmd =>
        cmd.name.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        (cmd.alias && cmd.alias.toLowerCase().includes(q))
      );
    }
    render(filteredCommands);
  }

  /**
   * Render command cards
   */
  function render(commands) {
    const grid = document.getElementById('commands-grid');
    if (!grid) return;

    if (commands.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:48px 24px;opacity:0.3">
          <span class="material-symbols-outlined" style="font-size:48px;display:block;margin-bottom:16px">search_off</span>
          <p style="font-family:var(--font-mono);font-size:0.8125rem">No commands match your filter.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = commands.map(cmd => `
      <div class="command-card" onclick="CommandsExplorer.execute('${cmd.name}')">
        <div class="command-card-header">
          <span class="material-symbols-outlined command-card-icon" style="color:${cmd.iconColor}">${cmd.icon}</span>
          <span class="command-card-category">${cmd.category}</span>
        </div>
        <div class="command-card-name">${cmd.name}</div>
        <div class="command-card-desc">${cmd.description}</div>
        <div class="command-card-syntax">
          <span class="command-card-syntax-label">Syntax:</span>
          <span>${cmd.syntax}</span>
        </div>
      </div>
    `).join('');
  }

  /**
   * Execute a command from a card click
   */
  function execute(commandName) {
    // Navigate to terminal and insert the command
    Router.navigateTo('terminal');
    const input = document.getElementById('commandInput');
    if (input) {
      input.value = commandName + ' ';
      input.focus();
    }
  }

  return {
    init,
    load,
    execute
  };
})();

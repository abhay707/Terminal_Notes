/* ============================================================
   MONOLITH_CMD — Settings View
   Appearance, keyboard shortcuts (no account section)
   ============================================================ */

const SettingsView = (() => {
  // Settings state with defaults
  const defaults = {
    theme: 'monolith',
    fontSize: 14,
    showLineNumbers: true,
    showStartupArt: true,
    shortcuts: {
      new_note: '⌘ + N',
      search_notes: '⌘ + F',
      save_note: '⌘ + S',
      toggle_note_list: '⌘ + B',
      delete_note: '⌘ + Delete',
      undo_delete: '⌘ + Z',
      open_command_palette: '⌘ + K',
      view_note: '⌘ + Enter',
      switch_theme: '⌘ + Shift + T',
      toggle_zen_mode: 'F11'
    }
  };

  let settings = { ...defaults };

  /**
   * Initialize settings view
   */
  function init() {
    loadSettings();

    // Theme cards
    const themeCards = document.querySelectorAll('#settings-themes .theme-card');
    themeCards.forEach(card => {
      card.addEventListener('click', () => {
        themeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        settings.theme = card.getAttribute('data-theme');
        saveSettings();
        applyTheme();
      });
    });

    // Line numbers toggle
    const toggleBtn = document.getElementById('toggle-line-numbers');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        settings.showLineNumbers = !settings.showLineNumbers;
        toggleBtn.classList.toggle('active', settings.showLineNumbers);
        saveSettings();
        applyLineNumbers();
      });
    }

    // Font size slider (basic drag)
    initFontSlider();

    // Startup art toggle
    const startupArtToggleBtn = document.getElementById('toggle-startup-art');
    if (startupArtToggleBtn) {
      startupArtToggleBtn.addEventListener('click', () => {
        settings.showStartupArt = !settings.showStartupArt;
        startupArtToggleBtn.classList.toggle('active', settings.showStartupArt);
        saveSettings();
      });
    }

    // Shortcuts edit
    initShortcutsEdit();

    // Apply loaded settings to UI
    applySettingsToUI();
  }

  /**
   * Initialize shortcut editing logic
   */
  function initShortcutsEdit() {
    const editButtons = document.querySelectorAll('.shortcut-edit');
    editButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.shortcuts-row');
        const actionId = row.getAttribute('data-shortcut-id');
        const keysSpan = row.querySelector('.shortcut-keys');
        
        if (!actionId || !keysSpan) return;

        // Visual feedback: suggest we are listening
        const originalText = keysSpan.textContent;
        keysSpan.textContent = 'PRESS KEY...';
        keysSpan.style.color = 'var(--secondary)';
        
        const keyHandler = (e) => {
          // If only a modifier was pressed, wait for the actual key
          if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

          e.preventDefault();
          e.stopPropagation();

          const combo = formatKeyCombo(e);
          if (combo) {
            settings.shortcuts[actionId] = combo;
            keysSpan.textContent = combo;
            saveSettings();
          } else {
            keysSpan.textContent = originalText;
          }

          keysSpan.style.color = '';
          window.removeEventListener('keydown', keyHandler, true);
        };

        window.addEventListener('keydown', keyHandler, true);
      });
    });
  }

  /**
   * Format a keyboard event into a readable combo string
   */
  function formatKeyCombo(e) {
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return null;

    const parts = [];
    if (e.metaKey || e.ctrlKey) parts.push('⌘');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    
    let key = e.key.toUpperCase();
    if (key === ' ') key = 'Space';
    if (key === 'ESCAPE') key = 'Esc';
    if (key === 'BACKSPACE') key = 'Delete';
    
    parts.push(key);
    return parts.join(' + ');
  }

  /**
   * Load settings from localStorage
   */
  function loadSettings() {
    try {
      const saved = localStorage.getItem('monolith_settings');
      if (saved) {
        settings = { ...defaults, ...JSON.parse(saved) };
      }
      
      // Override with specific key if it exists, ensuring sync
      const specific = localStorage.getItem('terminal-notes-startup-art');
      if (specific !== null) {
        settings.showStartupArt = specific === 'true';
      }
    } catch (e) {
      console.warn('[Settings] Could not load settings:', e);
    }
  }

  /**
   * Save settings to localStorage
   */
  function saveSettings() {
    try {
      localStorage.setItem('monolith_settings', JSON.stringify(settings));
      // Specific key per user request
      localStorage.setItem('terminal-notes-startup-art', settings.showStartupArt);
    } catch (e) {
      console.warn('[Settings] Could not save settings:', e);
    }
  }

  /**
   * Apply settings to the UI elements
   */
  function applySettingsToUI() {
    // Theme cards
    const themeCards = document.querySelectorAll('#settings-themes .theme-card');
    themeCards.forEach(card => {
      card.classList.toggle('active', card.getAttribute('data-theme') === settings.theme);
    });

    // Line numbers toggle
    const toggleBtn = document.getElementById('toggle-line-numbers');
    if (toggleBtn) {
      toggleBtn.classList.toggle('active', settings.showLineNumbers);
    }

    // Startup art toggle
    const startupArtToggleBtn = document.getElementById('toggle-startup-art');
    if (startupArtToggleBtn) {
      startupArtToggleBtn.classList.toggle('active', !!settings.showStartupArt);
    }

    // Shortcuts
    updateShortcutsUI();

    // Apply effects
    applyLineNumbers();
    applyFontSize();
    applyTheme();
  }

  /**
   * Update the shortcuts table with current values
   */
  function updateShortcutsUI() {
    for (const [id, value] of Object.entries(settings.shortcuts)) {
      const row = document.querySelector(`.shortcuts-row[data-shortcut-id="${id}"]`);
      if (row) {
        const keysSpan = row.querySelector('.shortcut-keys');
        if (keysSpan) keysSpan.textContent = value;
      }
    }
  }

  /**
   * Apply line numbers setting
   */
  function applyLineNumbers() {
    const gutter = document.getElementById('editor-gutter');
    if (gutter) {
      gutter.style.display = settings.showLineNumbers ? '' : 'none';
    }
  }

  /**
   * Apply font size
   */
  function applyFontSize() {
    document.documentElement.style.setProperty('--editor-font-size', settings.fontSize + 'px');
    const textarea = document.getElementById('editor-textarea');
    if (textarea) {
      textarea.style.fontSize = settings.fontSize + 'px';
    }
  }

  /**
   * Apply theme
   */
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }

  /**
   * Initialize font size slider
   */
  function initFontSlider() {
    const track = document.getElementById('font-slider-track');
    const thumb = document.getElementById('font-slider-thumb');
    const fill = document.getElementById('font-slider-fill');
    const valueEl = document.getElementById('font-size-value');

    if (!track || !thumb) return;

    const MIN_SIZE = 10;
    const MAX_SIZE = 22;

    function updateSlider(size) {
      const percent = ((size - MIN_SIZE) / (MAX_SIZE - MIN_SIZE)) * 100;
      if (fill) fill.style.width = percent + '%';
      if (thumb) thumb.style.left = `calc(${percent}% - 7px)`;
      if (valueEl) valueEl.textContent = size + 'px';
    }

    // Click on track
    track.addEventListener('click', (e) => {
      const rect = track.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      settings.fontSize = Math.round(MIN_SIZE + percent * (MAX_SIZE - MIN_SIZE));
      updateSlider(settings.fontSize);
      saveSettings();
      applyFontSize();
    });

    // Drag thumb
    let dragging = false;
    thumb.addEventListener('mousedown', (e) => {
      dragging = true;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const rect = track.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      settings.fontSize = Math.round(MIN_SIZE + percent * (MAX_SIZE - MIN_SIZE));
      updateSlider(settings.fontSize);
    });

    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        saveSettings();
        applyFontSize();
      }
    });

    updateSlider(settings.fontSize);
  }

  function updateFontSliderUI() {
    const fill = document.getElementById('font-slider-fill');
    const thumb = document.getElementById('font-slider-thumb');
    const valueEl = document.getElementById('font-size-value');
    const MIN_SIZE = 10;
    const MAX_SIZE = 22;
    const percent = ((settings.fontSize - MIN_SIZE) / (MAX_SIZE - MIN_SIZE)) * 100;
    if (fill) fill.style.width = percent + '%';
    if (thumb) thumb.style.left = `calc(${percent}% - 7px)`;
    if (valueEl) valueEl.textContent = settings.fontSize + 'px';
  }

  /**
   * Get a setting value
   */
  function get(key) {
    return settings[key];
  }

  /**
   * Set a setting value
   */
  function set(key, value) {
    settings[key] = value;
    saveSettings();
    applySettingsToUI();
  }

  return {
    init,
    get,
    set,
    loadSettings,
    applySettingsToUI
  };
})();
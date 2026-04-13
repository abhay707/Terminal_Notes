/* ============================================================
   MONOLITH_CMD — SPA Router
   Lightweight hash-based view routing
   ============================================================ */

const Router = (() => {
  const VIEWS = ['terminal', 'notes', 'editor', 'commands', 'history', 'settings'];
  let currentView = 'terminal';
  let previousView = 'terminal';
  let viewParams = {};
  let onChangeCallbacks = [];

  /**
   * Navigate to a view by name
   * @param {string} viewName - One of VIEWS
   * @param {Object} [params] - Optional data to pass to the view
   */
  function navigateTo(viewName, params = {}) {
    if (!VIEWS.includes(viewName)) {
      console.warn(`[Router] Unknown view: ${viewName}`);
      return;
    }

    previousView = currentView;
    currentView = viewName;
    viewParams = params;

    // Update URL hash (without triggering hashchange again)
    const hash = `#${viewName}`;
    if (window.location.hash !== hash) {
      history.pushState(null, '', hash);
    }

    // Show/hide views
    VIEWS.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) {
        if (v === viewName) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      }
    });

    // Update nav bar state
    updateNavBar(viewName);

    // Fire callbacks
    onChangeCallbacks.forEach(cb => cb(viewName, params));
  }

  /**
   * Go back to the previous view
   */
  function goBack() {
    navigateTo(previousView);
  }

  /**
   * Get current view name
   */
  function getCurrentView() {
    return currentView;
  }

  /**
   * Get the current view's params
   */
  function getParams() {
    return viewParams;
  }

  /**
   * Register a callback for view changes
   * @param {Function} callback - (viewName, params) => void
   */
  function onChange(callback) {
    onChangeCallbacks.push(callback);
  }

  /**
   * Update nav bar to match current view
   */
  function updateNavBar(viewName) {
    // Update nav link active states
    const links = document.querySelectorAll('#nav-links .nav-link');
    links.forEach(link => {
      const target = link.getAttribute('data-view');
      if (target === viewName || (viewName === 'history' && target === 'terminal')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update context label
    const contextEl = document.getElementById('nav-context');
    const contextMap = {
      'terminal': 'TERMINAL',
      'notes': 'NOTES_EXPLORER',
      'editor': 'NEW_NOTE',
      'commands': 'COMMANDS',
      'history': 'HISTORY',
      'settings': 'SETTINGS'
    };
    if (contextEl) {
      contextEl.textContent = contextMap[viewName] || viewName.toUpperCase();
    }

    // Swap nav bar for editor view
    const mainNav = document.querySelector('.nav-bar-inner:not(#nav-editor-actions)');
    const editorNav = document.getElementById('nav-editor-actions');
    
    if (viewName === 'editor') {
      if (mainNav) mainNav.classList.add('hidden');
      if (editorNav) editorNav.classList.remove('hidden');
    } else {
      if (mainNav) mainNav.classList.remove('hidden');
      if (editorNav) editorNav.classList.add('hidden');
    }

    // Settings icon highlight
    const settingsBtn = document.getElementById('btn-settings');
    if (settingsBtn) {
      if (viewName === 'settings') {
        settingsBtn.style.color = 'var(--primary)';
        settingsBtn.style.opacity = '1';
      } else {
        settingsBtn.style.color = '';
        settingsBtn.style.opacity = '';
      }
    }
  }

  /**
   * Initialize router — read hash from URL
   */
  function init() {
    // Listen for hash changes (browser back/forward)
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1) || 'terminal';
      if (VIEWS.includes(hash) && hash !== currentView) {
        navigateTo(hash);
      }
    });

    // Handle popstate for back/forward
    window.addEventListener('popstate', () => {
      const hash = window.location.hash.slice(1) || 'terminal';
      if (VIEWS.includes(hash)) {
        navigateTo(hash);
      }
    });

    // Read initial hash
    const initialHash = window.location.hash.slice(1);
    if (initialHash && VIEWS.includes(initialHash)) {
      navigateTo(initialHash);
    } else {
      navigateTo('terminal');
    }
  }

  return {
    navigateTo,
    goBack,
    getCurrentView,
    getParams,
    onChange,
    init
  };
})();

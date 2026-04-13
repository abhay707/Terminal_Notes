/* ============================================================
   MONOLITH_CMD — History View
   Chronological timeline of commands grouped by date
   ============================================================ */

const HistoryView = (() => {

  /**
   * Initialize the history view
   */
  function init() {
    const input = document.getElementById('history-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const cmd = input.value.trim();
          if (cmd) {
            // Navigate to terminal and execute
            Router.navigateTo('terminal');
            const termInput = document.getElementById('commandInput');
            if (termInput) {
              termInput.value = cmd;
              // Dispatch enter key on terminal input
              const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                bubbles: true
              });
              termInput.dispatchEvent(enterEvent);
            }
            input.value = '';
          }
        }
      });
    }
  }

  /**
   * Load and render history
   */
  async function load() {
    let entries = [];
    try {
      entries = await Storage.getHistory();
    } catch (e) {
      // History store may not exist yet
      entries = [];
    }

    render(entries);
  }

  /**
   * Render history entries grouped by date
   */
  function render(entries) {
    const container = document.getElementById('history-body');
    if (!container) return;

    if (!entries || entries.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:64px 24px;opacity:0.3">
          <span class="material-symbols-outlined" style="font-size:48px;display:block;margin-bottom:16px">timeline</span>
          <p style="font-family:var(--font-mono);font-size:0.8125rem">No command history yet. Start typing commands in the terminal.</p>
        </div>
      `;
      return;
    }

    // Group by date
    const groups = groupByDate(entries);
    let html = '';

    for (const [label, items] of Object.entries(groups)) {
      html += `<div class="history-date-group">`;
      html += `<div class="history-date-label">${label}</div>`;

      items.forEach(entry => {
        const time = formatTime(entry.timestamp);
        const typeClass = getTypeClass(entry.type);
        const icon = getTypeIcon(entry.type);

        html += `
          <div class="history-entry">
            <span class="history-timestamp">${time}</span>
            <div class="history-icon ${typeClass}">
              <span class="material-symbols-outlined">${icon}</span>
            </div>
            <div class="history-content">
              <div class="history-command">&gt; ${escapeHtml(entry.command)}</div>
              ${entry.result ? `<div class="history-result">${escapeHtml(entry.result)}</div>` : ''}
            </div>
          </div>
        `;
      });

      html += `</div>`;
    }

    container.innerHTML = html;
  }

  /**
   * Group entries by date label
   */
  function groupByDate(entries) {
    const groups = {};
    const now = new Date();
    const today = now.toDateString();
    const yesterday = new Date(now - 86400000).toDateString();

    // Sort newest first
    const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);

    sorted.forEach(entry => {
      const d = new Date(entry.timestamp);
      const dateStr = d.toDateString();

      let label;
      if (dateStr === today) {
        label = 'TODAY';
      } else if (dateStr === yesterday) {
        label = 'YESTERDAY';
      } else {
        label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(entry);
    });

    return groups;
  }

  function formatTime(timestamp) {
    const d = new Date(timestamp);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  function getTypeClass(type) {
    const map = {
      'ai': 'type-ai',
      'export': 'type-export',
      'edit': 'type-edit',
      'create': 'type-create',
      'delete': 'type-delete',
      'system': 'type-system'
    };
    return map[type] || 'type-system';
  }

  function getTypeIcon(type) {
    const map = {
      'ai': 'psychology',
      'export': 'download',
      'edit': 'edit',
      'create': 'add_circle',
      'delete': 'delete',
      'search': 'search',
      'view': 'visibility',
      'system': 'terminal'
    };
    return map[type] || 'terminal';
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    init,
    load
  };
})();

# Project Guidelines

## 1. Project Overview

**Terminal Notes** (Monolith_CMD) is a minimalist, developer-focused note-taking application designed to run entirely in the browser. It mimics a terminal interface, allowing users to manage notes via command-line instructions while offering a full Markdown editor and advanced AI-integrated features.

-   **Target Audience:** Developers and CLI enthusiasts who prefer keyboard-driven workflows.
-   **Core Philosophy:**
    -   **Terminal-First:** Primary interaction is through the command line or command-prefixed explorers.
    -   **Keyboard-Driven:** Deeply integrated keyboard shortcuts for almost every action.
    -   **Local & Private:** Data is stored locally using IndexedDB; AI processing is performed locally via Ollama.
    -   **Intelligent:** Integrated AI utilities for summarizing, rewriting, and querying notes.

## 2. Tech Stack

-   **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+).
-   **Routing:** Custom hash-based SPA router (`router.js`).
-   **Storage:** IndexedDB (via a custom wrapper `db.js`) and `localStorage` for settings.
-   **AI Integration:** Local Ollama API (Llama 3.2:3b) with streaming support.
-   **Libraries:** None (Zero dependencies for the runtime application).
-   **Testing:** Vitest (Dev dependency).

## 3. Command System

The application uses a `/` prefix for commands. Commands can be chained using `&&` or `;`.

### 3.1 Core Operations
| Command | Alias | Description |
| :--- | :--- | :--- |
| `/n <title>` | `/add` | Create a new note and open the editor. |
| `/a` | `/list` | List all notes in the terminal. |
| `/view <id>` | `/v` | View a specific note in the terminal. |
| `/edit <query>` | - | Open a note in the editor by ID or Title search. |
| `/delete <id>` | `/d` | Delete a note (moves to trash). |
| `/undo` | - | Restore the last deleted note. |
| `/search <query>` | - | Perform a content and title search. |
| `/tag <name> [id]` | - | Toggle a specific tag for a note. |
| `/clear` | - | Clear the terminal output. |
| `/export` | - | Export all notes to JSON. |
| `/import <json>` | - | Import notes from JSON. |

### 3.2 Navigation Commands
Navigate between different views of the SPA.
| Command | View | Description |
| :--- | :--- | :--- |
| `/terminal` | Terminal | Return to the primary terminal interface. |
| `/notes` | Notes Explorer | Browse all notes with a graphical interface. |
| `/commands` | Command Explorer | Visual reference for all available commands. |
| `/history` | History View | View terminal command and AI interaction history. |
| `/settings` | Settings | Configure theme, layout, and shortcuts. |

### 3.3 AI-Integrated Commands
Requires a local Ollama instance running at `127.0.0.1:11434`.
| Command | Description |
| :--- | :--- |
| `/ask <query>` | Ask a question based on your note context. |
| `/chat <msg>` | Interactive chat with context from your notes. |
| `/summarize <id>` | AI-generated summary of a specific note. |
| `/rewrite <id>` | Refined version of a note for better clarity. |
| `/explain <id>` | Simple "ELI5" explanation of note content. |
| `/tags <id>` | Auto-generate suggested tags for a note. |
| `/summaries <id>` | View all previously saved AI summaries for a note. |

## 4. UI & Interaction Components

### 4.1 Quick Actions
A floating menu (bolt icon) provides rapid access to:
- New Note, List All, Search, View Last, Delete, and Clear.

### 4.2 Tag Picker
A dedicated tag management panel allows toggling predefined tags (Urgent, Progress, Done, Reference, Idea, Personal) on the current or last viewed note.

### 4.3 Startup Splash
Optional ASCII art splash screen that displays on session load, showing the "MONOLITH_CMD" logo and session stats.

## 5. Keyboard Shortcuts

| Action | Shortcut (Mac) | Shortcut (Win/Linux) |
| :--- | :--- | :--- |
| **New Note** | `⌘ + N` | `Ctrl + N` |
| **Search Notes** | `⌘ + F` | `Ctrl + F` |
| **Save Note** | `⌘ + S` | `Ctrl + S` |
| **Toggle Note List** | `⌘ + L` | `Ctrl + L` |
| **Delete Note** | `⌘ + Backspace` | `Ctrl + Del` |
| **Undo Delete** | `⌘ + Z` | `Ctrl + Z` |
| **Command Palette** | `⌘ + P` | `Ctrl + P` |
| **Zen Mode** | `⌘ + .` | `Ctrl + .` |
| **Switch Theme** | `⌘ + Shift + T` | `Ctrl + Shift + T` |
| **Focus Input** | `/` (while not typing) | `/` (while not typing) |

## 6. Project Structure

```
.
├── index.html           # Main SPA entry point
├── styles.css           # Global design system & layout
├── main.js              # Core controller & event orchestration
├── router.js            # SPA Routing logic
├── commands.js          # Command parsing & execution engine
├── storage.js           # High-level data management
├── db.js                # IndexedDB persistence layer
├── views/               # View-specific logic
│   ├── notes-explorer.js
│   ├── settings-view.js
│   ├── history-view.js
│   └── commands-explorer.js
├── ai/                  # AI Provider integration
│   ├── ai.js            # AI orchestration (Ollama)
│   └── providers/       # Implementation details for LLMs
└── .junie/              # Documentation
```

## 7. Configuration

User preferences are stored in `localStorage` and managed via the **Settings View**:
- **Appearance:** Theme selection, Startup Art toggle, Font Size.
- **Editor:** Line numbers toggle.
- **AI:** Model selection and configuration.
- **Shortcuts:** Customizable keyboard mapping.

## 8. Development & Testing

- **Testing:** Uses Vitest for unit tests. Run `npm test`.
- **Local Dev:** Use a simple static server (e.g., `npx serve .`).
## 9. Extending the Application

### 9.1 Adding a New Theme
1.  **CSS Variables:** Define variable overrides in `styles.css` using `html[data-theme="your-theme"]`.
2.  **Registration:** Add the theme name to the `AVAILABLE_THEMES` constant in `SettingsView`.
3.  **UI:** The settings view will automatically pick up the new theme for selection.

### 9.2 Adding AI Providers
The AI system is modular. To add a new provider:
1.  Create a new file in `ai/providers/`.
2.  Implement the required interface (ask, chat, summarize).
3.  Register the provider in `ai/ai.js`.

---
*Last Updated: 2026-04-13*

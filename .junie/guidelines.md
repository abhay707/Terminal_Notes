# Project Guidelines

## 1. Project Overview

**Terminal Notes** is a minimalist, developer-focused note-taking application designed to run entirely in the browser. It mimics a terminal interface, allowing users to manage notes via command-line instructions while offering a full Markdown editor for writing.

-   **Target Audience:** Developers and CLI enthusiasts who prefer keyboard-driven workflows.
-   **Core Philosophy:**
    -   **Terminal-First:** Primary interaction is through the command line.
    -   **Keyboard-Driven:** All actions (navigation, editing, deleting) have keyboard shortcuts.
    -   **Local & Private:** Data is stored locally using IndexedDB; no server or internet connection is required.

## 2. Tech Stack

-   **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+).
-   **Storage:** IndexedDB (via a custom wrapper `db.js`).
-   **Libraries:** None (Zero dependencies for the runtime application).
-   **Testing:** Vitest (Dev dependency).

## 3. Important Commands

| Command | Alias | Description |
| :--- | :--- | :--- |
| `/n <title>` | `/add` | Create a new note and open the editor. |
| `/a` | `/list` | List all notes in the viewer. |
| `/view <id>` | `/v` | View a specific note in a separate window. |
| `/edit <id>` | - | Edit an existing note by ID or Title. |
| `/delete <id>` | `/d` | Delete a note (moves to trash). |
| `/undo` | - | Restore the last deleted note. |
| `/search <query>` | - | Search note contents. |
| `/history` | - | Display command history. |
| `/clear` | - | Clear the terminal output. |
| `/help` | - | Show available commands. |

**Common Workflow:**
1.  Create a note: `/n Project Ideas`
2.  Write content in Markdown and save (`Ctrl+Enter`).
3.  List notes to find ID: `/a`
4.  View note: `/v 1`

## 4. Project Structure

```
.
├── index.html       # Main application entry point (UI structure)
├── styles.css       # Visual styling (themes, terminal look & feel)
├── main.js          # UI Logic (Event listeners, DOM manipulation)
├── commands.js      # Command processing engine
├── storage.js       # Data abstraction layer
├── db.js            # Low-level IndexedDB wrapper
├── package.json     # Dev dependencies and scripts
└── .junie/          # Project documentation
    └── guidelines.md
```

-   **`main.js`**: Handles the glue between the HTML UI and the logic. It manages overlays (Editor, Viewer) and intercepts specific commands that require UI interaction (like opening the editor).
-   **`commands.js`**: Parses user input, handles command chaining (`&&`), and executes non-UI commands (like `list` or `delete`).
-   **`db.js`**: Manages the IndexedDB connection, schema versioning, and raw CRUD operations.

## 5. Themes & Styling

Terminal Notes supports multiple visual themes while keeping a terminal-first, developer-focused aesthetic.

-   **Theme mechanism:**
    -   All colors and surfaces are defined via CSS variables in `styles.css`.
    -   The `<html>` element exposes the active theme via a `data-theme` attribute.
    -   The default theme is `dark` (no explicit `data-theme` or `data-theme="dark"`).
-   **Defined themes (initial set):**
    -   `dark` (default)
    -   `light`
    -   `solarized-dark`
    -   `dracula`

### 5.1 CSS Variable Structure

-   Base variables are declared in `:root` in `styles.css` (e.g. `--bg-body`, `--color-text`, `--accent-prompt`, `--surface-terminal`, etc.).
-   Each theme overrides some or all of these variables using attribute selectors:
    -   `html[data-theme="light"] { ... }`
    -   `html[data-theme="solarized-dark"] { ... }`
    -   `html[data-theme="dracula"] { ... }`
-   Component styles **never** hardcode theme colors directly; they use the variables instead.

### 5.2 Theme Commands & UX

-   `/theme` — list all available themes and highlight the current one.
-   `/theme <name>` — switch to a specific theme, e.g. `/theme dracula`.
-   On success, the terminal prints a success message (e.g. `Theme switched to dracula.`).
-   Invalid theme names fail gracefully with a helpful error and a list of valid themes.
-   Theme changes are instant and do not reload the page.

### 5.3 Persistence

-   The selected theme is stored in `localStorage` under the key `terminal-notes-theme`.
-   On load, `main.js` reads this value and applies it via `document.documentElement.dataset.theme`.
-   If no theme is stored, the app falls back to `dark`.

### 5.4 Adding a New Theme

To add a new theme:

1.  **Define variable overrides in `styles.css`:**

    -   Add a new block:
        -   `html[data-theme="my-theme"] { ... }`
    -   Override only what you need (backgrounds, text, accents, borders).
2.  **Register the theme in `main.js`:**

    -   Add the theme name to the `AVAILABLE_THEMES` array.
3.  **Test with the command:**

    -   Use `/theme my-theme` in the terminal.
4.  **Design guidelines:**
    -   Prioritise readability and calm, professional palettes.
    -   Avoid extreme neon contrast; aim for something you’d be comfortable in VS Code/iTerm/Obsidian.

## 5. Configuration & Tooling

The project uses a minimal Node.js setup primarily for testing.

-   **`package.json`**:
    -   **Scripts**:
        -   `test`: Runs the test suite (`vitest run`).
    -   **Dependencies**:
        -   `vitest`: Unit testing framework.

-   **Testing Setup**:
    -   The project is configured to use **Vitest**.
    -   Tests can be run via `npm test` or `npx vitest run`.
    -   *Note: Runtime application does not require Node.js.*

## 6. Convex & App Structure

*This project does not use Convex or any external backend services. It is a strictly client-side application.*

## 7. Testing Setup

To run tests:
1.  Install dependencies: `npm install`
2.  Run tests: `npm test`

A sample test configuration has been verified to ensure the environment is correctly set up for future unit testing of logic files (e.g., `commands.js` or `storage.js`).

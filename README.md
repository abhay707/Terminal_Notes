# Terminal Notes

**Terminal Notes** is a minimalist, developer-focused note-taking application that runs entirely in your browser. Inspired by command-line interfaces, it allows you to create, edit, and manage notes using simple commands, all while keeping your data private and local.

## 🚀 Features

*   **CLI-First Experience:** Interact with your notes using familiar commands like `/n`, `/ls`, and `/rm`.
*   **Markdown Support:** Write notes in Markdown. The viewer automatically renders bold, italics, links, and images.
*   **Image Support:** Paste images directly into the editor (Ctrl+V) to save them as Base64 strings.
*   **Local & Private:** All data is stored in your browser's IndexedDB. Nothing is sent to the cloud.
*   **Command Chaining:** Execute multiple commands at once using `&&` or `;` (e.g., `/n My Idea && /a`).
*   **Keyboard Shortcuts:** Optimized for keyboard-only usage.
*   **Responsive Design:** Works on desktop, tablets, and mobile devices.
*   **Themes:** Multiple editor/terminal themes (`dark`, `light`, `solarized-dark`, `dracula`) driven by CSS variables.

## 🛠️ Getting Started

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/Abhay-Chaturvedi/Terminal_Notes.git
    ```
2.  **Open the App:**
    Simply open `index.html` in any modern web browser. No server or backend installation required!

## ⌨️ Commands

| Command | Alias | Description | Example |
| :--- | :--- | :--- | :--- |
| `/n <title>` | `/add` | Create a new note. Opens the editor with the title. | `/n My New Project` |
| `/a` | `/list` | List all notes. | `/a` |
| `/view <id>` | `/v` | View a specific note in a separate window. | `/view 1` |
| `/edit <id>` | - | Edit an existing note by ID or Title. | `/edit 1` or `/edit My Note` |
| `/delete <id>` | `/d` | Delete a note. | `/delete 1` |
| `/undo` | - | Undo the last delete action. | `/undo` |
| `/search <query>` | - | Search notes by content or title. | `/search meeting` |
| `/history` | - | Show command history. | `/history` |
| `/export` | - | Export all notes to a JSON file. | `/export` |
| `/theme [name]` | - | List themes or switch the active theme. | `/theme dracula` |
| `/clear` | - | Clear the terminal output. | `/clear` |
| `/help` | - | Show the help menu. | `/help` |

> **Tip:** You can chain commands! Try: `/n Daily Task && /a`

## 🎹 Shortcuts

### Global
*   **`Arrow Up/Down`**: Navigate command history in the input field.

### Editor Window
*   **`Ctrl + Enter`** (or `Cmd + Enter`): Save the note.
*   **`Esc`**: Cancel / Close editor.
*   **`Ctrl + D`**: Delete the current note (triggers confirmation).

### Viewer Window
*   **`Esc`**: Close viewer.
*   **`e`**: Switch to Edit mode.
*   **`Ctrl + D`**: Delete the current note.

### Delete Confirmation
*   **`Left/Right Arrows`**: Select Yes/No.
*   **`Enter`**: Confirm choice.

## 📂 Project Structure

*   **`index.html`**: The main entry point containing the UI layout (Terminal, Editor, Viewer, Modal).
*   **`styles.css`**: CSS styles for themes, responsive layout, and components (driven by CSS variables).
*   **`main.js`**: Core application logic. Handles UI events, DOM manipulation, and input parsing.
*   **`commands.js`**: Command processing engine. Defines what each command (`/n`, `/a`, etc.) does.
*   **`storage.js`**: abstraction layer for data operations.
*   **`db.js`**: Low-level IndexedDB wrapper for handling data storage, versioning, and soft deletes.

## 👤 Author

**Abhay Chaturvedi**
*   GitHub: [@Abhay-Chaturvedi](https://github.com/abhay707)
    
---
*Built with vanilla HTML, CSS, and JavaScript.*

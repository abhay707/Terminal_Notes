# Terminal Notes (Monolith_CMD)

**Terminal Notes** is a minimalist, developer-focused note-taking application that runs entirely in your browser. Inspired by command-line interfaces, it allows you to create, edit, and manage notes using simple commands, all while keeping your data private and local.

## 🚀 Features

*   **CLI-First Experience:** Interact with your notes using familiar commands like `/n`, `/a`, and `/d`.
*   **Intelligent AI Integration:** Built-in support for local LLMs (via Ollama) to summarize, rewrite, and query your notes.
*   **Markdown Support:** Full-featured Markdown editor with live word count and line numbers.
*   **SPA Navigation:** Seamlessly switch between the Terminal, Notes Explorer, History, and Settings.
*   **Quick Actions:** Floating command menu for zero-latency interactions.
*   **Tagging System:** Organize notes with integrated tags and a dedicated tag picker.
*   **Local & Private:** Data stays in your IndexedDB. AI stays on your machine via Ollama.
*   **Customizable:** Multiple themes, configurable shortcuts, and zen mode.

## 🛠️ Getting Started

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/Abhay-Chaturvedi/Terminal_Notes.git
    ```
2.  **Open the App:**
    Simply open `index.html` in any modern web browser or run `npx serve .`.
3.  **Setup AI (Optional):**
    Install [Ollama](https://ollama.ai/) and run `ollama run llama3.2:3b` to enable terminal intelligence.

## ⌨️ Commands

| Command | Description | Example |
| :--- | :--- | :--- |
| `/n [title]` | Create a new note and open the editor. | `/n My New Project` |
| `/a` or `/list` | List all notes in the terminal. | `/a` |
| `/v [id]` | View a specific note. | `/v 1` |
| `/edit [query]` | Edit a note by ID or Title. | `/edit My Note` |
| `/d [id]` | Delete a note. | `/d 1` |
| `/undo` | Restore the last deleted note. | `/undo` |
| `/search [q]` | Search notes by content or title. | `/search project` |
| `/tag [name]` | Toggle a tag on the current note. | `/tag urgent` |
| `/export` | Export notes to JSON. | `/export` |

### AI Commands (Local)
| Command | Description |
| :--- | :--- |
| `/ask [query]` | Question answering using your notes as context. |
| `/chat [msg]` | Continuous chat with note-aware intelligence. |
| `/summarize [id]`| Generate a bulleted summary of a note. |
| `/rewrite [id]` | Improve clarity and flow of a note. |

### Navigation
| Command | View |
| :--- | :--- |
| `/terminal` | Primary CLI interface. |
| `/notes` | Visual notes explorer. |
| `/history` | Command and AI history. |
| `/settings` | Application configuration. |
| `/commands` | Integrated command reference. |

## 🎹 Shortcuts

*   **`⌘ + N`**: New Note
*   **`⌘ + S`**: Save Note (in editor)
*   **`⌘ + F`**: Search / Notes Explorer
*   **`⌘ + L`**: Toggle Note List
*   **`⌘ + P`**: Command Palette
*   **`⌘ + .`**: Zen Mode
*   **`⌘ + Shift + T`**: Cycle Themes
*   **`/`**: Focus input (Global)

## 📂 Project Structure

*   **`router.js`**: Hash-based SPA routing.
*   **`commands.js`**: Core command engine.
*   **`ai/`**: Local AI integration handlers.
*   **`views/`**: View-specific controllers (Notes, Settings, etc.).
*   **`db.js`**: IndexedDB storage layer.

## 👤 Author

**Abhay Chaturvedi**
*   GitHub: [@Abhay-Chaturvedi](https://github.com/abhay707)
    
---
*Built with vanilla HTML, CSS, and JavaScript. Zero dependencies.*

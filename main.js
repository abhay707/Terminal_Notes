document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('command-input');
    const output = document.getElementById('output');
    const terminal = document.getElementById('terminal');

    // Focus input on load and click
    input.focus();
    document.addEventListener('click', () => {
        input.focus();
    });

    // Command history
    let history = [];
    let historyIndex = -1;

    // Welcome message
    addToOutput(`
        <div class="response">
            Welcome to Terminal Notes v1.0
            Type 'help' to see available commands.
        </div>
    `);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const command = input.value;
            
            if (command.trim() !== '') {
                // Add to history
                history.push(command);
                historyIndex = history.length;

                // Echo command
                addToOutput(`
                    <div class="command-line">
                        <span class="prompt">$</span>
                        <span class="command-text">${escapeHtml(command)}</span>
                    </div>
                `);

                // Process command
                const result = Commands.process(command);

                if (result === 'CLEAR_SCREEN') {
                    output.innerHTML = '';
                } else {
                    addToOutput(result);
                }
            } else {
                // Empty enter just shows a new prompt line effectively (by doing nothing but clearing input)
                 addToOutput(`
                    <div class="command-line">
                        <span class="prompt">$</span>
                    </div>
                `);
            }

            input.value = '';
            // Allow DOM to update then scroll
            setTimeout(scrollToBottom, 10);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIndex > 0) {
                historyIndex--;
                input.value = history[historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex < history.length - 1) {
                historyIndex++;
                input.value = history[historyIndex];
            } else {
                historyIndex = history.length;
                input.value = '';
            }
        }
    });

    function addToOutput(html) {
        output.insertAdjacentHTML('beforeend', html);
        scrollToBottom();
    }

    function scrollToBottom() {
        // Scroll the terminal container if it has overflow
        // But our terminal uses body scroll or terminal scroll?
        // styles.css: #output { flex-grow: 1; overflow-y: auto; }
        // Wait, #output has overflow-y: auto.
        // And body has overflow: hidden.
        // So we need to scroll #output to bottom.
        
        output.scrollTop = output.scrollHeight;
        
        // Also ensure the input line is visible
        const inputLine = document.querySelector('.input-line');
        inputLine.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});

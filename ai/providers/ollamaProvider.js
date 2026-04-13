/**
 * Ollama AI Provider — plain global script
 * Directly communicates with local Ollama instance at http://localhost:11434
 */
const OllamaProvider = {
    /**
     * core request method for Ollama /api/generate
     */
    async generate(prompt, system, options = {}, onChunk = null) {
        const body = {
            model: AI_CONFIG.MODEL_NAME,
            prompt: prompt,
            system: system,
            stream: !!onChunk,
            options: {
                temperature: options.temperature || 0.3,
                num_ctx: 4096, // Basic context window
                ...options
            }
        };

        try {
            const response = await fetch(AI_CONFIG.OLLAMA_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Ollama model not found. Ensure "llama3.1:8b" is pulled.');
                }
                throw new Error(`Ollama Error (HTTP ${response.status})`);
            }

            if (!onChunk) {
                // Non-streaming fallback
                const data = await response.json();
                return { success: true, data: data.response };
            }

            // Streaming implementation
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const json = JSON.parse(line);
                        if (json.response) {
                            fullText += json.response;
                            onChunk(json.response);
                        }
                        if (json.done) break;
                    } catch (e) {
                        console.warn('Error parsing JSON chunk from Ollama:', e);
                    }
                }
            }

            return { success: true, data: fullText };

        } catch (error) {
            console.error('Ollama provider failed:', error);
            
            // Helpful CORS debugging
            if (error instanceof TypeError && error.message.includes('fetch')) {
                return { 
                    success: false, 
                    error: 'CONNECTION REFUSED: Check if Ollama is running. NOTE: If running via file://, restart Ollama with: OLLAMA_ORIGINS="*" ollama serve'
                };
            }
            
            return { success: false, error: error.message };
        }
    }
};

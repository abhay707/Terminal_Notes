/**
 * AI Orchestration Module — updated for local Ollama
 * Handles chunking, specialized system prompts, and streaming.
 * Depends on: AI_CONFIG (aiConfig.js), OllamaProvider (ollamaProvider.js)
 */
const AI = {
    // --- UTILITIES ---

    chunkText(text, maxWords) {
        const words = text.split(/\s+/);
        if (words.length <= maxWords) return [text];
        
        const chunks = [];
        for (let i = 0; i < words.length; i += maxWords) {
            chunks.push(words.slice(i, i + maxWords).join(' '));
        }
        return chunks;
    },

    getCommonSystemPrompt() {
        return `You are a core component of MONOLITH_CMD, a professional terminal-based notes application. 
CRITICAL CONSTRAINTS:
1. Never hallucinate facts not present in the provided notes.
2. Be extremely concise. This is a terminal app, not a chatbot.
3. Format output for monospace display. Use plain text and simple bullet points (•).
4. Do NOT use markdown bold (**), italics, or complex headers.
5. If you don't know the answer based on the notes, say "Information not found in local notes."`;
    },

    // --- CORE COMMANDS ---

    async summarize(text, onChunk) {
        const system = `${this.getCommonSystemPrompt()}\nTASK: Create a bullet-point summary of the user's note. Preserve key facts and technical details. Max ${AI_CONFIG.MAX_SUMMARY_BULLETS} bullets.`;
        
        const chunks = this.chunkText(text, AI_CONFIG.MAX_CHUNK_WORDS);
        
        if (chunks.length === 1) {
            return await OllamaProvider.generate(text, system, { temperature: 0.3 }, onChunk);
        }

        // Handle multi-chunk summarization
        let chunkSummaries = [];
        for (const chunk of chunks) {
            const res = await OllamaProvider.generate(`Summarize this segment of the note:\n\n${chunk}`, system, { temperature: 0.3 });
            if (res.success) chunkSummaries.push(res.data);
        }

        const finalPrompt = `The following are partial summaries of a long note. Combine them into a single, cohesive, final bullet-point summary:\n\n${chunkSummaries.join('\n\n')}`;
        return await OllamaProvider.generate(finalPrompt, system, { temperature: 0.3 }, onChunk);
    },

    async ask(query, contextNotes, onChunk) {
        const system = `${this.getCommonSystemPrompt()}\nTASK: RAG-style Question Answering. Use the provided notes context to answer the user's query precisely.`;
        const prompt = `CONTEXT NOTES:\n${contextNotes}\n\nUSER QUERY: ${query}`;
        return await OllamaProvider.generate(prompt, system, { temperature: 0.3 }, onChunk);
    },

    async chat(message, history, contextNotes, onChunk) {
        const system = `${this.getCommonSystemPrompt()}\nTASK: Conversational assistant. Use provided context if relevant. Maintain a professional, terminal-centric tone.`;
        
        // Format history (max 10)
        const recentHistory = history.slice(-AI_CONFIG.CHAT_HISTORY_LIMIT);
        const historyStr = recentHistory.map(m => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`).join('\n');
        
        const prompt = `LOCAL CONTEXT:\n${contextNotes || 'No specific notes context provided.'}\n\nCONVERSATION HISTORY:\n${historyStr}\n\nUSER: ${message}`;
        return await OllamaProvider.generate(prompt, system, { temperature: 0.7 }, onChunk);
    },

    async rewrite(text, onChunk) {
        const system = `${this.getCommonSystemPrompt()}\nTASK: Improve clarity, grammar, and flow while keeping the original meaning and technical details exactly the same.`;
        return await OllamaProvider.generate(`Rewrite the following text:\n\n${text}`, system, { temperature: 0.5 }, onChunk);
    },

    async explain(text, onChunk) {
        const system = `${this.getCommonSystemPrompt()}\nTASK: Explain the content in ELI5 style (Explain Like I'm Five). Use simple language, avoid jargon, but stay technical enough to be useful.`;
        return await OllamaProvider.generate(`Explain this:\n\n${text}`, system, { temperature: 0.5 }, onChunk);
    },

    async generateTags(text, onChunk) {
        const system = `${this.getCommonSystemPrompt()}\nTASK: Return ONLY a JSON array of 3-7 lowercase tags based on the content. No other text. Example: ["ai", "dev", "notes"]`;
        return await OllamaProvider.generate(`Generate tags for:\n\n${text}`, system, { temperature: 0.3 }, onChunk);
    }
};

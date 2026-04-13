// Gemini AI Provider — plain global script (no ES module syntax)
const GeminiProvider = {
    async summarize(text, promptContent = null) {
        const apiKey = KeyManager.getKey();
        if (!apiKey) {
            return {
                success: false,
                error: 'Gemini API key is not configured. Run KeyManager.setKey("YOUR_KEY") in the browser console.'
            };
        }

        const contentData = promptContent || text;
        const prompt = `Please provide a concise summary of the following text. Optimize the summary for terminal display using a maximum of ${AI_CONFIG.MAX_SUMMARY_BULLETS} bullet points. Output exclusively bullet points starting with '• '.\n\nText:\n${contentData}`;

        try {
            const url = `${AI_CONFIG.API_URL}${AI_CONFIG.MODEL_NAME}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (!response.ok) {
                if (response.status === 429) {
                    return { success: false, error: 'Rate limit exceeded for Gemini API. Please try again later.' };
                }
                const errorData = await response.json().catch(() => ({}));
                return { success: false, error: errorData.error?.message || `Gemini API Error (HTTP ${response.status})` };
            }

            const data = await response.json();
            if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                return { success: true, data: data.candidates[0].content.parts[0].text };
            } else {
                return { success: false, error: 'Invalid response format from Gemini API.' };
            }
        } catch (error) {
            return { success: false, error: `Network error contacting Gemini API: ${error.message}` };
        }
    },

    async generateEmbedding(text) {
        const apiKey = KeyManager.getKey();
        if (!apiKey) return { success: false, error: 'Gemini API key is not configured.' };

        try {
            const url = `${AI_CONFIG.API_URL}${AI_CONFIG.EMBEDDING_MODEL}:embedContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: `models/${AI_CONFIG.EMBEDDING_MODEL}`,
                    content: { parts: [{ text }] }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return { success: false, error: errorData.error?.message || `Embedding Error (HTTP ${response.status})` };
            }

            const data = await response.json();
            if (data.embedding && Array.isArray(data.embedding.values)) {
                return { success: true, data: data.embedding.values };
            } else {
                return { success: false, error: 'Malformed embedding format from provider.' };
            }
        } catch (error) {
            return { success: false, error: `Error generating embedding: ${error.message}` };
        }
    },

    async generateAnswer(context, query) {
        const apiKey = KeyManager.getKey();
        if (!apiKey) return { success: false, error: 'Gemini API key is not configured.' };

        const prompt = `Use the following notes context to answer the user's query clearly and concisely. If the context doesn't contain enough information, state that.\n\nContext:\n${context}\n\nQuery: ${query}\n\nAnswer:`;

        return this._generateBase(prompt);
    },

    async chat(messages, contextStr) {
        const apiKey = KeyManager.getKey();
        if (!apiKey) return { success: false, error: 'Gemini API key is not configured.' };

        const formattedContents = messages.map((msg, index) => {
            const role = msg.role === 'assistant' ? 'model' : 'user';

            if (index === messages.length - 1 && role === 'user' && contextStr) {
                return {
                    role,
                    parts: [{ text: `Answer based ONLY on the provided notes context. If the answer is not in the context, say so.\n\nContext:\n${contextStr}\n\nUser Question:\n${msg.content}` }]
                };
            }

            return { role, parts: [{ text: msg.content }] };
        });

        try {
            const url = `${AI_CONFIG.API_URL}${AI_CONFIG.MODEL_NAME}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: formattedContents })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return { success: false, error: errorData.error?.message || `Chat API Error (HTTP ${response.status})` };
            }

            const data = await response.json();
            if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                return { success: true, data: data.candidates[0].content.parts[0].text.trim() };
            } else {
                return { success: false, error: 'Invalid response format from chat API.' };
            }
        } catch (error) {
            return { success: false, error: `Error generating chat: ${error.message}` };
        }
    },

    async _generateBase(prompt) {
        const apiKey = KeyManager.getKey();
        if (!apiKey) return { success: false, error: 'Gemini API key is not configured.' };

        try {
            const url = `${AI_CONFIG.API_URL}${AI_CONFIG.MODEL_NAME}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return { success: false, error: errorData.error?.message || `API Error (HTTP ${response.status})` };
            }

            const data = await response.json();
            if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                return { success: true, data: data.candidates[0].content.parts[0].text.trim() };
            } else {
                return { success: false, error: 'Invalid response format.' };
            }
        } catch (error) {
            return { success: false, error: `Error: ${error.message}` };
        }
    },

    async rewrite(text) {
        return this._generateBase(`Rewrite the following developer note to improve clarity, structure, and readability while preserving meaning.\n\nNote:\n${text}`);
    },

    async explain(text) {
        return this._generateBase(`Explain the following developer note in simple, clear terms suitable for learning.\n\nNote:\n${text}`);
    },

    async generateTags(text) {
        return this._generateBase(`Generate 3-6 concise tags for the following note. Use lowercase and prefix with #.\n\nNote:\n${text}`);
    }
};

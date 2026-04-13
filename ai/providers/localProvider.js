// Local AI Provider placeholder — plain global script
const LocalProvider = {
    async summarize(text, promptContent = null) {
        return {
            success: false,
            error: 'Local AI Provider is currently disabled. Please switch AI_MODE to "remote" to use the Gemini API.'
        };
    }
};

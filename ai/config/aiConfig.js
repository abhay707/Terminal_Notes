// AI Configuration for Local Ollama — loaded as a plain script
const AI_CONFIG = {
    AI_MODE: 'local', // Modes: 'local' (Ollama)
    MODEL_NAME: 'llama3.2:3b',
    OLLAMA_URL: 'http://127.0.0.1:11434/api/generate',
    MAX_INPUT_LENGTH: 8000, 
    MAX_CHUNK_WORDS: 2000,
    MAX_SUMMARY_BULLETS: 5,
    CHAT_HISTORY_LIMIT: 10
};

// No global KeyManager needed for local Ollama, but keeping the object 
// structure for compatibility with existing command logic if any.
const KeyManager = {
    getKey() { return 'local'; },
    hasKey() { return true; }
};

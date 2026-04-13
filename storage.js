const Storage = {
    // Adapter layer between UI and IndexedDB

    async init() {
        return await DB.init();
    },

    async getAll(includeDeleted = false) {
        return await DB.getAll(includeDeleted);
    },

    async add(content, title = '') {
        return await DB.add(content, title);
    },

    async update(id, content, title, tags) {
        return await DB.update(id, content, title, tags);
    },

    async delete(id) {
        const note = await DB.get(id);
        if (!note) return false;
        return await DB.softDelete(id);
    },

    async hardDelete(id) {
        return await DB.delete(id);
    },

    async restore(id) {
        return await DB.restore(id);
    },

    async getDeleted() {
        return await DB.getDeleted();
    },

    async get(id) {
        return await DB.get(id);
    },

    async clear() {
        return await DB.clear();
    },

    async search(query) {
        return await DB.search(query);
    },

    async export() {
        return await DB.export();
    },

    async import(jsonString) {
        return await DB.import(jsonString);
    },

    // --- Summaries ---
    async saveSummary(summaryData) {
        return await DB.addSummary(summaryData);
    },

    async getSummariesByNoteId(noteId) {
        return await DB.getSummariesByNoteId(noteId);
    },

    async deleteSummary(summaryId) {
        return await DB.deleteSummary(summaryId);
    },

    // --- Embeddings ---
    async saveEmbedding(noteId, vector, contentSnapshot) {
        return await DB.saveEmbedding(noteId, vector, contentSnapshot);
    },

    async getAllEmbeddings() {
        return await DB.getAllEmbeddings();
    },

    // --- Command History ---
    async addHistory(entry) {
        return await DB.addHistory(entry);
    },

    async getHistory() {
        return await DB.getHistory();
    },

    async clearHistory() {
        return await DB.clearHistory();
    }
};

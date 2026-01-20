const Storage = {
    // Adapter layer to switch from localStorage to IndexedDB
    
    async getAll() {
        return await DB.getAll();
    },

    async add(content) {
        return await DB.add(content);
    },

    async delete(id) {
        // First check if exists
        const note = await DB.get(id);
        if (!note) return false;
        
        await DB.delete(id);
        return true;
    },

    async get(id) {
        return await DB.get(id);
    },

    async clear() {
        return await DB.clear();
    },

    // New methods supported by DB but exposed via Storage
    async search(query) {
        return await DB.search(query);
    },

    async export() {
        return await DB.export();
    },

    async import(jsonString) {
        return await DB.import(jsonString);
    }
};

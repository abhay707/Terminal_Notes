const Storage = {
    // Adapter layer to switch from localStorage to IndexedDB
    
    async getAll(includeDeleted = false) {
        return await DB.getAll(includeDeleted);
    },

    async add(content, title = '') {
        return await DB.add(content, title);
    },

    async update(id, content, title) {
        return await DB.update(id, content, title);
    },

    async delete(id) {
        // Soft delete by default
        // First check if exists
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

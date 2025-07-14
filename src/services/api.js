// src/services/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
    constructor() {
        this.token = localStorage.getItem('auth_token');
    }

    // Set authorization token
    setToken(token) {
        this.token = token;
        localStorage.setItem('auth_token', token);
    }

    // Remove token
    removeToken() {
        this.token = null;
        localStorage.removeItem('auth_token');
    }

    // Get headers with authorization
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // Generic API call method
    async apiCall(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options,
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired or invalid
                    this.removeToken();
                    window.location.href = '/login';
                    return;
                }
                throw new Error(data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Authentication methods
    async register(email, password, fullName) {
        const data = await this.apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, fullName }),
        });

        if (data.token) {
            this.setToken(data.token);
        }

        return data;
    }

    async login(email, password) {
        const data = await this.apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        if (data.token) {
            this.setToken(data.token);
        }

        return data;
    }

    logout() {
        this.removeToken();
        window.location.href = '/login';
    }

    // Check if user is authenticated
    // isAuthenticated() {
    //     return !!this.token;
    // }

    // Ticket/Project methods
    async getTickets() {
        return this.apiCall('/tickets');
    }

    async createTicket(ticketData) {
        return this.apiCall('/tickets', {
            method: 'POST',
            body: JSON.stringify(ticketData),
        });
    }

    async updateTicket(ticketId, updates) {
        return this.apiCall(`/tickets/${ticketId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }

    async deleteTicket(ticketId) {
        return this.apiCall(`/tickets/${ticketId}`, {
            method: 'DELETE',
        });
    }

    // Task methods
    async toggleTask(taskId) {
        return this.apiCall(`/tasks/${taskId}/toggle`, {
            method: 'PUT',
        });
    }

    // Notes methods
    async getNotes() {
        return this.apiCall('/notes');
    }

    async getNote(type, id) {
        return this.apiCall(`/notes/${type}/${id}`);
    }

    async createOrUpdateNote(noteData) {
        return this.apiCall('/notes', {
            method: 'POST',
            body: JSON.stringify(noteData),
        });
    }

    async updateNote(noteId, updates) {
        return this.apiCall(`/notes/${noteId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }

    async deleteNote(noteId) {
        return this.apiCall(`/notes/${noteId}`, {
            method: 'DELETE',
        });
    }

    async exportNotes() {
        const url = `${this.API_BASE_URL}/notes/export`;
        const response = await fetch(url, {
            headers: this.getHeaders(),
        });
        
        if (!response.ok) {
            throw new Error('Export failed');
        }
        
        return response.blob();
    }

    // Time tracking methods
    async startTimer(taskId, ticketId) {
        return this.apiCall('/time-tracking/start', {
            method: 'POST',
            body: JSON.stringify({ taskId, ticketId }),
        });
    }

    async stopTimer() {
        return this.apiCall('/time-tracking/stop', {
            method: 'POST',
        });
    }

    async getActiveTimer() {
        return this.apiCall('/time-tracking/active');
    }

    async getTimeSummary(date) {
        const params = date ? `?date=${date}` : '';
        return this.apiCall(`/time-tracking/summary${params}`);
    }

    // AI methods
    async generatePlan(description) {
        return this.apiCall('/ai/generate-plan', {
            method: 'POST',
            body: JSON.stringify({ description }),
        });
    }

    // Task guidance method
    async getTaskGuidance(taskData) {
        return this.apiCall('/ai/task-guidance', {
            method: 'POST',
            body: JSON.stringify(taskData),
        });
    }

    // Journal methods
    async getJournalEntries(date) {
        const params = date ? `?date=${date}` : '';
        return this.apiCall(`/journal${params}`);
    }

    async createJournalEntry(entryData) {
        return this.apiCall('/journal', {
            method: 'POST',
            body: JSON.stringify(entryData),
        });
    }

    async updateJournalEntry(entryId, updates) {
        return this.apiCall(`/journal/${entryId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }

    async deleteJournalEntry(entryId) {
        return this.apiCall(`/journal/${entryId}`, {
            method: 'DELETE',
        });
    }

    // Todo list methods
    async getTodoLists() {
        return this.apiCall('/todo-lists');
    }

    async createTodoList(todoListData) {
        return this.apiCall('/todo-lists', {
            method: 'POST',
            body: JSON.stringify(todoListData),
        });
    }

    async updateTodoList(todoListId, updates) {
        return this.apiCall(`/todo-lists/${todoListId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }

    async deleteTodoList(todoListId) {
        return this.apiCall(`/todo-lists/${todoListId}`, {
            method: 'DELETE',
        });
    }

    // Todo item methods
    async createTodoItem(todoListId, itemData) {
        return this.apiCall(`/todo-lists/${todoListId}/items`, {
            method: 'POST',
            body: JSON.stringify(itemData),
        });
    }

    async updateTodoItem(itemId, updates) {
        return this.apiCall(`/todo-items/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }

    async deleteTodoItem(itemId) {
        return this.apiCall(`/todo-items/${itemId}`, {
            method: 'DELETE',
        });
    }

    // AI Todo optimization
    async getTodoOptimization(todoList, userContext) {
        return this.apiCall('/ai/todo-optimization', {
            method: 'POST',
            body: JSON.stringify({ todoList, userContext }),
        });
    }

    async exportData() {
        return this.apiCall('/export');
    }
}

const apiServiceInstance = new ApiService();
export default apiServiceInstance;
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
    isAuthenticated() {
        return !!this.token;
    }

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

    async updateTask(taskId, updates) {
        return this.apiCall(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
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
        const queryParam = date ? `?date=${date}` : '';
        return this.apiCall(`/time-tracking/summary${queryParam}`);
    }

    // AI methods
    async generatePlan(description) {
        return this.apiCall('/ai/generate-plan', {
            method: 'POST',
            body: JSON.stringify({ description }),
        });
    }

    // Combined method for creating ticket with AI
    async createTicketWithAI(description) {
        try {
            // Generate plan with AI
            const planData = await this.generatePlan(description);

            // Create ticket with the generated plan
            const ticket = await this.createTicket(planData);

            return ticket;
        } catch (error) {
            console.error('Error creating ticket with AI:', error);
            throw error;
        }
    }

    // Export method
    async exportData() {
        return this.apiCall('/export');
    }
}

export default new ApiService();
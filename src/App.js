// src/App.js - Updated to use backend
import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ResearchTodoApp from './components/ResearchTodoApp'; // Your existing component
import apiService from './services/api';

function App() {
  return (
      <AuthProvider>
        <ProtectedRoute>
          <ResearchTodoAppWithBackend />
        </ProtectedRoute>
      </AuthProvider>
  );
}

// Updated version of your existing component
const ResearchTodoAppWithBackend = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load tickets from backend on mount
  useEffect(() => {
    loadTickets();
    loadActiveTimer();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const backendTickets = await apiService.getTickets();

      // Transform backend data to match your frontend format
      const transformedTickets = backendTickets.map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        deadline: ticket.deadline,
        created: ticket.created_at?.split('T')[0],
        status: ticket.status,
        progress: ticket.progress,
        estimatedHours: ticket.estimated_hours,
        plan: {
          phases: ticket.phases || [],
          tasks: ticket.tasks || []
        }
      }));

      setTickets(transformedTickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
      setError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveTimer = async () => {
    try {
      const activeTimer = await apiService.getActiveTimer();
      if (activeTimer) {
        // Set your active timer state
        // You'll need to add this state management
      }
    } catch (error) {
      console.error('Error loading active timer:', error);
    }
  };

  // Updated functions to use backend
  const handleCreateTaskSubmit = async (description) => {
    try {
      const newTicket = await apiService.createTicketWithAI(description);
      setTickets(prev => [...prev, newTicket]);
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket');
    }
  };

  const handleUpdateTicket = async (ticketId, updates) => {
    try {
      const updatedTicket = await apiService.updateTicket(ticketId, updates);
      setTickets(prev => prev.map(ticket =>
          ticket.id === ticketId ? { ...ticket, ...updatedTicket } : ticket
      ));
    } catch (error) {
      console.error('Error updating ticket:', error);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    try {
      await apiService.deleteTicket(ticketId);
      setTickets(prev => prev.filter(ticket => ticket.id !== ticketId));
    } catch (error) {
      console.error('Error deleting ticket:', error);
    }
  };

  const handleToggleTask = async (ticketId, taskId) => {
    try {
      await apiService.toggleTask(taskId);
      // Reload tickets to get updated progress
      await loadTickets();
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const handleStartTimer = async (taskId, ticketId) => {
    try {
      await apiService.startTimer(taskId, ticketId);
      // Update your timer state
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  };

  const handleStopTimer = async () => {
    try {
      await apiService.stopTimer();
      // Update your timer state
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await apiService.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading your research projects...</p>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
                onClick={loadTickets}
                className="bg-purple-400 text-white px-4 py-2 rounded-lg"
            >
              Retry
            </button>
          </div>
        </div>
    );
  }

  // Pass all the backend-integrated handlers to your existing component
  return (
      <ResearchTodoApp
          tickets={tickets}
          onCreateTask={handleCreateTaskSubmit}
          onUpdateTicket={handleUpdateTicket}
          onDeleteTicket={handleDeleteTicket}
          onToggleTask={handleToggleTask}
          onStartTimer={handleStartTimer}
          onStopTimer={handleStopTimer}
          onExportData={handleExportData}
      />
  );
};

export default App;
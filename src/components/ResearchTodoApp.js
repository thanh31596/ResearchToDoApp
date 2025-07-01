import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Target, TrendingUp, MessageCircle, Plus, CheckCircle, AlertTriangle, Brain, Edit, X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import apiService from '../services/api';

const ResearchTodoApp = () => {
    const [currentView, setCurrentView] = useState('daily');
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [newTaskInput, setNewTaskInput] = useState('');
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [editingTicket, setEditingTicket] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [editingPhase, setEditingPhase] = useState(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [showAddTaskToDate, setShowAddTaskToDate] = useState(false);
    const [newDateTask, setNewDateTask] = useState('');
    const [activeTimer, setActiveTimer] = useState(null);
    const [showTimeTracker, setShowTimeTracker] = useState(false);
    const [timeSpent, setTimeSpent] = useState({});
    const [timerInterval, setTimerInterval] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPhase, setSelectedPhase] = useState(null); // For filtering tasks by phase
    const [showAddTask, setShowAddTask] = useState(null); // For adding tasks to specific phases
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [showAddPhase, setShowAddPhase] = useState(null); // For adding new phases
    const [newPhaseName, setNewPhaseName] = useState('');

    const [chatMessages, setChatMessages] = useState([
        { role: 'assistant', content: 'Hello! I\'m your AI research assistant. I can help you create detailed project plans. Try describing a research task or project you\'d like to work on!' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Load data from backend on component mount
    useEffect(() => {
        loadTickets();
        loadActiveTimer();
        loadTimeSummary();
    }, []);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerInterval) {
                clearInterval(timerInterval);
            }
        };
    }, [timerInterval]);

    // Load tickets from backend
    const loadTickets = async () => {
        try {
            setLoading(true);
            setError(null);
            const backendTickets = await apiService.getTickets();

            // Transform backend data to match frontend format
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
                    tasks: (ticket.tasks || []).map(task => ({
                        ...task,
                        phase: task.phase_id // Map phase_id to phase for frontend compatibility
                    }))
                }
            }));

            setTickets(transformedTickets);
        } catch (error) {
            console.error('Error loading tickets:', error);
            setError('Failed to load tickets. Please check your connection.');
            addNotification('Failed to load tickets', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Load active timer
    const loadActiveTimer = async () => {
        try {
            const timer = await apiService.getActiveTimer();
            if (timer) {
                setActiveTimer({
                    taskId: timer.task_id,
                    ticketId: timer.ticket_id,
                    startTime: new Date(timer.start_time).getTime()
                });

                // Start frontend timer to keep track
                const interval = setInterval(() => {
                    setTimeSpent(prev => ({
                        ...prev,
                        [`${timer.ticket_id}-${timer.task_id}`]: Math.floor((Date.now() - new Date(timer.start_time).getTime()) / 1000)
                    }));
                }, 1000);
                setTimerInterval(interval);
            }
        } catch (error) {
            console.error('Error loading active timer:', error);
        }
    };

    // Load time summary
    const loadTimeSummary = async () => {
        try {
            const summary = await apiService.getTimeSummary();
            const timeSpentObj = {};
            summary.forEach(item => {
                timeSpentObj[`${item.ticket_id}-${item.task_id}`] = item.total_seconds;
            });
            setTimeSpent(prev => ({ ...prev, ...timeSpentObj }));
        } catch (error) {
            console.error('Error loading time summary:', error);
        }
    };

    // Add notification helper
    const addNotification = (message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 4000);
    };

    // Create task using backend
    const handleCreateTaskSubmit = async () => {
        if (!newTaskInput.trim()) return;

        setIsGeneratingPlan(true);

        try {
            // Use backend AI endpoint instead of direct Gemini call
            const planData = await apiService.generatePlan(newTaskInput);

            // Create ticket with the generated plan
            const newTicket = await apiService.createTicket(planData);

            // Transform the response to match frontend format
            const transformedTicket = {
                id: newTicket.id,
                title: newTicket.title,
                description: newTicket.description,
                priority: newTicket.priority,
                deadline: newTicket.deadline,
                created: newTicket.created_at?.split('T')[0],
                status: newTicket.status,
                progress: newTicket.progress || 0,
                estimatedHours: newTicket.estimated_hours,
                plan: {
                    phases: newTicket.phases || [],
                    tasks: newTicket.tasks || []
                }
            };

            setTickets(prev => [...prev, transformedTicket]);
            setNewTaskInput('');
            setShowCreateTask(false);

            addNotification('🎉 New research project created successfully!', 'success');

        } catch (error) {
            console.error('Error generating plan:', error);
            addNotification('Failed to create project. Please try again.', 'error');
        }

        setIsGeneratingPlan(false);
    };

    // Update ticket
    const handleUpdateTicket = async (ticketId, updates) => {
        try {
            const updatedTicket = await apiService.updateTicket(ticketId, updates);
            setTickets(prev => prev.map(ticket =>
                ticket.id === ticketId ? { ...ticket, ...updatedTicket } : ticket
            ));
            addNotification('Ticket updated successfully', 'success');
        } catch (error) {
            console.error('Error updating ticket:', error);
            addNotification('Failed to update ticket', 'error');
        }
    };

    // Delete ticket
    const deleteTicket = async (ticketId) => {
        if (window.confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
            try {
                await apiService.deleteTicket(ticketId);
                setTickets(prev => prev.filter(ticket => ticket.id !== ticketId));
                addNotification('Ticket deleted successfully', 'success');
            } catch (error) {
                console.error('Error deleting ticket:', error);
                addNotification('Failed to delete ticket', 'error');
            }
        }
    };

    // Toggle task completion with smart phase management
    const toggleTaskComplete = async (ticketId, taskId) => {
        try {
            await apiService.toggleTask(taskId);

            // Update local state immediately for better UX
            setTickets(prev => prev.map(ticket => {
                if (ticket.id === ticketId) {
                    const updatedTasks = ticket.plan.tasks.map(task =>
                        task.id === taskId ? { ...task, completed: !task.completed } : task
                    );

                    // Check for phase completion before updating
                    const previousPhases = [...ticket.plan.phases];

                    // Auto-complete phases when all phase tasks are done
                    const updatedPhases = ticket.plan.phases.map(phase => {
                        const phaseTasks = updatedTasks.filter(task => task.phase === phase.id);
                        const phaseTasksCompleted = phaseTasks.filter(task => task.completed).length;
                        const shouldCompletePhase = phaseTasks.length > 0 && phaseTasksCompleted === phaseTasks.length;

                        return {
                            ...phase,
                            completed: shouldCompletePhase
                        };
                    });

                    // Check if any new phases were completed
                    const newlyCompletedPhases = updatedPhases.filter((phase, index) =>
                        !previousPhases[index].completed && phase.completed
                    );

                    // Auto-generate next tasks when phase is completed
                    let finalTasks = [...updatedTasks];

                    if (newlyCompletedPhases.length > 0) {
                        newlyCompletedPhases.forEach(completedPhase => {
                            addNotification(`🎉 Phase "${completedPhase.name}" completed!`, 'success');
                        });

                        const completedPhases = updatedPhases.filter(p => p.completed);
                        const nextIncompletePhase = updatedPhases.find(p => !p.completed && p.id > Math.max(...completedPhases.map(cp => cp.id), 0));

                        // If there's a next phase, generate more tasks for it
                        if (nextIncompletePhase) {
                            const nextPhaseTasks = finalTasks.filter(task => task.phase === nextIncompletePhase.id);

                            // If next phase has fewer than 3 tasks, auto-generate more
                            if (nextPhaseTasks.length < 3) {
                                const taskTemplates = getTaskTemplatesForPhase(nextIncompletePhase.name, ticket.title);
                                const newTasks = taskTemplates.slice(0, 3 - nextPhaseTasks.length).map((template, index) => ({
                                    id: Date.now() + index,
                                    title: template,
                                    phase: nextIncompletePhase.id,
                                    completed: false,
                                    deadline: getNextTaskDeadline(nextIncompletePhase.start_date, index)
                                }));

                                finalTasks = [...finalTasks, ...newTasks];
                                addNotification(`✨ Generated ${newTasks.length} new tasks for "${nextIncompletePhase.name}"`, 'info');
                            }
                        }
                    }

                    const completedTasksCount = finalTasks.filter(t => t.completed).length;
                    const progress = Math.round((completedTasksCount / finalTasks.length) * 100);

                    // Update status based on progress
                    let status = ticket.status;
                    if (progress === 100) {
                        status = 'completed';
                        addNotification(`🏆 Project "${ticket.title}" completed!`, 'success');
                    } else if (progress > 0) {
                        status = 'in-progress';
                    } else {
                        status = 'planned';
                    }

                    return {
                        ...ticket,
                        progress,
                        status,
                        plan: {
                            ...ticket.plan,
                            tasks: finalTasks,
                            phases: updatedPhases
                        }
                    };
                }
                return ticket;
            }));

            addNotification('Task updated successfully', 'success');
        } catch (error) {
            console.error('Error toggling task:', error);
            addNotification('Failed to update task', 'error');
        }
    };

    // Toggle phase completion
    const togglePhaseComplete = async (ticketId, phaseId) => {
        setTickets(prev => prev.map(ticket => {
            if (ticket.id === ticketId) {
                const updatedPhases = ticket.plan.phases.map(phase =>
                    phase.id === phaseId ? { ...phase, completed: !phase.completed } : phase
                );
                return { ...ticket, plan: { ...ticket.plan, phases: updatedPhases } };
            }
            return ticket;
        }));
    };

    // Helper function to generate task templates based on phase
    const getTaskTemplatesForPhase = (phaseName, projectTitle) => {
        const templates = {
            'Literature Review': [
                'Search recent publications on topic',
                'Review and summarize key papers',
                'Create annotated bibliography',
                'Identify research gaps',
                'Update literature matrix'
            ],
            'Experimental Design': [
                'Design experimental protocol',
                'Prepare materials and equipment',
                'Conduct pilot experiments',
                'Refine methodology',
                'Document experimental procedures'
            ],
            'Data Collection': [
                'Set up data collection systems',
                'Collect baseline measurements',
                'Perform main experiments',
                'Monitor data quality',
                'Document experimental conditions'
            ],
            'Analysis & Results': [
                'Clean and preprocess data',
                'Perform statistical analysis',
                'Create visualizations',
                'Interpret results',
                'Validate findings'
            ],
            'Report Writing': [
                'Draft methodology section',
                'Write results section',
                'Create discussion and conclusions',
                'Format references',
                'Prepare final manuscript'
            ],
            'Introduction & Background': [
                'Write introduction draft',
                'Develop background section',
                'Create problem statement',
                'Define research objectives',
                'Review and refine content'
            ],
            'Methodology & Results': [
                'Document methodology',
                'Present experimental results',
                'Create figures and tables',
                'Discuss findings',
                'Compare with literature'
            ]
        };

        // Find matching template or create generic ones
        for (const [key, tasks] of Object.entries(templates)) {
            if (phaseName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(phaseName.toLowerCase())) {
                return tasks;
            }
        }

        // Generic fallback tasks
        return [
            `Complete ${phaseName.toLowerCase()} activities`,
            `Review ${phaseName.toLowerCase()} progress`,
            `Document ${phaseName.toLowerCase()} results`,
            `Prepare for next phase`,
            `Quality check ${phaseName.toLowerCase()}`
        ];
    };

    // Helper function to calculate next task deadline
    const getNextTaskDeadline = (phaseStartDate, taskIndex) => {
        const startDate = new Date(phaseStartDate);
        const daysToAdd = (taskIndex + 1) * 3; // Space tasks 3 days apart
        const deadline = new Date(startDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
        return deadline.toISOString().split('T')[0];
    };

    // Start timer
    const startTimer = async (taskId, ticketId) => {
        try {
            if (activeTimer) {
                await stopTimer();
            }

            await apiService.startTimer(taskId, ticketId);

            const startTime = Date.now();
            setActiveTimer({ taskId, ticketId, startTime });

            const interval = setInterval(() => {
                setTimeSpent(prev => ({
                    ...prev,
                    [`${ticketId}-${taskId}`]: (prev[`${ticketId}-${taskId}`] || 0) + 1
                }));
            }, 1000);

            setTimerInterval(interval);
            addNotification('⏱️ Timer started!', 'info');
        } catch (error) {
            console.error('Error starting timer:', error);
            addNotification('Failed to start timer', 'error');
        }
    };

    // Stop timer
    const stopTimer = async () => {
        try {
            if (timerInterval) {
                clearInterval(timerInterval);
                setTimerInterval(null);
            }

            if (activeTimer) {
                await apiService.stopTimer();
                setActiveTimer(null);
                addNotification('⏹️ Timer stopped!', 'info');

                // Reload time summary
                await loadTimeSummary();
            }
        } catch (error) {
            console.error('Error stopping timer:', error);
            addNotification('Failed to stop timer', 'error');
        }
    };

    // Export data
    const exportData = async () => {
        try {
            const data = await apiService.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `research-productivity-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            addNotification('📊 Data exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting data:', error);
            addNotification('Failed to export data', 'error');
        }
    };

    // Save ticket edit
    const saveTicketEdit = async (ticketId, updatedData) => {
        await handleUpdateTicket(ticketId, updatedData);
        setEditingTicket(null);
    };

    // Chat with AI (this can still use direct Gemini or you can create a backend endpoint for it)
    const handleChatSubmit = async () => {
        if (!chatInput.trim()) return;

        const userMessage = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsProcessing(true);

        try {
            // You could create a backend endpoint for chat or keep using direct Gemini
            const GEMINI_API_KEY = "AIzaSyB_S8LYf2-YUD9ssMXqe9FzeWaqYEE90FI";
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are an AI research productivity assistant. The user said: "${userMessage}". 

Current tickets: ${JSON.stringify(tickets.map(t => ({ title: t.title, deadline: t.deadline, progress: t.progress })))}

Provide helpful advice, insights, or suggestions related to their research productivity. Be encouraging and specific.

Respond with a helpful message (not JSON this time).`
                        }]
                    }]
                })
            });

            const result = await response.json();
            const message = result.candidates[0].content.parts[0].text;

            setChatMessages(prev => [...prev, { role: 'assistant', content: message }]);

        } catch (error) {
            console.error('Error calling chat API:', error);
            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: 'I apologize, but I encountered an error. Please try again.'
            }]);
        }

        setIsProcessing(false);
    };

    // Helper functions (keep your existing helper functions)
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }

        return days;
    };

    const getTasksForDate = (date) => {
        if (!date) return [];
        const dateStr = date.toISOString().split('T')[0];
        const allTasks = tickets.flatMap(ticket =>
            ticket.plan.tasks.map(task => ({ ...task, ticketId: ticket.id, projectName: ticket.title }))
        );
        return allTasks.filter(task => task.deadline === dateStr);
    };

    // Get the most relevant tasks to show (smart logic)
    const getRelevantTasks = (ticket) => {
        const allTasks = ticket.plan.tasks;
        const phases = ticket.plan.phases;

        // Find current active phase (first incomplete phase)
        const currentPhase = phases.find(phase => !phase.completed);

        if (!currentPhase) {
            // All phases complete, show any remaining incomplete tasks
            return allTasks.filter(task => !task.completed).slice(0, 5);
        }

        // Get tasks from current phase
        const currentPhaseTasks = allTasks.filter(task =>
            task.phase === currentPhase.id && !task.completed
        );

        // If current phase has tasks, show them
        if (currentPhaseTasks.length > 0) {
            return currentPhaseTasks.slice(0, 5);
        }

        // If current phase is empty, look for next phase tasks
        const nextPhase = phases.find(phase =>
            phase.id > currentPhase.id && !phase.completed
        );

        if (nextPhase) {
            const nextPhaseTasks = allTasks.filter(task =>
                task.phase === nextPhase.id && !task.completed
            );
            return nextPhaseTasks.slice(0, 5);
        }

        // Fallback: show any incomplete tasks
        return allTasks.filter(task => !task.completed).slice(0, 5);
    };

    // Get tasks by phase (for when clicking on phases)
    const getTasksByPhase = (ticket, phaseId) => {
        return ticket.plan.tasks.filter(task => task.phase === phaseId);
    };

    // Add new task to a phase
    const addTaskToPhase = (ticketId, phaseId) => {
        if (!newTaskTitle.trim()) return;

        const newTask = {
            id: Date.now(),
            title: newTaskTitle,
            phase: phaseId,
            completed: false,
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default to 1 week from now
        };

        setTickets(prev => prev.map(ticket =>
            ticket.id === ticketId
                ? { ...ticket, plan: { ...ticket.plan, tasks: [...ticket.plan.tasks, newTask] } }
                : ticket
        ));

        setNewTaskTitle('');
        setShowAddTask(null);
        addNotification('Task added successfully', 'success');
    };

    // Remove task
    const removeTask = (ticketId, taskId) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            setTickets(prev => prev.map(ticket =>
                ticket.id === ticketId
                    ? { ...ticket, plan: { ...ticket.plan, tasks: ticket.plan.tasks.filter(task => task.id !== taskId) } }
                    : ticket
            ));
            addNotification('Task removed successfully', 'success');
        }
    };

    // Add new phase
    const addPhaseToTicket = (ticketId) => {
        if (!newPhaseName.trim()) return;

        const ticket = tickets.find(t => t.id === ticketId);
        const maxPhaseId = Math.max(...ticket.plan.phases.map(p => p.id), 0);

        const newPhase = {
            id: maxPhaseId + 1,
            name: newPhaseName,
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to 1 month
            completed: false
        };

        setTickets(prev => prev.map(t =>
            t.id === ticketId
                ? { ...t, plan: { ...t.plan, phases: [...t.plan.phases, newPhase] } }
                : t
        ));

        setNewPhaseName('');
        setShowAddPhase(null);
        addNotification('Phase added successfully', 'success');
    };

    // Remove phase
    const removePhase = (ticketId, phaseId) => {
        if (window.confirm('Are you sure you want to delete this phase? All tasks in this phase will also be deleted.')) {
            setTickets(prev => prev.map(ticket =>
                ticket.id === ticketId
                    ? {
                        ...ticket,
                        plan: {
                            ...ticket.plan,
                            phases: ticket.plan.phases.filter(phase => phase.id !== phaseId),
                            tasks: ticket.plan.tasks.filter(task => task.phase !== phaseId)
                        }
                    }
                    : ticket
            ));
            addNotification('Phase removed successfully', 'success');
        }
    };

    // Get smart "Today's Focus" tasks
    const getTodaysFocusTasks = () => {
        const today = new Date().toISOString().split('T')[0];
        const allTasks = tickets.flatMap(ticket =>
            ticket.plan.tasks.map(task => ({ ...task, ticketId: ticket.id, projectName: ticket.title, ticketPriority: ticket.priority }))
        );

        // Priority 1: Tasks due today
        const dueTodayTasks = allTasks.filter(task => task.deadline === today && !task.completed);

        // Priority 2: Overdue tasks
        const overdueTasks = allTasks.filter(task =>
            !task.completed && new Date(task.deadline) < new Date(today)
        );

        // Priority 3: High priority project tasks that are current
        const highPriorityCurrentTasks = [];
        tickets.filter(ticket => ticket.priority === 'High').forEach(ticket => {
            const relevantTasks = getRelevantTasks(ticket).slice(0, 2); // Take top 2 from each high priority project
            relevantTasks.forEach(task => {
                if (!task.completed) {
                    highPriorityCurrentTasks.push({
                        ...task,
                        ticketId: ticket.id,
                        projectName: ticket.title,
                        ticketPriority: ticket.priority
                    });
                }
            });
        });

        // Priority 4: Current phase tasks from other projects
        const currentPhaseTasks = [];
        tickets.filter(ticket => ticket.priority !== 'High').forEach(ticket => {
            const relevantTasks = getRelevantTasks(ticket).slice(0, 1); // Take top 1 from each other project
            relevantTasks.forEach(task => {
                if (!task.completed) {
                    currentPhaseTasks.push({
                        ...task,
                        ticketId: ticket.id,
                        projectName: ticket.title,
                        ticketPriority: ticket.priority
                    });
                }
            });
        });

        // Combine and deduplicate
        const combinedTasks = [...dueTodayTasks, ...overdueTasks, ...highPriorityCurrentTasks, ...currentPhaseTasks];
        const uniqueTasks = combinedTasks.filter((task, index, self) =>
            index === self.findIndex(t => t.id === task.id && t.ticketId === task.ticketId)
        );

        // Sort by priority: due today > overdue > high priority > others
        return uniqueTasks.sort((a, b) => {
            if (a.deadline === today && b.deadline !== today) return -1;
            if (a.deadline !== today && b.deadline === today) return 1;
            if (new Date(a.deadline) < new Date(today) && new Date(b.deadline) >= new Date(today)) return -1;
            if (new Date(a.deadline) >= new Date(today) && new Date(b.deadline) < new Date(today)) return 1;
            if (a.ticketPriority === 'High' && b.ticketPriority !== 'High') return -1;
            if (a.ticketPriority !== 'High' && b.ticketPriority === 'High') return 1;
            return 0;
        }).slice(0, 5); // Show top 5 priority tasks
    };

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    };

    const getTotalTimeSpent = () => {
        return Object.values(timeSpent).reduce((total, time) => total + time, 0);
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High': return 'bg-red-100 text-red-800 border-red-200';
            case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Low': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'in-progress': return 'bg-blue-100 text-blue-800';
            case 'planned': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Show loading state
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

    // Show error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={loadTickets}
                        className="bg-purple-400 text-white px-4 py-2 rounded-lg hover:bg-purple-500 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Get today's focus tasks using smart logic
    const todaysFocusTasks = getTodaysFocusTasks();

    // Your existing JSX rendering code goes here - I'll include the main structure
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-purple-100 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="bg-gradient-to-r from-purple-400 to-pink-400 p-2 rounded-xl">
                                <Brain className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-800">Research Assistant</h1>
                                <p className="text-sm text-gray-600">AI-Powered Productivity</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            {activeTimer && (
                                <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-lg">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                    <span className="text-sm font-medium">Timer Running</span>
                                    <button
                                        onClick={stopTimer}
                                        className="text-green-600 hover:text-green-800 ml-1"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={() => setShowCreateTask(true)}
                                className="bg-gradient-to-r from-purple-400 to-pink-400 text-white px-4 py-2 rounded-xl font-medium hover:shadow-lg transition-all flex items-center space-x-2"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Create Task</span>
                            </button>

                            <nav className="flex space-x-1 bg-gray-100 rounded-xl p-1">
                                {[
                                    { key: 'daily', label: 'Daily', icon: Clock },
                                    { key: 'calendar', label: 'Calendar', icon: Calendar },
                                    { key: 'projects', label: 'Projects', icon: Target },
                                    { key: 'analytics', label: 'Analytics', icon: TrendingUp }
                                ].map(({ key, label, icon: Icon }) => (
                                    <button
                                        key={key}
                                        onClick={() => setCurrentView(key)}
                                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                                            currentView === key
                                                ? 'bg-white text-purple-600 shadow-sm'
                                                : 'text-gray-600 hover:text-purple-600'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="font-medium">{label}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>
                </div>
            </header>

            {/* Create Task Modal */}
            {showCreateTask && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Create New Research Task</h2>
                            <button
                                onClick={() => setShowCreateTask(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Describe your research task or project
                                </label>
                                <textarea
                                    value={newTaskInput}
                                    onChange={(e) => setNewTaskInput(e.target.value)}
                                    placeholder="e.g., 'I need to conduct a systematic review on machine learning applications in healthcare for my PhD thesis, due in 4 months'"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                                    rows={4}
                                />
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <h3 className="font-semibold text-blue-800 mb-2">AI will create:</h3>
                                <ul className="text-sm text-blue-700 space-y-1">
                                    <li>• Comprehensive project breakdown with phases</li>
                                    <li>• Detailed timeline with realistic deadlines</li>
                                    <li>• Specific actionable tasks for each phase</li>
                                    <li>• Progress tracking and milestones</li>
                                </ul>
                            </div>

                            <div className="flex space-x-3 pt-4">
                                <button
                                    onClick={handleCreateTaskSubmit}
                                    disabled={!newTaskInput.trim() || isGeneratingPlan}
                                    className="flex-1 bg-gradient-to-r from-purple-400 to-pink-400 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isGeneratingPlan ? 'Generating Plan...' : 'Generate AI Plan'}
                                </button>
                                <button
                                    onClick={() => setShowCreateTask(false)}
                                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content - Daily View */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {currentView === 'daily' && (
                    <div className="space-y-8">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">Today's Focus</h2>
                                <div className="text-sm text-gray-600">
                                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                            </div>

                            <div className="grid gap-4">
                                {todaysFocusTasks.length > 0 ? todaysFocusTasks.map(task => (
                                    <div key={`${task.ticketId}-${task.id}`} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <button
                                                        onClick={() => toggleTaskComplete(task.ticketId, task.id)}
                                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                            task.completed
                                                                ? 'bg-green-400 border-green-400'
                                                                : 'border-gray-300 hover:border-purple-400'
                                                        }`}
                                                    >
                                                        {task.completed && <CheckCircle className="w-3 h-3 text-white" />}
                                                    </button>
                                                    {editingTask === `${task.ticketId}-${task.id}` ? (
                                                        <input
                                                            type="text"
                                                            value={task.title}
                                                            onChange={(e) => {
                                                                // Update task title in local state
                                                                setTickets(prev => prev.map(ticket =>
                                                                    ticket.id === task.ticketId
                                                                        ? { ...ticket, plan: { ...ticket.plan, tasks: ticket.plan.tasks.map(t => t.id === task.id ? { ...t, title: e.target.value } : t) } }
                                                                        : ticket
                                                                ));
                                                            }}
                                                            onBlur={() => setEditingTask(null)}
                                                            onKeyPress={(e) => e.key === 'Enter' && setEditingTask(null)}
                                                            className="font-semibold text-gray-800 border-b border-purple-300 focus:outline-none bg-transparent"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <h3
                                                            className={`font-semibold cursor-pointer hover:text-purple-600 transition-colors ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}
                                                            onDoubleClick={() => setEditingTask(`${task.ticketId}-${task.id}`)}
                                                        >
                                                            {task.title}
                                                        </h3>
                                                    )}
                                                    {task.deadline === new Date().toISOString().split('T')[0] && (
                                                        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">Due Today</span>
                                                    )}
                                                    {new Date(task.deadline) < new Date() && !task.completed && (
                                                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">Overdue</span>
                                                    )}
                                                    {task.ticketPriority === 'High' && (
                                                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">High Priority</span>
                                                    )}
                                                </div>

                                                <div className="flex items-center space-x-4 text-sm text-gray-600 ml-8">
                                                    <span className="text-purple-600 font-medium">{task.projectName}</span>
                                                    <span>•</span>
                                                    <span>Due: {task.deadline}</span>
                                                    {timeSpent[`${task.ticketId}-${task.id}`] && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-blue-600">⏱️ {formatTime(timeSpent[`${task.ticketId}-${task.id}`])}</span>
                                                        </>
                                                    )}
                                                    {activeTimer?.taskId === task.id && activeTimer?.ticketId === task.ticketId && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-green-600 animate-pulse">🔴 Recording</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {!activeTimer || (activeTimer.taskId !== task.id || activeTimer.ticketId !== task.ticketId) ? (
                                                    <button
                                                        onClick={() => startTimer(task.id, task.ticketId)}
                                                        className="text-gray-400 hover:text-green-600 transition-colors"
                                                        title="Start timer"
                                                    >
                                                        <Clock className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={stopTimer}
                                                        className="text-green-600 hover:text-red-600 transition-colors"
                                                        title="Stop timer"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-8">
                                        <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
                                        <h3 className="text-xl font-semibold text-gray-600 mb-2">All caught up!</h3>
                                        <p className="text-gray-500">No urgent tasks for today. Great work!</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* All Tickets */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100">
                            <h3 className="text-xl font-bold text-gray-800 mb-6">All Research Tickets</h3>
                            <div className="space-y-4">
                                {tickets.map(ticket => (
                                    <div key={ticket.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <h3 className="text-lg font-bold text-gray-800">{ticket.title}</h3>
                                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                                        {ticket.status}
                                                    </div>
                                                    <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(ticket.priority)}`}>
                                                        {ticket.priority}
                                                    </div>
                                                </div>
                                                <p className="text-gray-600 mb-3">{ticket.description}</p>
                                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                                    <span>Created: {ticket.created}</span>
                                                    <span>•</span>
                                                    <span>Due: {ticket.deadline}</span>
                                                    <span>•</span>
                                                    <span>{ticket.estimatedHours}h estimated</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <div className="text-right">
                                                    <div className="text-2xl font-bold text-purple-600">{ticket.progress}%</div>
                                                    <div className="text-xs text-gray-500">Complete</div>
                                                </div>
                                                <button
                                                    onClick={() => setEditingTicket(ticket)}
                                                    className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => deleteTicket(ticket.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${ticket.progress}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="font-semibold text-gray-800">Project Phases</h4>
                                                    <button
                                                        onClick={() => setShowAddPhase(ticket.id)}
                                                        className="text-sm text-purple-600 hover:text-purple-700 flex items-center space-x-1"
                                                        title="Add new phase"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        <span>Add Phase</span>
                                                    </button>
                                                </div>
                                                <div className="space-y-2">
                                                    {ticket.plan.phases.map((phase, index) => {
                                                        const isCurrentPhase = !phase.completed && !ticket.plan.phases.slice(0, index).some(p => !p.completed);
                                                        const phaseTasks = ticket.plan.tasks.filter(task => task.phase === phase.id);
                                                        const completedPhaseTasks = phaseTasks.filter(task => task.completed).length;
                                                        const isSelectedPhase = selectedPhase === `${ticket.id}-${phase.id}`;

                                                        return (
                                                            <div key={phase.id} className="flex items-center space-x-2 text-sm group">
                                                                <button
                                                                    onClick={() => togglePhaseComplete(ticket.id, phase.id)}
                                                                    className={`w-2 h-2 rounded-full transition-colors ${
                                                                        phase.completed
                                                                            ? 'bg-green-400'
                                                                            : isCurrentPhase
                                                                                ? 'bg-purple-400 animate-pulse'
                                                                                : 'bg-gray-300 hover:bg-purple-300'
                                                                    }`}
                                                                ></button>
                                                                {editingPhase === `${ticket.id}-${phase.id}` ? (
                                                                    <input
                                                                        type="text"
                                                                        value={phase.name}
                                                                        onChange={(e) => {
                                                                            const updatedTickets = tickets.map(t =>
                                                                                t.id === ticket.id
                                                                                    ? { ...t, plan: { ...t.plan, phases: t.plan.phases.map(p => p.id === phase.id ? { ...p, name: e.target.value } : p) } }
                                                                                    : t
                                                                            );
                                                                            setTickets(updatedTickets);
                                                                        }}
                                                                        onBlur={() => setEditingPhase(null)}
                                                                        onKeyPress={(e) => e.key === 'Enter' && setEditingPhase(null)}
                                                                        className="text-sm border-b border-purple-300 focus:outline-none bg-transparent"
                                                                        autoFocus
                                                                    />
                                                                ) : (
                                                                    <span
                                                                        className={`cursor-pointer hover:text-purple-600 transition-colors ${
                                                                            phase.completed
                                                                                ? 'line-through text-gray-500'
                                                                                : isCurrentPhase
                                                                                    ? 'text-purple-600 font-medium'
                                                                                    : isSelectedPhase
                                                                                        ? 'text-purple-600 font-medium bg-purple-50 px-2 py-1 rounded'
                                                                                        : 'text-gray-700'
                                                                        }`}
                                                                        onClick={() => {
                                                                            const phaseKey = `${ticket.id}-${phase.id}`;
                                                                            setSelectedPhase(selectedPhase === phaseKey ? null : phaseKey);
                                                                        }}
                                                                        onDoubleClick={() => setEditingPhase(`${ticket.id}-${phase.id}`)}
                                                                        title={`Click to view tasks • ${completedPhaseTasks}/${phaseTasks.length} tasks completed`}
                                                                    >
                                                                        {phase.name}
                                                                        {isCurrentPhase && <span className="ml-1 text-xs">← Current</span>}
                                                                        {isSelectedPhase && <span className="ml-1 text-xs">← Viewing</span>}
                                                                        <span className="ml-2 text-xs text-gray-400">({completedPhaseTasks}/{phaseTasks.length})</span>
                                                                    </span>
                                                                )}
                                                                <button
                                                                    onClick={() => removePhase(ticket.id, phase.id)}
                                                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
                                                                    title="Remove phase"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                                <span className="text-gray-400 text-xs">({phase.start_date} - {phase.end_date})</span>
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Add Phase Form */}
                                                    {showAddPhase === ticket.id && (
                                                        <div className="flex items-center space-x-2 mt-2">
                                                            <input
                                                                type="text"
                                                                value={newPhaseName}
                                                                onChange={(e) => setNewPhaseName(e.target.value)}
                                                                placeholder="Phase name..."
                                                                className="text-sm border border-purple-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400"
                                                                onKeyPress={(e) => e.key === 'Enter' && addPhaseToTicket(ticket.id)}
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => addPhaseToTicket(ticket.id)}
                                                                className="text-green-600 hover:text-green-700"
                                                                title="Add phase"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setShowAddPhase(null);
                                                                    setNewPhaseName('');
                                                                }}
                                                                className="text-gray-400 hover:text-gray-600"
                                                                title="Cancel"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="font-semibold text-gray-800">
                                                        {selectedPhase ?
                                                            (() => {
                                                                const [ticketIdStr, phaseIdStr] = selectedPhase.split('-');
                                                                const phase = ticket.plan.phases.find(p => p.id === parseInt(phaseIdStr));
                                                                return `${phase?.name || 'Phase'} Tasks`;
                                                            })() :
                                                            'Current Tasks'
                                                        }
                                                    </h4>
                                                    <div className="flex items-center space-x-2">
                                                        {selectedPhase && (
                                                            <button
                                                                onClick={() => setSelectedPhase(null)}
                                                                className="text-xs text-gray-500 hover:text-gray-700"
                                                            >
                                                                Show Current
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                const phaseId = selectedPhase ? parseInt(selectedPhase.split('-')[1]) :
                                                                    ticket.plan.phases.find(p => !p.completed)?.id || ticket.plan.phases[0]?.id;
                                                                setShowAddTask(`${ticket.id}-${phaseId}`);
                                                            }}
                                                            className="text-sm text-purple-600 hover:text-purple-700 flex items-center space-x-1"
                                                            title="Add new task"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                            <span>Add Task</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    {(() => {
                                                        let tasksToShow;

                                                        if (selectedPhase) {
                                                            // Show tasks from selected phase
                                                            tasksToShow = getTasksByPhase(ticket, parseInt(selectedPhase.split('-')[1]));
                                                        } else {
                                                            // Show current relevant tasks (the original working logic)
                                                            tasksToShow = getRelevantTasks(ticket);
                                                        }

                                                        return tasksToShow.length > 0 ? tasksToShow.map(task => (
                                                            <div key={task.id} className="flex items-center space-x-2 group">
                                                                <button
                                                                    onClick={() => toggleTaskComplete(ticket.id, task.id)}
                                                                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                                                                        task.completed ? 'bg-green-400 border-green-400' : 'border-gray-300'
                                                                    }`}
                                                                >
                                                                    {task.completed && <CheckCircle className="w-2 h-2 text-white" />}
                                                                </button>
                                                                {editingTask === `${ticket.id}-${task.id}` ? (
                                                                    <input
                                                                        type="text"
                                                                        value={task.title}
                                                                        onChange={(e) => {
                                                                            const updatedTickets = tickets.map(t =>
                                                                                t.id === ticket.id
                                                                                    ? { ...t, plan: { ...t.plan, tasks: t.plan.tasks.map(tsk => tsk.id === task.id ? { ...tsk, title: e.target.value } : tsk) } }
                                                                                    : t
                                                                            );
                                                                            setTickets(updatedTickets);
                                                                        }}
                                                                        onBlur={() => setEditingTask(null)}
                                                                        onKeyPress={(e) => e.key === 'Enter' && setEditingTask(null)}
                                                                        className="text-sm border-b border-purple-300 focus:outline-none bg-transparent flex-1"
                                                                        autoFocus
                                                                    />
                                                                ) : (
                                                                    <span
                                                                        className={`text-sm cursor-pointer hover:text-purple-600 transition-colors flex-1 ${task.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}
                                                                        onDoubleClick={() => setEditingTask(`${ticket.id}-${task.id}`)}
                                                                        title={`Due: ${task.deadline} • Double-click to edit`}
                                                                    >
                                                                        {task.title}
                                                                    </span>
                                                                )}
                                                                <div className="flex items-center space-x-1">
                                                                    {!activeTimer || (activeTimer.taskId !== task.id || activeTimer.ticketId !== ticket.id) ? (
                                                                        <button
                                                                            onClick={() => startTimer(task.id, ticket.id)}
                                                                            className="text-gray-400 hover:text-green-600 transition-colors"
                                                                            title="Start timer"
                                                                        >
                                                                            <Clock className="w-3 h-3" />
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={stopTimer}
                                                                            className="text-green-600 hover:text-red-600 transition-colors"
                                                                            title="Stop timer"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => removeTask(ticket.id, task.id)}
                                                                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
                                                                        title="Remove task"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                    {timeSpent[`${ticket.id}-${task.id}`] && (
                                                                        <span className="text-xs text-blue-600">
                                                                            {formatTime(timeSpent[`${ticket.id}-${task.id}`])}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )) : (
                                                            <div className="text-sm text-gray-500 italic">
                                                                {selectedPhase
                                                                    ? 'No tasks in this phase yet. Add some tasks to get started!'
                                                                    : getRelevantTasks(ticket).length === 0
                                                                        ? '🎉 All current tasks completed! Great work!'
                                                                        : 'No tasks available'
                                                                }
                                                            </div>
                                                        );
                                                    })()}}

                                                    {/* Add Task Form */}
                                                    {showAddTask && showAddTask.startsWith(`${ticket.id}-`) && (
                                                        <div className="flex items-center space-x-2 mt-2">
                                                            <input
                                                                type="text"
                                                                value={newTaskTitle}
                                                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                                                placeholder="Task description..."
                                                                className="text-sm border border-purple-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400 flex-1"
                                                                onKeyPress={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        const phaseId = parseInt(showAddTask.split('-')[1]);
                                                                        addTaskToPhase(ticket.id, phaseId);
                                                                    }
                                                                }}
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const phaseId = parseInt(showAddTask.split('-')[1]);
                                                                    addTaskToPhase(ticket.id, phaseId);
                                                                }}
                                                                className="text-green-600 hover:text-green-700"
                                                                title="Add task"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setShowAddTask(null);
                                                                    setNewTaskTitle('');
                                                                }}
                                                                className="text-gray-400 hover:text-gray-600"
                                                                title="Cancel"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {tickets.length === 0 && (
                                    <div className="text-center py-12">
                                        <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-xl font-semibold text-gray-600 mb-2">No projects yet</h3>
                                        <p className="text-gray-500 mb-4">Create your first research project to get started!</p>
                                        <button
                                            onClick={() => setShowCreateTask(true)}
                                            className="bg-gradient-to-r from-purple-400 to-pink-400 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all"
                                        >
                                            Create Your First Project
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {currentView === 'calendar' && (
                    <div className="space-y-8">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </h2>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                                        className="p-2 hover:bg-gray-100 rounded-lg"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentDate(new Date())}
                                        className="px-3 py-1 text-sm bg-purple-100 text-purple-600 rounded-lg"
                                    >
                                        Today
                                    </button>
                                    <button
                                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                                        className="p-2 hover:bg-gray-100 rounded-lg"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-1">
                                {getDaysInMonth(currentDate).map((date, index) => {
                                    const tasksForDate = date ? getTasksForDate(date) : [];
                                    const isToday = date && date.toDateString() === new Date().toDateString();

                                    return (
                                        <div
                                            key={index}
                                            className={`min-h-[100px] p-2 border border-gray-100 cursor-pointer transition-colors ${
                                                date ? 'bg-white hover:bg-purple-50' : 'bg-gray-50'
                                            } ${isToday ? 'ring-2 ring-purple-400' : ''}`}
                                            onClick={() => {
                                                if (date) {
                                                    setSelectedDate(date);
                                                    setShowAddTaskToDate(true);
                                                }
                                            }}
                                        >
                                            {date && (
                                                <>
                                                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-purple-600' : 'text-gray-800'}`}>
                                                        {date.getDate()}
                                                    </div>
                                                    <div className="space-y-1">
                                                        {tasksForDate.slice(0, 3).map(dateTask => (
                                                            <div
                                                                key={dateTask.id}
                                                                className={`text-xs p-1 rounded truncate cursor-pointer ${
                                                                    dateTask.completed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                                                }`}
                                                                title={dateTask.title}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleTaskComplete(dateTask.ticketId, dateTask.id);
                                                                }}
                                                            >
                                                                {dateTask.title}
                                                            </div>
                                                        ))}
                                                        {tasksForDate.length > 3 && (
                                                            <div className="text-xs text-gray-500">+{tasksForDate.length - 3} more</div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-4 text-sm text-gray-600 text-center">
                                Click on any date to add a task • Click on tasks to mark complete
                            </div>
                        </div>
                    </div>
                )}

                {currentView === 'projects' && (
                    <div className="space-y-8">
                        {/* Gantt Chart */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100">
                            <h3 className="text-xl font-bold text-gray-800 mb-6">Project Timeline (Gantt Chart)</h3>
                            {tickets.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <div className="min-w-full">
                                        {/* Header with months */}
                                        <div className="flex mb-4">
                                            <div className="w-64 flex-shrink-0"></div>
                                            <div className="flex-1 flex">
                                                {(() => {
                                                    const startDate = new Date(Math.min(...tickets.map(t => new Date(t.created))));
                                                    const endDate = new Date(Math.max(...tickets.map(t => new Date(t.deadline))));
                                                    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                                                    const monthsToShow = Math.ceil(totalDays / 30);

                                                    return Array.from({ length: monthsToShow }, (_, i) => {
                                                        const month = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
                                                        return (
                                                            <div key={i} className="flex-1 text-center text-sm font-medium text-gray-600 border-l border-gray-200 px-2">
                                                                {month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>

                                        {/* Project rows */}
                                        {tickets.map(ticket => {
                                            const startDate = new Date(Math.min(...tickets.map(t => new Date(t.created))));
                                            const endDate = new Date(Math.max(...tickets.map(t => new Date(t.deadline))));
                                            const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

                                            const projectStart = new Date(ticket.created);
                                            const projectEnd = new Date(ticket.deadline);
                                            const projectDuration = Math.ceil((projectEnd - projectStart) / (1000 * 60 * 60 * 24));
                                            const startOffset = Math.ceil((projectStart - startDate) / (1000 * 60 * 60 * 24));
                                            const widthPercent = (projectDuration / totalDays) * 100;
                                            const leftPercent = (startOffset / totalDays) * 100;

                                            return (
                                                <div key={ticket.id} className="flex items-center mb-4">
                                                    <div className="w-64 flex-shrink-0 pr-4">
                                                        <h4 className="font-medium text-gray-800 text-sm">{ticket.title}</h4>
                                                        <p className="text-xs text-gray-500">{ticket.progress}% complete</p>
                                                    </div>
                                                    <div className="flex-1 relative h-8 bg-gray-100 rounded cursor-pointer hover:bg-gray-200 transition-colors">
                                                        <div
                                                            className="absolute top-0 h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded flex items-center px-2"
                                                            style={{
                                                                left: `${leftPercent}%`,
                                                                width: `${widthPercent}%`
                                                            }}
                                                        >
                                                            <div
                                                                className="bg-purple-600 h-full rounded"
                                                                style={{ width: `${ticket.progress}%` }}
                                                            ></div>
                                                        </div>
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <span className="text-xs text-white font-medium">
                                                                {projectStart.toLocaleDateString()} - {projectEnd.toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No projects to display in timeline
                                </div>
                            )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {tickets.map(ticket => (
                                <div key={ticket.id} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-purple-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-bold text-gray-800">{ticket.title}</h3>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm text-gray-600">Due: {ticket.deadline}</span>
                                            <button
                                                onClick={() => setEditingTicket(ticket)}
                                                className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                                            <span>Progress</span>
                                            <span>{ticket.progress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${ticket.progress}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {ticket.plan.phases.slice(0, 3).map((phase, index) => {
                                            const isCurrentPhase = !phase.completed && !ticket.plan.phases.slice(0, index).some(p => !p.completed);
                                            return (
                                                <div key={phase.id} className="flex items-center space-x-2 text-sm">
                                                    <div className={`w-2 h-2 rounded-full transition-colors ${
                                                        phase.completed
                                                            ? 'bg-green-400'
                                                            : isCurrentPhase
                                                                ? 'bg-purple-400 animate-pulse'
                                                                : 'bg-gray-400'
                                                    }`}></div>
                                                    <span className={`${
                                                        phase.completed
                                                            ? 'line-through text-gray-500'
                                                            : isCurrentPhase
                                                                ? 'text-purple-600 font-medium'
                                                                : 'text-gray-700'
                                                    }`}>
                                                        {phase.name}
                                                        {isCurrentPhase && <span className="ml-1 text-xs">← Active</span>}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {currentView === 'analytics' && (
                    <div className="space-y-8">
                        <div className="grid md:grid-cols-4 gap-6">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="bg-blue-400 p-2 rounded-lg">
                                        <Target className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="font-bold text-gray-800">Active Tickets</h3>
                                </div>
                                <div className="text-3xl font-bold text-blue-600 mb-2">{tickets.length}</div>
                                <p className="text-sm text-gray-600">Research projects in progress</p>
                            </div>

                            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="bg-green-400 p-2 rounded-lg">
                                        <CheckCircle className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="font-bold text-gray-800">Avg Progress</h3>
                                </div>
                                <div className="text-3xl font-bold text-green-600 mb-2">
                                    {tickets.length > 0 ? Math.round(tickets.reduce((sum, t) => sum + t.progress, 0) / tickets.length) : 0}%
                                </div>
                                <p className="text-sm text-gray-600">Across all projects</p>
                            </div>

                            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-6 border border-yellow-200">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="bg-yellow-400 p-2 rounded-lg">
                                        <Clock className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="font-bold text-gray-800">Time Tracked</h3>
                                </div>
                                <div className="text-3xl font-bold text-yellow-600 mb-2">
                                    {formatTime(getTotalTimeSpent())}
                                </div>
                                <p className="text-sm text-gray-600">Total time logged</p>
                            </div>

                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="bg-purple-400 p-2 rounded-lg">
                                        <AlertTriangle className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="font-bold text-gray-800">High Priority</h3>
                                </div>
                                <div className="text-3xl font-bold text-purple-600 mb-2">
                                    {tickets.filter(t => t.priority === 'High').length}
                                </div>
                                <p className="text-sm text-gray-600">Projects need attention</p>
                            </div>
                        </div>

                        {/* Interactive Filters */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h3>
                            <div className="grid md:grid-cols-3 gap-4">
                                <button
                                    onClick={() => addNotification('🎯 Focus mode activated! Showing only urgent tasks.', 'info')}
                                    className="p-4 border border-purple-200 rounded-xl hover:bg-purple-50 transition-colors text-left group"
                                >
                                    <h4 className="font-semibold text-gray-800 group-hover:text-purple-600">Focus Mode</h4>
                                    <p className="text-sm text-gray-600 mt-1">Hide completed tasks and show only urgent items</p>
                                </button>

                                <button
                                    onClick={exportData}
                                    className="p-4 border border-green-200 rounded-xl hover:bg-green-50 transition-colors text-left group"
                                >
                                    <h4 className="font-semibold text-gray-800 group-hover:text-green-600">Export Data</h4>
                                    <p className="text-sm text-gray-600 mt-1">Download your progress report as JSON</p>
                                </button>

                                <button
                                    onClick={() => setShowTimeTracker(true)}
                                    className="p-4 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors text-left group"
                                >
                                    <h4 className="font-semibold text-gray-800 group-hover:text-blue-600">Time Tracking</h4>
                                    <p className="text-sm text-gray-600 mt-1">Start timer for active tasks</p>
                                    {getTotalTimeSpent() > 0 && (
                                        <div className="mt-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                            📊 Total: {formatTime(getTotalTimeSpent())}
                                        </div>
                                    )}
                                    {activeTimer && (
                                        <div className="mt-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                            ⏱️ Timer running
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100">
                            <h3 className="text-xl font-bold text-gray-800 mb-6">AI Insights</h3>

                            <div className="space-y-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                    <div className="flex items-start space-x-3">
                                        <div className="bg-blue-400 p-1 rounded-full mt-1">
                                            <TrendingUp className="w-3 h-3 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-800">Project Timeline Analysis</h4>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {tickets.length > 0 && tickets[0].progress > 0
                                                    ? `Your ${tickets[0].title} is ${tickets[0].progress}% complete. You're making good progress!`
                                                    : "Start completing tasks to see progress insights here."
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                    <div className="flex items-start space-x-3">
                                        <div className="bg-yellow-400 p-1 rounded-full mt-1">
                                            <AlertTriangle className="w-3 h-3 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-800">Attention Needed</h4>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {tickets.filter(t => t.priority === 'High' && t.progress < 50).length > 0
                                                    ? `You have ${tickets.filter(t => t.priority === 'High' && t.progress < 50).length} high-priority projects that need attention.`
                                                    : "All your high-priority projects are on track!"
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                    <div className="flex items-start space-x-3">
                                        <div className="bg-green-400 p-1 rounded-full mt-1">
                                            <CheckCircle className="w-3 h-3 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-800">Research Momentum</h4>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {tickets.length > 0
                                                    ? `You have ${tickets.length} active research projects. Great momentum on maintaining multiple streams of work!`
                                                    : "Create your first research project to start tracking momentum."
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Notifications */}
            <div className="fixed top-20 right-6 z-50 space-y-2">
                {notifications.map(notification => (
                    <div
                        key={notification.id}
                        className={`p-4 rounded-xl shadow-lg border transition-all duration-300 ${
                            notification.type === 'success'
                                ? 'bg-green-100 border-green-200 text-green-800'
                                : notification.type === 'error'
                                    ? 'bg-red-100 border-red-200 text-red-800'
                                    : 'bg-blue-100 border-blue-200 text-blue-800'
                        }`}
                    >
                        <p className="text-sm font-medium">{notification.message}</p>
                    </div>
                ))}
            </div>

            {/* Edit Ticket Modal */}
            {editingTicket && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Edit Ticket</h2>
                            <button
                                onClick={() => setEditingTicket(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                                <input
                                    type="text"
                                    value={editingTicket.title}
                                    onChange={(e) => setEditingTicket({ ...editingTicket, title: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={editingTicket.description}
                                    onChange={(e) => setEditingTicket({ ...editingTicket, description: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                                    <select
                                        value={editingTicket.priority}
                                        onChange={(e) => setEditingTicket({ ...editingTicket, priority: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Deadline</label>
                                    <input
                                        type="date"
                                        value={editingTicket.deadline}
                                        onChange={(e) => setEditingTicket({ ...editingTicket, deadline: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    />
                                </div>
                            </div>

                            <div className="flex space-x-3 pt-4">
                                <button
                                    onClick={() => saveTicketEdit(editingTicket.id, editingTicket)}
                                    className="flex-1 bg-gradient-to-r from-purple-400 to-pink-400 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all"
                                >
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => setEditingTicket(null)}
                                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Time Tracking Modal */}
            {showTimeTracker && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Time Tracker</h2>
                            <button
                                onClick={() => setShowTimeTracker(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Active Timer */}
                            {activeTimer && (
                                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-purple-800">Currently Tracking</h3>
                                            <p className="text-purple-600">
                                                {(() => {
                                                    const ticket = tickets.find(t => t.id === activeTimer.ticketId);
                                                    const task = ticket?.plan.tasks.find(task => task.id === activeTimer.taskId);
                                                    return task?.title || 'Unknown task';
                                                })()}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-2xl font-bold text-purple-600">
                                                {formatTime(Math.floor((Date.now() - activeTimer.startTime) / 1000) + (timeSpent[`${activeTimer.ticketId}-${activeTimer.taskId}`] || 0))}
                                            </div>

                                            <button
                                                onClick={stopTimer}
                                                className="bg-red-400 text-white px-4 py-2 rounded-lg hover:bg-red-500 transition-colors"
                                            >
                                                Stop Timer
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Time Summary */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <h3 className="font-semibold text-blue-800 mb-2">Today's Summary</h3>
                                <div className="text-2xl font-bold text-blue-600">
                                    Total: {formatTime(getTotalTimeSpent())}
                                </div>
                            </div>

                            {/* Tasks with Time Tracking */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-800">Track Time for Tasks</h3>
                                {tickets.map(ticket => (
                                    <div key={ticket.id} className="border border-gray-200 rounded-xl p-4">
                                        <h4 className="font-semibold text-gray-800 mb-3">{ticket.title}</h4>
                                        <div className="space-y-2">
                                            {getRelevantTasks(ticket).map(taskItem => (
                                                <div key={taskItem.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                    <div className="flex-1">
                                                        <span className="text-gray-800">{taskItem.title}</span>
                                                        <div className="text-sm text-gray-500">
                                                            Time spent: {formatTime(timeSpent[`${ticket.id}-${taskItem.id}`] || 0)}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        {activeTimer?.taskId === taskItem.id && activeTimer?.ticketId === ticket.id ? (
                                                            <button
                                                                onClick={stopTimer}
                                                                className="bg-red-400 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-500 transition-colors"
                                                            >
                                                                Stop
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => startTimer(taskItem.id, ticket.id)}
                                                                disabled={!!activeTimer}
                                                                className="bg-green-400 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                Start
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showAddTaskToDate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-800">Add Task</h3>
                            <button
                                onClick={() => setShowAddTaskToDate(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-600 mb-2">
                                    Adding task for {selectedDate?.toLocaleDateString()}
                                </p>
                                <input
                                    type="text"
                                    value={newDateTask}
                                    onChange={(e) => setNewDateTask(e.target.value)}
                                    placeholder="Enter task description..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                            </div>

                            <div className="flex space-x-2">
                                <button
                                    onClick={() => {
                                        // Add task to date functionality (you'd need to implement this)
                                        addNotification('Task added to calendar', 'success');
                                        setNewDateTask('');
                                        setShowAddTaskToDate(false);
                                        setSelectedDate(null);
                                    }}
                                    className="flex-1 bg-purple-400 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-500 transition-colors"
                                >
                                    Add Task
                                </button>
                                <button
                                    onClick={() => setShowAddTaskToDate(false)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Widget */}
            <div className="fixed bottom-6 right-6 z-50">
                {showChat && (
                    <div className="bg-white rounded-2xl shadow-2xl border border-purple-200 w-96 h-96 mb-4 flex flex-col">
                        <div className="bg-gradient-to-r from-purple-400 to-pink-400 text-white p-4 rounded-t-2xl">
                            <h3 className="font-bold">AI Research Assistant</h3>
                            <p className="text-sm opacity-90">Get insights about your research progress</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {chatMessages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs p-3 rounded-2xl ${
                                        msg.role === 'user'
                                            ? 'bg-purple-400 text-white'
                                            : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        <p className="text-sm">{msg.content}</p>
                                    </div>
                                </div>
                            ))}

                            {isProcessing && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 text-gray-800 p-3 rounded-2xl">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-200">
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                                    placeholder="Ask about your research progress..."
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                                    disabled={isProcessing}
                                />
                                <button
                                    onClick={handleChatSubmit}
                                    disabled={isProcessing || !chatInput.trim()}
                                    className="bg-purple-400 text-white p-2 rounded-xl hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => setShowChat(!showChat)}
                    className="bg-gradient-to-r from-purple-400 to-pink-400 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                    <MessageCircle className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};

export default ResearchTodoApp;
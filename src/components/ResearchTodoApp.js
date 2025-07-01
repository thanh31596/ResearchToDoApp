import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Target, TrendingUp, MessageCircle, Plus, CheckCircle, AlertTriangle, Brain, Edit, X, ChevronLeft, ChevronRight, Trash2, Flame, Leaf, Zap, LogOut, User } from 'lucide-react';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Confetti Component
const Confetti = ({ active, onComplete }) => {
    useEffect(() => {
        if (active) {
            const timer = setTimeout(onComplete, 3000);
            return () => clearTimeout(timer);
        }
    }, [active, onComplete]);

    if (!active) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-50">
            {[...Array(50)].map((_, i) => (
                <div
                    key={i}
                    className="absolute animate-bounce"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 2}s`,
                        animationDuration: `${2 + Math.random() * 2}s`
                    }}
                >
                    {['🎉', '✨', '🌟', '🎊', '💫'][Math.floor(Math.random() * 5)]}
                </div>
            ))}
        </div>
    );
};

// DNA Loader Component
const DNALoader = () => (
    <div className="flex items-center justify-center">
        <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 border-r-pink-500 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-transparent border-b-blue-500 border-l-green-500 rounded-full animate-spin animate-reverse"></div>
            <div className="absolute inset-4 border-2 border-transparent border-t-yellow-500 rounded-full animate-spin"></div>
        </div>
    </div>
);

// Liquid Progress Bar Component
const LiquidProgressBar = ({ progress, className = "", colors = "from-purple-500 to-pink-500" }) => (
    <div className={`relative h-3 bg-gray-200 rounded-full overflow-hidden ${className}`}>
        <div
            className={`absolute inset-0 bg-gradient-to-r ${colors} rounded-full transition-all duration-1000 ease-out transform`}
            style={{ width: `${progress}%` }}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent animate-pulse"></div>
            <div className="absolute top-0 left-0 w-full h-full">
                <div className="h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
            </div>
        </div>
    </div>
);

const ResearchTodoApp = () => {
    const { user, logout } = useAuth();
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
    const [selectedPhase, setSelectedPhase] = useState(null);
    const [showAddTask, setShowAddTask] = useState(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [showAddPhase, setShowAddPhase] = useState(null);
    const [newPhaseName, setNewPhaseName] = useState('');
    const [showConfetti, setShowConfetti] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

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

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showUserMenu && !event.target.closest('.user-menu-container')) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showUserMenu]);

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

                    // Show confetti when completing a task
                    const completingTask = ticket.plan.tasks.find(task => task.id === taskId);
                    if (completingTask && !completingTask.completed) {
                        setShowConfetti(true);
                    }

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
                        !previousPhases[index]?.completed && phase.completed
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

    // Chat with AI
    const handleChatSubmit = async () => {
        if (!chatInput.trim()) return;

        const userMessage = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsProcessing(true);

        try {
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

    // Helper functions
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

    const getPriorityIcon = (priority) => {
        switch (priority) {
            case 'High': return <Flame className="w-4 h-4 text-red-500" />;
            case 'Medium': return <Zap className="w-4 h-4 text-yellow-500" />;
            case 'Low': return <Leaf className="w-4 h-4 text-green-500" />;
            default: return null;
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High': return 'from-red-400 to-red-600 shadow-red-200';
            case 'Medium': return 'from-yellow-400 to-orange-500 shadow-yellow-200';
            case 'Low': return 'from-green-400 to-emerald-500 shadow-green-200';
            default: return 'from-gray-400 to-gray-600 shadow-gray-200';
        }
    };

    const getPhaseColor = (phaseName, index) => {
        const colors = [
            'from-blue-400 to-indigo-500',
            'from-purple-400 to-violet-500',
            'from-pink-400 to-rose-500',
            'from-emerald-400 to-teal-500',
            'from-amber-400 to-orange-500'
        ];
        return colors[index % colors.length];
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
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center">
                <div className="text-center">
                    <DNALoader />
                    <p className="text-gray-600 mt-4 animate-pulse">Loading your research projects...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center">
                <div className="text-center bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/30">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={loadTickets}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Get today's focus tasks using smart logic
    const todaysFocusTasks = getTodaysFocusTasks();

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 relative overflow-hidden">
            {/* Animated Background Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-20 animate-float"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 10}s`,
                            animationDuration: `${5 + Math.random() * 5}s`
                        }}
                    />
                ))}
            </div>

            {/* Confetti */}
            <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

            {/* Header */}
            <header className="bg-white/80 backdrop-blur-lg border-b border-purple-100 sticky top-0 z-40 shadow-lg">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-2xl shadow-lg transform hover:scale-110 transition-all duration-300">
                                <Brain className="w-7 h-7 text-white animate-pulse" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                    Stephen Assistant
                                </h1>
                                <p className="text-sm text-gray-600">AI-Powered Planning Tool For Stephen</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            {activeTimer && (
                                <div className="flex items-center space-x-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-4 py-2 rounded-xl shadow-lg animate-bounce">
                                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                                    <span className="text-sm font-medium">Timer Running</span>
                                    <button
                                        onClick={stopTimer}
                                        className="text-green-600 hover:text-green-800 ml-1 transform hover:scale-110 transition-all"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={() => setShowCreateTask(true)}
                                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-2xl font-medium hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-2 hover:from-purple-600 hover:to-pink-600"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Create Task</span>
                            </button>

                            <nav className="flex space-x-1 bg-white/70 backdrop-blur-sm rounded-2xl p-1 shadow-lg border border-white/30">
                                {[
                                    { key: 'daily', label: 'Daily', icon: Clock },
                                    { key: 'calendar', label: 'Calendar', icon: Calendar },
                                    { key: 'projects', label: 'Projects', icon: Target },
                                    { key: 'analytics', label: 'Analytics', icon: TrendingUp }
                                ].map(({ key, label, icon: Icon }) => (
                                    <button
                                        key={key}
                                        onClick={() => setCurrentView(key)}
                                        className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                                            currentView === key
                                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                                : 'text-gray-600 hover:text-purple-600 hover:bg-white/50'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="font-medium">{label}</span>
                                    </button>
                                ))}
                            </nav>

                            {/* User Menu */}
                            <div className="relative user-menu-container">
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-white/30 hover:bg-white/80 transition-all duration-300 transform hover:scale-105"
                                >
                                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-xl">
                                        <User className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">
                                        {user?.fullName || user?.email || 'User'}
                                    </span>
                                </button>

                                {/* User Dropdown Menu */}
                                {showUserMenu && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/50 py-2 z-50 animate-slide-up">
                                        <div className="px-4 py-3 border-b border-gray-200">
                                            <p className="text-sm font-medium text-gray-800">
                                                {user?.fullName || 'Research User'}
                                            </p>
                                            <p className="text-xs text-gray-500">{user?.email}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                // Clear timer if running
                                                if (timerInterval) {
                                                    clearInterval(timerInterval);
                                                    setTimerInterval(null);
                                                }
                                                if (activeTimer) {
                                                    setActiveTimer(null);
                                                }

                                                // Clear the auth token and user state
                                                apiService.removeToken();
                                                logout();
                                                setShowUserMenu(false);
                                            }}
                                            className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-red-50 transition-colors group"
                                        >
                                            <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                                            <span className="text-sm text-gray-700 group-hover:text-red-600 font-medium">
                                                Sign out
                                            </span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Create Task Modal */}
            {showCreateTask && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-white/30 animate-slide-up">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Create New Research Task
                            </h2>
                            <button
                                onClick={() => setShowCreateTask(false)}
                                className="text-gray-400 hover:text-gray-600 transform hover:scale-110 transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Describe your research task or project
                                </label>
                                <textarea
                                    value={newTaskInput}
                                    onChange={(e) => setNewTaskInput(e.target.value)}
                                    placeholder="e.g., 'I need to conduct a systematic review on recommendation systems for e-commerce applications, focusing on deep learning approaches'"
                                    className="w-full px-4 py-4 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none backdrop-blur-sm bg-white/70"
                                    rows={4}
                                />
                            </div>

                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 backdrop-blur-sm">
                                <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
                                    <Brain className="w-5 h-5 mr-2" />
                                    AI will create:
                                </h3>
                                <ul className="text-sm text-blue-700 space-y-2">
                                    <li className="flex items-center">
                                        <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                        Comprehensive project breakdown with phases
                                    </li>
                                    <li className="flex items-center">
                                        <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                        Detailed timeline with realistic deadlines
                                    </li>
                                    <li className="flex items-center">
                                        <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                        Specific actionable tasks for each phase
                                    </li>
                                    <li className="flex items-center">
                                        <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                        Progress tracking and milestones
                                    </li>
                                </ul>
                            </div>

                            <div className="flex space-x-4 pt-4">
                                <button
                                    onClick={handleCreateTaskSubmit}
                                    disabled={!newTaskInput.trim() || isGeneratingPlan}
                                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-2xl font-medium hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
                                >
                                    {isGeneratingPlan ? (
                                        <>
                                            <DNALoader />
                                            <span>Generating Plan...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Brain className="w-5 h-5" />
                                            <span>Generate AI Plan</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowCreateTask(false)}
                                    className="px-8 py-4 border border-gray-300 text-gray-700 rounded-2xl font-medium hover:bg-gray-50 transition-all duration-300 transform hover:scale-105"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
                {currentView === 'daily' && (
                    <div className="space-y-8">
                        {/* Today's Focus */}
                        <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 shadow-xl border border-white/30 transform hover:scale-[1.02] transition-all duration-300">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                    Today's Focus
                                </h2>
                                <div className="text-sm text-gray-600 bg-white/50 px-4 py-2 rounded-xl">
                                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                            </div>

                            <div className="grid gap-6">
                                {todaysFocusTasks.length > 0 ? todaysFocusTasks.map(task => (
                                    <div key={`${task.ticketId}-${task.id}`} className="bg-gradient-to-br from-white/80 to-purple-50/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-4 mb-3">
                                                    <button
                                                        onClick={() => toggleTaskComplete(task.ticketId, task.id)}
                                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 transform hover:scale-110 ${
                                                            task.completed
                                                                ? 'bg-gradient-to-r from-green-400 to-emerald-500 border-green-400 shadow-lg'
                                                                : 'border-gray-300 hover:border-purple-400 hover:shadow-md'
                                                        }`}
                                                    >
                                                        {task.completed && <CheckCircle className="w-4 h-4 text-white" />}
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
                                                            className="font-semibold text-lg text-gray-800 border-b border-purple-300 focus:outline-none bg-transparent"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <h3
                                                            className={`font-semibold text-lg cursor-pointer hover:text-purple-600 transition-colors ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}
                                                            onDoubleClick={() => setEditingTask(`${task.ticketId}-${task.id}`)}
                                                        >
                                                            {task.title}
                                                        </h3>
                                                    )}
                                                    {getPriorityIcon(task.ticketPriority)}
                                                    {task.deadline === new Date().toISOString().split('T')[0] && (
                                                        <span className="bg-gradient-to-r from-orange-400 to-red-400 text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg animate-bounce">
                                                            Due Today
                                                        </span>
                                                    )}
                                                    {new Date(task.deadline) < new Date() && !task.completed && (
                                                        <span className="bg-gradient-to-r from-red-400 to-pink-400 text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg animate-pulse">
                                                            Overdue
                                                        </span>
                                                    )}
                                                    {task.ticketPriority === 'High' && (
                                                        <span className="bg-gradient-to-r from-red-400 to-pink-400 text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg">
                                                            High Priority
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center space-x-6 text-sm text-gray-600 ml-10">
                                                    <span className="text-purple-600 font-medium bg-purple-100 px-3 py-1 rounded-full">
                                                        {task.projectName}
                                                    </span>
                                                    <span className="flex items-center">
                                                        <Calendar className="w-4 h-4 mr-1" />
                                                        Due: {task.deadline}
                                                    </span>
                                                    {timeSpent[`${task.ticketId}-${task.id}`] && (
                                                        <span className="text-blue-600 flex items-center bg-blue-100 px-3 py-1 rounded-full">
                                                            <Clock className="w-4 h-4 mr-1" />
                                                            {formatTime(timeSpent[`${task.ticketId}-${task.id}`])}
                                                        </span>
                                                    )}
                                                    {activeTimer?.taskId === task.id && activeTimer?.ticketId === task.ticketId && (
                                                        <span className="text-green-600 animate-pulse flex items-center bg-green-100 px-3 py-1 rounded-full">
                                                            🔴 Recording
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {!activeTimer || (activeTimer.taskId !== task.id || activeTimer.ticketId !== task.ticketId) ? (
                                                    <button
                                                        onClick={() => startTimer(task.id, task.ticketId)}
                                                        className="bg-gradient-to-r from-green-400 to-emerald-500 text-white p-3 rounded-xl hover:shadow-lg transform hover:scale-110 transition-all duration-300"
                                                        title="Start timer"
                                                    >
                                                        <Clock className="w-5 h-5" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={stopTimer}
                                                        className="bg-gradient-to-r from-red-400 to-pink-500 text-white p-3 rounded-xl hover:shadow-lg transform hover:scale-110 transition-all duration-300"
                                                        title="Stop timer"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-12">
                                        <div className="bg-gradient-to-r from-green-400 to-emerald-500 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                                            <CheckCircle className="w-12 h-12 text-white" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-700 mb-3">All caught up!</h3>
                                        <p className="text-gray-500 text-lg">No urgent tasks for today. Great work! 🎉</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* All Tickets */}
                        <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 shadow-xl border border-white/30">
                            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-8">
                                All Research Projects
                            </h3>
                            <div className="space-y-6">
                                {tickets.map(ticket => (
                                    <div key={ticket.id} className="bg-gradient-to-br from-white/80 to-blue-50/80 backdrop-blur-sm border border-white/50 rounded-2xl p-8 hover:shadow-2xl transform hover:scale-[1.01] transition-all duration-300">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-4 mb-3">
                                                    <h3 className="text-2xl font-bold text-gray-800">{ticket.title}</h3>
                                                    <div className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${
                                                        ticket.status === 'completed' ? 'from-green-400 to-emerald-500 text-white' :
                                                            ticket.status === 'in-progress' ? 'from-blue-400 to-indigo-500 text-white' :
                                                                'from-gray-400 to-gray-500 text-white'
                                                    } shadow-lg`}>
                                                        {ticket.status}
                                                    </div>
                                                    <div className={`px-3 py-1 rounded-full text-xs font-medium border-2 bg-gradient-to-r ${getPriorityColor(ticket.priority)} text-white shadow-lg`}>
                                                        {ticket.priority}
                                                    </div>
                                                </div>
                                                <p className="text-gray-600 mb-4 text-lg">{ticket.description}</p>
                                                <div className="flex items-center space-x-6 text-sm text-gray-500">
                                                    <span className="flex items-center">
                                                        <Calendar className="w-4 h-4 mr-1" />
                                                        Created: {ticket.created}
                                                    </span>
                                                    <span className="flex items-center">
                                                        <Target className="w-4 h-4 mr-1" />
                                                        Due: {ticket.deadline}
                                                    </span>
                                                    <span className="flex items-center">
                                                        <Clock className="w-4 h-4 mr-1" />
                                                        {ticket.estimatedHours}h estimated
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <div className="text-right">
                                                    <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                                        {ticket.progress}%
                                                    </div>
                                                    <div className="text-sm text-gray-500">Complete</div>
                                                </div>
                                                <button
                                                    onClick={() => setEditingTicket(ticket)}
                                                    className="p-3 text-gray-400 hover:text-purple-600 transform hover:scale-110 transition-all duration-300"
                                                >
                                                    <Edit className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => deleteTicket(ticket.id)}
                                                    className="p-3 text-gray-400 hover:text-red-600 transform hover:scale-110 transition-all duration-300"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <LiquidProgressBar
                                                progress={ticket.progress}
                                                className="h-4"
                                                colors="from-purple-500 via-pink-500 to-purple-600"
                                            />
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-8">
                                            <div>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="font-bold text-gray-800 text-lg">Project Phases</h4>
                                                    <button
                                                        onClick={() => setShowAddPhase(ticket.id)}
                                                        className="text-sm text-purple-600 hover:text-purple-700 flex items-center space-x-1 transform hover:scale-105 transition-all"
                                                        title="Add new phase"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        <span>Add Phase</span>
                                                    </button>
                                                </div>
                                                <div className="space-y-3">
                                                    {ticket.plan.phases.map((phase, index) => {
                                                        const isCurrentPhase = !phase.completed && !ticket.plan.phases.slice(0, index).some(p => !p.completed);
                                                        const phaseTasks = ticket.plan.tasks.filter(task => task.phase === phase.id);
                                                        const completedPhaseTasks = phaseTasks.filter(task => task.completed).length;
                                                        const isSelectedPhase = selectedPhase === `${ticket.id}-${phase.id}`;

                                                        return (
                                                            <div key={phase.id} className="flex items-center space-x-3 text-sm group">
                                                                <button
                                                                    onClick={() => togglePhaseComplete(ticket.id, phase.id)}
                                                                    className={`w-4 h-4 rounded-full transition-all duration-300 shadow-lg ${
                                                                        phase.completed
                                                                            ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                                                                            : isCurrentPhase
                                                                                ? `bg-gradient-to-r ${getPhaseColor(phase.name, index)} animate-pulse`
                                                                                : 'bg-gray-300 hover:bg-gray-400'
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
                                                                        className={`cursor-pointer hover:text-purple-600 transition-colors font-medium ${
                                                                            phase.completed
                                                                                ? 'line-through text-gray-500'
                                                                                : isCurrentPhase
                                                                                    ? 'text-purple-600 font-bold'
                                                                                    : isSelectedPhase
                                                                                        ? 'text-purple-600 font-bold bg-purple-50 px-2 py-1 rounded'
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
                                                                        {isCurrentPhase && <span className="ml-2 text-xs animate-bounce">← Current</span>}
                                                                        {isSelectedPhase && <span className="ml-2 text-xs">← Viewing</span>}
                                                                        <span className="ml-2 text-xs text-gray-400">({completedPhaseTasks}/{phaseTasks.length})</span>
                                                                    </span>
                                                                )}
                                                                <button
                                                                    onClick={() => removePhase(ticket.id, phase.id)}
                                                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all transform hover:scale-110"
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
                                                                className="text-green-600 hover:text-green-700 transform hover:scale-110 transition-all"
                                                                title="Add phase"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setShowAddPhase(null);
                                                                    setNewPhaseName('');
                                                                }}
                                                                className="text-gray-400 hover:text-gray-600 transform hover:scale-110 transition-all"
                                                                title="Cancel"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="font-bold text-gray-800 text-lg">
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
                                                                className="text-xs text-gray-500 hover:text-gray-700 transform hover:scale-105 transition-all"
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
                                                            className="text-sm text-purple-600 hover:text-purple-700 flex items-center space-x-1 transform hover:scale-105 transition-all"
                                                            title="Add new task"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                            <span>Add Task</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
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
                                                            <div key={task.id} className="flex items-center space-x-3 group">
                                                                <button
                                                                    onClick={() => toggleTaskComplete(ticket.id, task.id)}
                                                                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-300 transform hover:scale-110 ${
                                                                        task.completed
                                                                            ? 'bg-gradient-to-r from-green-400 to-emerald-500 border-green-400 shadow-lg'
                                                                            : 'border-gray-300 hover:border-purple-400 hover:shadow-md'
                                                                    }`}
                                                                >
                                                                    {task.completed && <CheckCircle className="w-3 h-3 text-white" />}
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
                                                                            className="text-gray-400 hover:text-green-600 transition-colors transform hover:scale-110"
                                                                            title="Start timer"
                                                                        >
                                                                            <Clock className="w-4 h-4" />
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={stopTimer}
                                                                            className="text-green-600 hover:text-red-600 transition-colors transform hover:scale-110"
                                                                            title="Stop timer"
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => removeTask(ticket.id, task.id)}
                                                                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all transform hover:scale-110"
                                                                        title="Remove task"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                    {timeSpent[`${ticket.id}-${task.id}`] && (
                                                                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                                                            {formatTime(timeSpent[`${ticket.id}-${task.id}`])}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )) : (
                                                            <div className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-xl">
                                                                {selectedPhase
                                                                    ? 'No tasks in this phase yet. Add some tasks to get started!'
                                                                    : getRelevantTasks(ticket).length === 0
                                                                        ? '🎉 All current tasks completed! Great work!'
                                                                        : 'No tasks available'
                                                                }
                                                            </div>
                                                        );
                                                    })()}

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
                                                                className="text-green-600 hover:text-green-700 transform hover:scale-110 transition-all"
                                                                title="Add task"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setShowAddTask(null);
                                                                    setNewTaskTitle('');
                                                                }}
                                                                className="text-gray-400 hover:text-gray-600 transform hover:scale-110 transition-all"
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
                                    <div className="text-center py-16">
                                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
                                            <Brain className="w-16 h-16 text-white animate-pulse" />
                                        </div>
                                        <h3 className="text-3xl font-bold text-gray-700 mb-4">No projects yet</h3>
                                        <p className="text-gray-500 text-lg mb-8">Create your first research project to get started!</p>
                                        <button
                                            onClick={() => setShowCreateTask(true)}
                                            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-2xl font-medium hover:shadow-xl transform hover:scale-105 transition-all duration-300"
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
                        <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 shadow-xl border border-white/30">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </h2>
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                                        className="p-3 hover:bg-purple-100 rounded-xl transform hover:scale-110 transition-all duration-300"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentDate(new Date())}
                                        className="px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                                    >
                                        Today
                                    </button>
                                    <button
                                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                                        className="p-3 hover:bg-purple-100 rounded-xl transform hover:scale-110 transition-all duration-300"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-2 mb-4">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="p-4 text-center text-sm font-bold text-gray-600 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-2">
                                {getDaysInMonth(currentDate).map((date, index) => {
                                    const tasksForDate = date ? getTasksForDate(date) : [];
                                    const isToday = date && date.toDateString() === new Date().toDateString();
                                    const taskCount = tasksForDate.length;
                                    const highPriorityTasks = tasksForDate.filter(task => {
                                        const ticket = tickets.find(t => t.id === task.ticketId);
                                        return ticket?.priority === 'High';
                                    }).length;

                                    return (
                                        <div
                                            key={index}
                                            className={`min-h-[120px] p-3 border-2 cursor-pointer transition-all duration-300 transform hover:scale-105 rounded-2xl ${
                                                date
                                                    ? `bg-gradient-to-br from-white/80 to-purple-50/80 backdrop-blur-sm hover:from-purple-100/80 hover:to-pink-100/80 border-white/50 hover:border-purple-300 shadow-lg hover:shadow-xl`
                                                    : 'bg-gray-100/50 border-gray-200'
                                            } ${
                                                isToday
                                                    ? 'ring-4 ring-purple-400 animate-pulse shadow-2xl'
                                                    : ''
                                            } ${
                                                taskCount > 0
                                                    ? `border-gradient-to-r ${taskCount > 3 ? 'from-red-400 to-pink-400' : taskCount > 1 ? 'from-yellow-400 to-orange-400' : 'from-green-400 to-emerald-400'}`
                                                    : ''
                                            }`}
                                            onClick={() => {
                                                if (date) {
                                                    setSelectedDate(date);
                                                    setShowAddTaskToDate(true);
                                                }
                                            }}
                                        >
                                            {date && (
                                                <>
                                                    <div className={`text-lg font-bold mb-2 ${isToday ? 'text-purple-600' : 'text-gray-800'}`}>
                                                        {date.getDate()}
                                                    </div>
                                                    <div className="space-y-1">
                                                        {tasksForDate.slice(0, 2).map(dateTask => (
                                                            <div
                                                                key={dateTask.id}
                                                                className={`text-xs p-2 rounded-lg truncate cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                                                                    dateTask.completed
                                                                        ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg'
                                                                        : 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-lg'
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
                                                        {tasksForDate.length > 2 && (
                                                            <div className="text-xs text-gray-600 bg-gray-200 rounded-lg p-1 text-center font-medium">
                                                                +{tasksForDate.length - 2} more
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Priority indicators */}
                                                    <div className="flex justify-center space-x-1 mt-2">
                                                        {highPriorityTasks > 0 && (
                                                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                        )}
                                                        {taskCount > 0 && (
                                                            <div className={`w-2 h-2 rounded-full ${
                                                                taskCount > 3 ? 'bg-red-400' :
                                                                    taskCount > 1 ? 'bg-yellow-400' :
                                                                        'bg-green-400'
                                                            }`}></div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-6 text-sm text-gray-600 text-center bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-2xl">
                                Click on any date to add a task • Click on tasks to mark complete • 🔴 = High priority tasks
                            </div>
                        </div>
                    </div>
                )}

                {currentView === 'projects' && (
                    <div className="space-y-8">
                        {/* Enhanced Gantt Chart */}
                        <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 shadow-xl border border-white/30">
                            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-8">
                                Project Timeline (Gantt Chart)
                            </h3>
                            {tickets.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <div className="min-w-full">
                                        {tickets.map(ticket => {
                                            const startDate = new Date(ticket.created);
                                            const endDate = new Date(ticket.deadline);
                                            const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

                                            return (
                                                <div key={ticket.id} className="flex items-center mb-6 group">
                                                    <div className="w-64 flex-shrink-0 pr-6">
                                                        <h4 className="font-bold text-gray-800 text-lg mb-2">{ticket.title}</h4>
                                                        <div className="flex items-center space-x-2">
                                                            <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${getPriorityColor(ticket.priority)} shadow-lg`}></div>
                                                            <p className="text-sm text-gray-600">{ticket.progress}% complete</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 relative h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden">
                                                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300">
                                                            <LiquidProgressBar
                                                                progress={ticket.progress}
                                                                className="h-full rounded-xl"
                                                                colors="from-purple-600 via-pink-600 to-purple-700"
                                                            />
                                                        </div>
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <span className="text-sm text-white font-bold bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
                                                                {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        {/* Deadline indicator */}
                                                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                                            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce shadow-lg"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                    <p className="text-lg">No projects to display in timeline</p>
                                </div>
                            )}
                        </div>

                        {/* Enhanced Project Cards */}
                        <div className="grid md:grid-cols-2 gap-8">
                            {tickets.map(ticket => (
                                <div key={ticket.id} className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 border border-white/30 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 group">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-2xl font-bold text-gray-800">{ticket.title}</h3>
                                        <div className="flex items-center space-x-3">
                                            <span className="text-sm text-gray-600 bg-white/50 px-3 py-1 rounded-xl">
                                                Due: {ticket.deadline}
                                            </span>
                                            {getPriorityIcon(ticket.priority)}
                                        </div>
                                    </div>

                                    {/* Radial Progress */}
                                    <div className="flex items-center justify-center mb-6">
                                        <div className="relative w-32 h-32">
                                            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                                                <path
                                                    d="m18,2.0845
                                                    a 15.9155,15.9155 0 0,1 0,31.831
                                                    a 15.9155,15.9155 0 0,1 0,-31.831"
                                                    fill="none"
                                                    stroke="rgba(156, 163, 175, 0.3)"
                                                    strokeWidth="3"
                                                />
                                                <path
                                                    d="m18,2.0845
                                                    a 15.9155,15.9155 0 0,1 0,31.831
                                                    a 15.9155,15.9155 0 0,1 0,-31.831"
                                                    fill="none"
                                                    stroke="url(#gradient)"
                                                    strokeWidth="3"
                                                    strokeDasharray={`${ticket.progress}, 100`}
                                                    strokeDashoffset="0"
                                                    strokeLinecap="round"
                                                    className="transition-all duration-1000 ease-out"
                                                />
                                                <defs>
                                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" stopColor="#8b5cf6" />
                                                        <stop offset="100%" stopColor="#ec4899" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                                    {ticket.progress}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Phase Progress */}
                                    <div className="space-y-4">
                                        {ticket.plan.phases.slice(0, 3).map((phase, index) => {
                                            const isCurrentPhase = !phase.completed && !ticket.plan.phases.slice(0, index).some(p => !p.completed);
                                            return (
                                                <div key={phase.id} className="flex items-center space-x-4">
                                                    <div className={`w-4 h-4 rounded-full transition-all duration-300 shadow-lg ${
                                                        phase.completed
                                                            ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                                                            : isCurrentPhase
                                                                ? `bg-gradient-to-r ${getPhaseColor(phase.name, index)} animate-pulse`
                                                                : 'bg-gray-400'
                                                    }`}></div>
                                                    <div className="flex-1">
                                                        <span className={`text-sm font-medium ${
                                                            phase.completed
                                                                ? 'line-through text-gray-500'
                                                                : isCurrentPhase
                                                                    ? 'text-purple-600 font-bold'
                                                                    : 'text-gray-700'
                                                        }`}>
                                                            {phase.name}
                                                            {isCurrentPhase && <span className="ml-2 text-xs animate-bounce">← Active</span>}
                                                        </span>
                                                        <div className="mt-1">
                                                            <LiquidProgressBar
                                                                progress={phase.completed ? 100 : (isCurrentPhase ? 50 : 0)}
                                                                className="h-1"
                                                                colors={getPhaseColor(phase.name, index)}
                                                            />
                                                        </div>
                                                    </div>
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
                        {/* Enhanced Stats Grid */}
                        <div className="grid md:grid-cols-4 gap-6">
                            {[
                                {
                                    title: 'Active Projects',
                                    value: tickets.length,
                                    icon: Target,
                                    gradient: 'from-blue-500 to-indigo-600',
                                    bg: 'from-blue-50 to-indigo-100'
                                },
                                {
                                    title: 'Avg Progress',
                                    value: `${tickets.length > 0 ? Math.round(tickets.reduce((sum, t) => sum + t.progress, 0) / tickets.length) : 0}%`,
                                    icon: CheckCircle,
                                    gradient: 'from-green-500 to-emerald-600',
                                    bg: 'from-green-50 to-emerald-100'
                                },
                                {
                                    title: 'Time Tracked',
                                    value: formatTime(getTotalTimeSpent()),
                                    icon: Clock,
                                    gradient: 'from-yellow-500 to-orange-600',
                                    bg: 'from-yellow-50 to-orange-100'
                                },
                                {
                                    title: 'High Priority',
                                    value: tickets.filter(t => t.priority === 'High').length,
                                    icon: AlertTriangle,
                                    gradient: 'from-red-500 to-pink-600',
                                    bg: 'from-red-50 to-pink-100'
                                }
                            ].map((stat, index) => (
                                <div key={index} className={`bg-gradient-to-br ${stat.bg} backdrop-blur-lg rounded-3xl p-8 border border-white/50 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300`}>
                                    <div className="flex items-center space-x-4 mb-6">
                                        <div className={`bg-gradient-to-r ${stat.gradient} p-4 rounded-2xl shadow-lg`}>
                                            <stat.icon className="w-8 h-8 text-white" />
                                        </div>
                                        <h3 className="font-bold text-gray-800 text-lg">{stat.title}</h3>
                                    </div>
                                    <div className="text-4xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent mb-2">
                                        {stat.value}
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        {index === 0 && 'Research projects active'}
                                        {index === 1 && 'Across all projects'}
                                        {index === 2 && 'Total time logged'}
                                        {index === 3 && 'Projects need attention'}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Enhanced Quick Actions */}
                        <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 shadow-xl border border-white/30">
                            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-8">
                                Quick Actions
                            </h3>
                            <div className="grid md:grid-cols-3 gap-6">
                                {[
                                    {
                                        title: 'Focus Mode',
                                        description: 'Hide completed tasks and show only urgent items',
                                        icon: Target,
                                        gradient: 'from-purple-500 to-indigo-600',
                                        action: () => addNotification('🎯 Focus mode activated! Showing only urgent tasks.', 'info')
                                    },
                                    {
                                        title: 'Export Data',
                                        description: 'Download your progress report as JSON',
                                        icon: TrendingUp,
                                        gradient: 'from-green-500 to-emerald-600',
                                        action: exportData
                                    },
                                    {
                                        title: 'Time Tracking',
                                        description: 'Start timer for active tasks',
                                        icon: Clock,
                                        gradient: 'from-blue-500 to-cyan-600',
                                        action: () => setShowTimeTracker(true)
                                    }
                                ].map((action, index) => (
                                    <button
                                        key={index}
                                        onClick={action.action}
                                        className="p-6 border-2 border-white/50 rounded-2xl hover:bg-white/80 transition-all duration-300 text-left group transform hover:scale-105 hover:shadow-xl bg-gradient-to-br from-white/60 to-gray-50/60 backdrop-blur-sm"
                                    >
                                        <div className="flex items-center space-x-4 mb-4">
                                            <div className={`bg-gradient-to-r ${action.gradient} p-3 rounded-xl group-hover:scale-110 transition-all duration-300 shadow-lg`}>
                                                <action.icon className="w-6 h-6 text-white" />
                                            </div>
                                            <h4 className="font-bold text-gray-800 group-hover:text-purple-600 transition-colors text-lg">
                                                {action.title}
                                            </h4>
                                        </div>
                                        <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors">
                                            {action.description}
                                        </p>
                                        {index === 2 && getTotalTimeSpent() > 0 && (
                                            <div className="mt-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                📊 Total: {formatTime(getTotalTimeSpent())}
                                            </div>
                                        )}
                                        {index === 2 && activeTimer && (
                                            <div className="mt-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                ⏱️ Timer running
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* AI Insights */}
                        <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 shadow-xl border border-white/30">
                            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-8">AI Insights</h3>

                            <div className="space-y-6">
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
                                    <div className="flex items-start space-x-4">
                                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                                            <TrendingUp className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-lg mb-2">Project Timeline Analysis</h4>
                                            <p className="text-gray-600">
                                                {tickets.length > 0 && tickets[0].progress > 0
                                                    ? `Your ${tickets[0].title} is ${tickets[0].progress}% complete. You're making excellent progress!`
                                                    : "Start completing tasks to see progress insights here."
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6">
                                    <div className="flex items-start space-x-4">
                                        <div className="bg-gradient-to-r from-yellow-500 to-orange-600 p-3 rounded-xl shadow-lg">
                                            <AlertTriangle className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-lg mb-2">Attention Needed</h4>
                                            <p className="text-gray-600">
                                                {tickets.filter(t => t.priority === 'High' && t.progress < 50).length > 0
                                                    ? `You have ${tickets.filter(t => t.priority === 'High' && t.progress < 50).length} high-priority projects that need attention.`
                                                    : "All your high-priority projects are on track! 🎯"
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
                                    <div className="flex items-start space-x-4">
                                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 rounded-xl shadow-lg">
                                            <CheckCircle className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-lg mb-2">Research Momentum</h4>
                                            <p className="text-gray-600">
                                                {tickets.length > 0
                                                    ? `You have ${tickets.length} active research projects. Excellent momentum on maintaining multiple research streams! 🚀`
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

            {/* Enhanced Notifications */}
            <div className="fixed top-24 right-6 z-50 space-y-3">
                {notifications.map(notification => (
                    <div
                        key={notification.id}
                        className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-lg transform animate-slide-in transition-all duration-500 ${
                            notification.type === 'success'
                                ? 'bg-gradient-to-r from-green-100/90 to-emerald-100/90 border-green-300 text-green-800'
                                : notification.type === 'error'
                                    ? 'bg-gradient-to-r from-red-100/90 to-pink-100/90 border-red-300 text-red-800'
                                    : 'bg-gradient-to-r from-blue-100/90 to-indigo-100/90 border-blue-300 text-blue-800'
                        }`}
                    >
                        <p className="text-sm font-medium">{notification.message}</p>
                    </div>
                ))}
            </div>

            {/* Edit Ticket Modal */}
            {editingTicket && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-white/30">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Edit Ticket</h2>
                            <button
                                onClick={() => setEditingTicket(null)}
                                className="text-gray-400 hover:text-gray-600 transform hover:scale-110 transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                                <input
                                    type="text"
                                    value={editingTicket.title}
                                    onChange={(e) => setEditingTicket({ ...editingTicket, title: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70 backdrop-blur-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={editingTicket.description}
                                    onChange={(e) => setEditingTicket({ ...editingTicket, description: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none bg-white/70 backdrop-blur-sm"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                                    <select
                                        value={editingTicket.priority}
                                        onChange={(e) => setEditingTicket({ ...editingTicket, priority: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70 backdrop-blur-sm"
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
                                        className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70 backdrop-blur-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex space-x-4 pt-4">
                                <button
                                    onClick={() => saveTicketEdit(editingTicket.id, editingTicket)}
                                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-2xl font-medium hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                                >
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => setEditingTicket(null)}
                                    className="px-8 py-4 border border-gray-300 text-gray-700 rounded-2xl font-medium hover:bg-gray-50 transition-all duration-300 transform hover:scale-105"
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-white/30">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Time Tracker</h2>
                            <button
                                onClick={() => setShowTimeTracker(false)}
                                className="text-gray-400 hover:text-gray-600 transform hover:scale-110 transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Active Timer */}
                            {activeTimer && (
                                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-bold text-purple-800 text-lg">Currently Tracking</h3>
                                            <p className="text-purple-600">
                                                {(() => {
                                                    const ticket = tickets.find(t => t.id === activeTimer.ticketId);
                                                    const task = ticket?.plan.tasks.find(task => task.id === activeTimer.taskId);
                                                    return task?.title || 'Unknown task';
                                                })()}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                                {formatTime(Math.floor((Date.now() - activeTimer.startTime) / 1000) + (timeSpent[`${activeTimer.ticketId}-${activeTimer.taskId}`] || 0))}
                                            </div>

                                            <button
                                                onClick={stopTimer}
                                                className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-2xl hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                                            >
                                                Stop Timer
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Time Summary */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
                                <h3 className="font-bold text-blue-800 text-lg mb-3">Today's Summary</h3>
                                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    Total: {formatTime(getTotalTimeSpent())}
                                </div>
                            </div>

                            {/* Tasks with Time Tracking */}
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold text-gray-800">Track Time for Tasks</h3>
                                {tickets.map(ticket => (
                                    <div key={ticket.id} className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-2xl p-6">
                                        <h4 className="font-bold text-gray-800 mb-4 text-lg">{ticket.title}</h4>
                                        <div className="space-y-3">
                                            {getRelevantTasks(ticket).map(taskItem => (
                                                <div key={taskItem.id} className="flex items-center justify-between p-4 bg-white/70 rounded-xl backdrop-blur-sm">
                                                    <div className="flex-1">
                                                        <span className="text-gray-800 font-medium">{taskItem.title}</span>
                                                        <div className="text-sm text-gray-500 mt-1">
                                                            Time spent: {formatTime(timeSpent[`${ticket.id}-${taskItem.id}`] || 0)}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        {activeTimer?.taskId === taskItem.id && activeTimer?.ticketId === ticket.id ? (
                                                            <button
                                                                onClick={stopTimer}
                                                                className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-xl text-sm hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                                                            >
                                                                Stop
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => startTimer(taskItem.id, ticket.id)}
                                                                disabled={!!activeTimer}
                                                                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-xl text-sm hover:shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl border border-white/30">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Add Task</h3>
                            <button
                                onClick={() => setShowAddTaskToDate(false)}
                                className="text-gray-400 hover:text-gray-600 transform hover:scale-110 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-600 mb-3">
                                    Adding task for {selectedDate?.toLocaleDateString()}
                                </p>
                                <input
                                    type="text"
                                    value={newDateTask}
                                    onChange={(e) => setNewDateTask(e.target.value)}
                                    placeholder="Enter task description..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70 backdrop-blur-sm"
                                />
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => {
                                        // Add task to date functionality (you'd need to implement this)
                                        addNotification('Task added to calendar', 'success');
                                        setNewDateTask('');
                                        setShowAddTaskToDate(false);
                                        setSelectedDate(null);
                                    }}
                                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-2xl font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                                >
                                    Add Task
                                </button>
                                <button
                                    onClick={() => setShowAddTaskToDate(false)}
                                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-2xl font-medium hover:bg-gray-50 transition-all duration-300 transform hover:scale-105"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Chat Widget */}
            <div className="fixed bottom-6 right-6 z-50">
                {showChat && (
                    <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/50 w-96 h-96 mb-4 flex flex-col animate-slide-up">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-t-3xl">
                            <h3 className="font-bold text-lg">AI Research Assistant</h3>
                            <p className="text-sm opacity-90">Get insights about your research progress</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {chatMessages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs p-4 rounded-2xl shadow-lg ${
                                        msg.role === 'user'
                                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                            : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800'
                                    }`}>
                                        <p className="text-sm">{msg.content}</p>
                                    </div>
                                </div>
                            ))}

                            {isProcessing && (
                                <div className="flex justify-start">
                                    <div className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 p-4 rounded-2xl">
                                        <DNALoader />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200">
                            <div className="flex space-x-3">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                                    placeholder="Ask about your research progress..."
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm bg-white/70 backdrop-blur-sm"
                                    disabled={isProcessing}
                                />
                                <button
                                    onClick={handleChatSubmit}
                                    disabled={isProcessing || !chatInput.trim()}
                                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-2xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => setShowChat(!showChat)}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 animate-bounce"
                >
                    <MessageCircle className="w-8 h-8" />
                </button>
            </div>

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(180deg); }
                }

                @keyframes slide-in {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }

                @keyframes slide-up {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }

                .animate-slide-in {
                    animation: slide-in 0.5s ease-out;
                }

                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }

                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }

                .animate-reverse {
                    animation-direction: reverse;
                }
            `}</style>
        </div>
    );
};

export default ResearchTodoApp;
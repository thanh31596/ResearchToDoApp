import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Target, TrendingUp, MessageCircle, Plus, CheckCircle, AlertTriangle, Brain, Edit, X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import ApiService from '../services/api';
// In your React app, update the API calls:
const API_BASE_URL = 'http://localhost:5000/api';


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

    const [tickets, setTickets] = useState([
        {
            id: 1,
            title: "Nanoparticle Study Project",
            description: "Comprehensive research project on nanoparticle synthesis and applications",
            priority: "High",
            deadline: "2025-10-30",
            created: "2025-07-01",
            status: "in-progress",
            progress: 35,
            estimatedHours: 120,
            plan: {
                phases: [
                    { id: 1, name: "Literature Review", startDate: "2025-07-01", endDate: "2025-07-15", completed: true },
                    { id: 2, name: "Experimental Design", startDate: "2025-07-16", endDate: "2025-08-01", completed: false },
                    { id: 3, name: "Data Collection", startDate: "2025-08-02", endDate: "2025-09-15", completed: false },
                    { id: 4, name: "Analysis & Results", startDate: "2025-09-16", endDate: "2025-10-15", completed: false },
                    { id: 5, name: "Report Writing", startDate: "2025-10-16", endDate: "2025-10-30", completed: false }
                ],
                tasks: [
                    { id: 1, title: "Search latest papers on nanoparticle synthesis", phase: 1, completed: true, deadline: "2025-07-05" },
                    { id: 2, title: "Run weekly simulation", phase: 2, completed: false, deadline: "2025-07-03" },
                    { id: 3, title: "Design experimental protocol", phase: 2, completed: false, deadline: "2025-07-25" }
                ]
            }
        },
        {
            id: 2,
            title: "Conference Paper Submission",
            description: "Write and submit paper for International AI Conference",
            priority: "High",
            deadline: "2025-08-30",
            created: "2025-06-15",
            status: "in-progress",
            progress: 20,
            estimatedHours: 80,
            plan: {
                phases: [
                    { id: 1, name: "Outline & Structure", startDate: "2025-06-15", endDate: "2025-07-01", completed: true },
                    { id: 2, name: "Introduction & Background", startDate: "2025-07-02", endDate: "2025-07-20", completed: false },
                    { id: 3, name: "Methodology & Results", startDate: "2025-07-21", endDate: "2025-08-10", completed: false },
                    { id: 4, name: "Review & Submission", startDate: "2025-08-11", endDate: "2025-08-30", completed: false }
                ],
                tasks: [
                    { id: 4, title: "Draft introduction section", phase: 2, completed: false, deadline: "2025-07-10" },
                    { id: 5, title: "Create methodology diagrams", phase: 3, completed: false, deadline: "2025-07-25" }
                ]
            }
        }
    ]);

    const [chatMessages, setChatMessages] = useState([
        { role: 'assistant', content: 'Hello! I\'m your AI research assistant. I can help you create detailed project plans. Try describing a research task or project you\'d like to work on!' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Add notification helper
    const addNotification = (message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 4000);
    };

    const GEMINI_API_KEY = "AIzaSyB_S8LYf2-YUD9ssMXqe9FzeWaqYEE90FI";

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerInterval) {
                clearInterval(timerInterval);
            }
        };
    }, [timerInterval]);

    // Calendar helpers
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Add empty cells for days before the month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add all days of the month
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

    const handleCreateTaskSubmit = async () => {
        if (!newTaskInput.trim()) return;

        setIsGeneratingPlan(true);

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are an AI research productivity assistant. The user wants to create a new research project/task: "${newTaskInput}"

Create a comprehensive project plan with the following structure. 

CRITICAL: Respond with ONLY valid JSON. Do not include markdown code blocks, backticks, or any other formatting. Just pure JSON.

{
  "title": "Clear, concise project title",
  "description": "Detailed description of the project",
  "priority": "High|Medium|Low",
  "deadline": "YYYY-MM-DD (estimate a reasonable deadline 1-6 months from now)",
  "estimatedHours": number (total estimated hours),
  "phases": [
    {
      "id": 1,
      "name": "Phase name",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "completed": false
    }
  ],
  "tasks": [
    {
      "id": 1,
      "title": "Specific actionable task",
      "phase": 1,
      "completed": false,
      "deadline": "YYYY-MM-DD"
    }
  ]
}

Rules:
- Create 3-5 logical phases that build upon each other
- Each phase should have 5-15 specific, actionable tasks
- Deadlines should be realistic and well-spaced
- Consider research workflows: literature review → methodology → experimentation → analysis → writing
- Tasks should be specific enough to complete in 1-4 hours each
- Start dates should be today (2025-07-01) or later
- Make it comprehensive but realistic for academic research

IMPORTANT: Return ONLY the JSON object. No markdown formatting, no backticks, no explanatory text.`
                        }]
                    }]
                })
            });

            const result = await response.json();
            let responseText = result.candidates[0].content.parts[0].text;

            // Clean up markdown code blocks if present
            responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

            // Additional cleanup for common formatting issues
            responseText = responseText.replace(/^[^{]*({.*})[^}]*$/s, '$1');

            console.log('Cleaned response:', responseText); // Debug log

            const planData = JSON.parse(responseText);

            // Validate required fields
            if (!planData.title || !planData.phases || !planData.tasks) {
                throw new Error('AI response missing required fields');
            }

            const newTicket = {
                id: Date.now(),
                title: planData.title,
                description: planData.description,
                priority: planData.priority,
                deadline: planData.deadline,
                created: new Date().toISOString().split('T')[0],
                status: "planned",
                progress: 0,
                estimatedHours: planData.estimatedHours,
                plan: {
                    phases: planData.phases,
                    tasks: planData.tasks
                }
            };

            setTickets(prev => [...prev, newTicket]);
            setNewTaskInput('');
            setShowCreateTask(false);

        } catch (error) {
            console.error('Error generating plan:', error);
            console.error('Raw response:', error.response || 'No response data');

            // More user-friendly error message
            const errorMessage = error.message.includes('JSON')
                ? 'AI returned invalid format. Please try rephrasing your request.'
                : 'Failed to generate plan. Please check your internet connection and try again.';

            alert(errorMessage);
        }

        setIsGeneratingPlan(false);
    };

    const handleChatSubmit = async () => {
        if (!chatInput.trim()) return;

        const userMessage = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsProcessing(true);

        try {
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
            console.error('Error calling Gemini API:', error);
            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: 'I apologize, but I encountered an error. Please try again.'
            }]);
        }

        setIsProcessing(false);
    };

    const toggleTaskComplete = (ticketId, taskId) => {
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
                let newTasksGenerated = false;

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
                                deadline: getNextTaskDeadline(nextIncompletePhase.startDate, index)
                            }));

                            finalTasks = [...finalTasks, ...newTasks];
                            newTasksGenerated = true;

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
    // Helper function to get the most relevant tasks to show
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

    // Helper function to calculate next task deadline
    const getNextTaskDeadline = (phaseStartDate, taskIndex) => {
        const startDate = new Date(phaseStartDate);
        const daysToAdd = (taskIndex + 1) * 3; // Space tasks 3 days apart
        const deadline = new Date(startDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
        return deadline.toISOString().split('T')[0];
    };

    // Time tracking functions
    const startTimer = (taskId, ticketId) => {
        if (activeTimer) {
            stopTimer();
        }

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
    };

    const stopTimer = () => {
        if (timerInterval) {
            clearInterval(timerInterval);
            setTimerInterval(null);
        }

        if (activeTimer) {
            const duration = Math.floor((Date.now() - activeTimer.startTime) / 1000);
            setTimeSpent(prev => ({
                ...prev,
                [`${activeTimer.ticketId}-${activeTimer.taskId}`]: (prev[`${activeTimer.ticketId}-${activeTimer.taskId}`] || 0) + duration
            }));

            addNotification('⏹️ Timer stopped!', 'info');
        }

        setActiveTimer(null);
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

    const exportData = () => {
        const data = {
            tickets,
            timeSpent,
            exportDate: new Date().toISOString(),
            totalTimeSpent: getTotalTimeSpent()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `research-productivity-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        addNotification('📊 Data exported successfully!', 'success');
    };

    const enableFocusMode = () => {
        // Filter to show only incomplete high-priority tasks
        addNotification('🎯 Focus mode activated! Showing only urgent tasks.', 'info');
        // You could implement additional filtering logic here
    };

    const deleteTicket = (ticketId) => {
        if (window.confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
            setTickets(prev => prev.filter(ticket => ticket.id !== ticketId));
        }
    };

    const saveTicketEdit = (ticketId, updatedData) => {
        setTickets(prev => prev.map(ticket =>
            ticket.id === ticketId ? { ...ticket, ...updatedData } : ticket
        ));
        setEditingTicket(null);
    };

    const addTaskToDate = () => {
        if (!newDateTask.trim() || !selectedDate) return;

        const dateStr = selectedDate.toISOString().split('T')[0];
        const newTask = {
            id: Date.now(),
            title: newDateTask,
            phase: 1,
            completed: false,
            deadline: dateStr
        };

        // Add to first available ticket or create a general ticket
        if (tickets.length > 0) {
            const firstTicket = tickets[0];
            setTickets(prev => prev.map(ticket =>
                ticket.id === firstTicket.id
                    ? { ...ticket, plan: { ...ticket.plan, tasks: [...ticket.plan.tasks, newTask] } }
                    : ticket
            ));
        }

        setNewDateTask('');
        setShowAddTaskToDate(false);
        setSelectedDate(null);
    };

    const togglePhaseComplete = (ticketId, phaseId) => {
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

    // Gantt Chart Component
    const GanttChart = ({ tickets }) => {
        const startDate = new Date(Math.min(...tickets.map(t => new Date(t.created))));
        const endDate = new Date(Math.max(...tickets.map(t => new Date(t.deadline))));

        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const monthsToShow = Math.ceil(totalDays / 30);

        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Project Timeline (Gantt Chart)</h3>
                <div className="overflow-x-auto">
                    <div className="min-w-full">
                        {/* Header with months */}
                        <div className="flex mb-4">
                            <div className="w-64 flex-shrink-0"></div>
                            <div className="flex-1 flex">
                                {Array.from({ length: monthsToShow }, (_, i) => {
                                    const month = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
                                    return (
                                        <div key={i} className="flex-1 text-center text-sm font-medium text-gray-600 border-l border-gray-200 px-2">
                                            {month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Project rows */}
                        {tickets.map(ticket => {
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
            </div>
        );
    };

    const todayTasks = tickets.flatMap(ticket =>
        ticket.plan.tasks.filter(task => {
            const today = new Date().toISOString().split('T')[0];
            return task.deadline === today || (!task.completed && new Date(task.deadline) <= new Date());
        }).map(task => ({ ...task, ticketId: ticket.id, projectName: ticket.title }))
    );

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
                                    onClick={addTaskToDate}
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

            {/* Main Content */}
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
                                {todayTasks.slice(0, 3).map(task => (
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
                                                    <h3 className={`font-semibold ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                                        {task.title}
                                                    </h3>
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
                                        </div>
                                    </div>
                                ))}
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
                                                <h4 className="font-semibold text-gray-800 mb-3">Project Phases</h4>
                                                <div className="space-y-2">
                                                    {ticket.plan.phases.map((phase, index) => {
                                                        const isCurrentPhase = !phase.completed && !ticket.plan.phases.slice(0, index).some(p => !p.completed);
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
                                                                                    : 'text-gray-700'
                                                                        }`}
                                                                        onDoubleClick={() => setEditingPhase(`${ticket.id}-${phase.id}`)}
                                                                    >
                                    {phase.name}
                                                                        {isCurrentPhase && <span className="ml-1 text-xs">← Current</span>}
                                  </span>
                                                                )}
                                                                <span className="text-gray-400">({phase.startDate} - {phase.endDate})</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="font-semibold text-gray-800 mb-3">Current Tasks</h4>
                                                <div className="space-y-2">
                                                    {getRelevantTasks(ticket).map(task => (
                                                        <div key={task.id} className="flex items-center space-x-2">
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
                                                                    className={`text-sm cursor-pointer hover:text-purple-600 transition-colors ${task.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}
                                                                    onDoubleClick={() => setEditingTask(`${ticket.id}-${task.id}`)}
                                                                >
                                  {task.title}
                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {getRelevantTasks(ticket).length === 0 && (
                                                        <div className="text-sm text-gray-500 italic">
                                                            🎉 All tasks completed! Great work!
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
                        <GanttChart tickets={tickets} />

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
                                                    <button
                                                        onClick={() => togglePhaseComplete(ticket.id, phase.id)}
                                                        className={`w-2 h-2 rounded-full transition-colors ${
                                                            phase.completed
                                                                ? 'bg-green-400'
                                                                : isCurrentPhase
                                                                    ? 'bg-purple-400 animate-pulse'
                                                                    : 'bg-gray-400 hover:bg-purple-300'
                                                        }`}
                                                    ></button>
                                                    <span
                                                        className={`cursor-pointer hover:text-purple-600 transition-colors ${
                                                            phase.completed
                                                                ? 'line-through text-gray-500'
                                                                : isCurrentPhase
                                                                    ? 'text-purple-600 font-medium'
                                                                    : 'text-gray-700'
                                                        }`}
                                                        onDoubleClick={() => setEditingPhase(`${ticket.id}-${phase.id}`)}
                                                    >
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
                                    onClick={enableFocusMode}
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
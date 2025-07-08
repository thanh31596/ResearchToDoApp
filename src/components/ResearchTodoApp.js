import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Target, TrendingUp, MessageCircle, Plus, CheckCircle, AlertTriangle, Brain, Edit, X, ChevronLeft, ChevronRight, Trash2, Flame,  LogOut, User, BookOpen,ChevronDown } from 'lucide-react';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { NoteIcon, NoteEditor, NotesSidebar } from './Notes/NoteComponents';
// Add this at the top of your component

const formatDateForInput = (dateString) => {
    if (!dateString) return '';

    // If it's already in the correct format (YYYY-MM-DD), return as is
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateString;
    }

    // Handle ISO datetime strings and Date objects
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';

        // Return in YYYY-MM-DD format
        return date.toISOString().split('T')[0];
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
};
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

// Enhanced markdown parser
const parseMarkdownContent = (text) => {
    if (!text) return '';

    // Parse bold text
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Parse numbered lists with bold titles
    text = text.replace(/^(\d+)\.\s+\*\*(.*?)\*\*\s*(.*)$/gm, (match, num, title, desc) => {
        return `<div class="numbered-item" data-number="${num}"><div class="item-title">${title}</div><div class="item-desc">${desc}</div></div>`;
    });

    // Parse bullet points with bold text
    text = text.replace(/^[•\-]\s+\*\*(.*?)\*\*:\s*(.*)$/gm, (match, bold, rest) => {
        return `<div class="bullet-item"><span class="bullet-bold">${bold}:</span> ${rest}</div>`;
    });

    // Parse regular bullet points
    text = text.replace(/^[•\-]\s+(.*)$/gm, '<div class="bullet-item">$1</div>');

    // Parse sub-items (indented with -)
    text = text.replace(/^\s+[-]\s+(.*)$/gm, '<div class="sub-item">$1</div>');

    // Convert line breaks
    text = text.replace(/\n/g, '<br>');

    return text;
};

// Parse guidance sections with proper markdown rendering
const parseGuidanceContent = (text) => {
    if (!text) return [];

    const sections = text.split(/##\s+/g).filter(Boolean);

    return sections.map(section => {
        const lines = section.trim().split('\n');
        const titleLine = lines[0];
        const contentLines = lines.slice(1).join('\n').trim();

        // Extract emoji and title
        const emojiMatch = titleLine.match(/^([\u{1F300}-\u{1F9FF}])/u);
        const emoji = emojiMatch ? emojiMatch[1] : '📌';
        const title = titleLine.replace(/^[\u{1F300}-\u{1F9FF}]\s*/u, '').trim();

        // Parse the markdown content
        const parsedContent = parseMarkdownContent(contentLines);

        return {
            emoji,
            title,
            content: parsedContent,
            rawContent: contentLines,
            isExpanded: true
        };
    });
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
    // Note-related state
    const [notes, setNotes] = useState([]);
    const [editingNote, setEditingNote] = useState(null);
    const [showNotesSidebar, setShowNotesSidebar] = useState(false);
    const [noteTarget, setNoteTarget] = useState(null);
    const [chatMessages, setChatMessages] = useState([
        { role: 'assistant', content: 'Hello! I\'m your AI research assistant. I can help you create detailed project plans. Try describing a research task or project you\'d like to work on!' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [calendarProjectFilter, setCalendarProjectFilter] = useState('all'); // 'all' or specific project ID

    const [dailyTimeData, setDailyTimeData] = useState([]);
    const [timeByPhase, setTimeByPhase] = useState({});
    const [riskAnalysis, setRiskAnalysis] = useState({});
    const [whatIfHours, setWhatIfHours] = useState(2); // Extra hours per day
    const [selectedRiskProject, setSelectedRiskProject] = useState(null);

    const [showGuidanceModal, setShowGuidanceModal] = useState(false);
    const [taskGuidance, setTaskGuidance] = useState(null);
    const [loadingGuidance, setLoadingGuidance] = useState(false);
    const [guidanceTaskInfo, setGuidanceTaskInfo] = useState(null);
    const [guidanceSections, setGuidanceSections] = useState([]);
    // Load data from backend on component mount
    useEffect(() => {
        loadTickets();
        loadActiveTimer();
        loadTimeSummary();
        loadNotes(); // ADD THIS LINE
        loadTimeAnalytics(); // ADD THIS LINE
    }, []); // eslint-disable-line react-hooks/exhaustive-deps


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
    // Calculate risk scores when tickets change
    useEffect(() => {
        const risks = {};
        tickets.forEach(ticket => {
            risks[ticket.id] = calculateDeadlineRisk(ticket);
        });
        setRiskAnalysis(risks);
    }, [tickets]); // eslint-disable-line react-hooks/exhaustive-deps
    // Calculate deadline risk score for a project
    const calculateDeadlineRisk = (ticket) => {
        const today = new Date();
        const deadline = new Date(ticket.deadline);
        const created = new Date(ticket.created);

        // Calculate progress metrics
        const totalDays = Math.max(1, (deadline - created) / (1000 * 60 * 60 * 24));
        const daysElapsed = Math.max(0, (today - created) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(0, (deadline - today) / (1000 * 60 * 60 * 24));
        const timeProgress = Math.min(100, (daysElapsed / totalDays) * 100);

        // Calculate task metrics
        const incompleteTasks = ticket.plan.tasks.filter(t => !t.completed).length;
        const totalTasks = ticket.plan.tasks.length;
        const taskProgress = ticket.progress;

        // Calculate phase slippage
        let phaseSlippage = 0;
        ticket.plan.phases.forEach(phase => {
            if (!phase.completed && new Date(phase.end_date) < today) {
                phaseSlippage++;
            }
        });

        // Risk calculation (rule-based model)
        let riskScore = 0;

        // Time vs progress discrepancy (weight: 40%)
        const progressDiscrepancy = timeProgress - taskProgress;
        if (progressDiscrepancy > 30) riskScore += 40;
        else if (progressDiscrepancy > 20) riskScore += 30;
        else if (progressDiscrepancy > 10) riskScore += 20;
        else if (progressDiscrepancy > 0) riskScore += 10;

        // Days remaining (weight: 30%)
        if (daysRemaining < 3) riskScore += 30;
        else if (daysRemaining < 7) riskScore += 20;
        else if (daysRemaining < 14) riskScore += 10;

        // Incomplete tasks (weight: 20%)
        const incompleteRatio = incompleteTasks / Math.max(1, totalTasks);
        if (incompleteRatio > 0.7) riskScore += 20;
        else if (incompleteRatio > 0.5) riskScore += 15;
        else if (incompleteRatio > 0.3) riskScore += 10;

        // Phase slippage (weight: 10%)
        if (phaseSlippage > 2) riskScore += 10;
        else if (phaseSlippage > 0) riskScore += 5;

        // Already overdue
        if (today > deadline) riskScore = Math.max(riskScore, 80);

        return {
            score: Math.min(100, riskScore),
            level: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
            daysRemaining,
            progressDiscrepancy: Math.round(progressDiscrepancy),
            incompleteTasks,
            phaseSlippage
        };
    };


    // Calculate productivity metrics from real data
    const calculateProductivityMetrics = () => {
        const totalTimeSeconds = Object.values(timeSpent).reduce((sum, time) => sum + time, 0);

        // Time by project from actual data
        const timeByProject = {};
        Object.entries(timeSpent).forEach(([key, seconds]) => {
            const [ticketId] = key.split('-');
            const ticket = tickets.find(t => t.id === parseInt(ticketId));
            if (ticket) {
                if (!timeByProject[ticket.title]) {
                    timeByProject[ticket.title] = {
                        seconds: 0,
                        priority: ticket.priority,
                        ticketId: ticket.id
                    };
                }
                timeByProject[ticket.title].seconds += seconds;
            }
        });

        // Calculate focus ratio (time on high priority)
        const highPriorityTime = Object.values(timeByProject)
            .filter(p => p.priority === 'High')
            .reduce((sum, p) => sum + p.seconds, 0);
        const focusRatio = totalTimeSeconds > 0 ? (highPriorityTime / totalTimeSeconds * 100).toFixed(1) : 0;

        // Calculate average daily hours from real data
        const totalDailySeconds = dailyTimeData.reduce((sum, day) => sum + day.seconds, 0);
        const avgDailyHours = dailyTimeData.length > 0 ? (totalDailySeconds / dailyTimeData.length / 3600).toFixed(1) : 0;

        // Phase productivity - which phases take most time
        const phaseProductivity = Object.entries(timeByPhase)
            .sort((a, b) => b[1].seconds - a[1].seconds)
            .slice(0, 5); // Top 5 phases

        return {
            timeByProject,
            focusRatio,
            dailyIntensity: dailyTimeData,
            totalTimeSeconds,
            avgDailyHours,
            phaseProductivity
        };
    };
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
                deadline: formatDateForInput(ticket.deadline),
                created: ticket.created_at?.split('T')[0],
                status: ticket.status,
                progress: ticket.progress,
                estimatedHours: ticket.estimated_hours,
                plan: {
                    phases: ticket.phases || [],
                    tasks: (ticket.tasks || []).map(task => ({
                        ...task,
                        phase: task.phase_id, // Map phase_id to phase for frontend compatibility
                        deadline: formatDateForInput(task.deadline)
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
    // Load time analytics data
    const loadTimeAnalytics = async () => {
        try {
            // Get daily time data for last 7 days
            const dailyData = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                const summary = await apiService.getTimeSummary(dateStr);
                const totalSeconds = summary.reduce((sum, item) => sum + item.total_seconds, 0);

                dailyData.push({
                    date: dateStr,
                    day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                    hours: totalSeconds / 3600,
                    seconds: totalSeconds
                });
            }
            setDailyTimeData(dailyData);

            // Calculate time by phase
            const phaseTime = {};
            tickets.forEach(ticket => {
                ticket.plan.phases.forEach(phase => {
                    const phaseTasks = ticket.plan.tasks.filter(task => task.phase === phase.id);
                    let phaseSeconds = 0;

                    phaseTasks.forEach(task => {
                        const timeKey = `${ticket.id}-${task.id}`;
                        if (timeSpent[timeKey]) {
                            phaseSeconds += timeSpent[timeKey];
                        }
                    });

                    if (phaseSeconds > 0) {
                        const key = `${ticket.title} - ${phase.name}`;
                        phaseTime[key] = {
                            seconds: phaseSeconds,
                            ticketId: ticket.id,
                            phaseId: phase.id,
                            priority: ticket.priority
                        };
                    }
                });
            });
            setTimeByPhase(phaseTime);

        } catch (error) {
            console.error('Error loading time analytics:', error);
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
    // Load notes from backend
    const loadNotes = async () => {
        try {
            const backendNotes = await apiService.getNotes();
            setNotes(backendNotes || []); // Add fallback to empty array
        } catch (error) {
            console.error('Error loading notes:', error);
            setNotes([]); // Set empty array on error
        }
    };

    // Note functions
    const handleNoteClick = (type, id, ticketId) => {
        setNoteTarget({ type, id, ticketId });
        setEditingNote({ type, id, ticketId });
    };

    const handleNoteSave = async (content) => {
        if (noteTarget) {
            await loadTickets();
            await loadNotes();
            addNotification('📝 Note saved successfully!', 'success');
        }
    };

    const handleNoteClose = () => {
        setEditingNote(null);
        setNoteTarget(null);
    };

    const handleNoteDelete = async () => {
        await loadTickets();
        await loadNotes();
        setEditingNote(null);
        setNoteTarget(null);
        addNotification('🗑️ Note deleted successfully!', 'success');
    };

    const openNotesSidebar = () => {
        setShowNotesSidebar(true);
    };

    const handleNoteExport = () => {
        addNotification('📄 Notes exported successfully!', 'success');
    };

    // Check if task or phase has a note
    const hasNote = (type, id) => {
        // Safety check: ensure tickets exists and is an array
        if (!tickets || !Array.isArray(tickets)) {
            return false;
        }

        if (type === 'task') {
            return tickets.some(ticket =>
                ticket?.tasks?.some(task => task.id === id && task.note?.content?.trim())
            );
        } else if (type === 'phase') {
            return tickets.some(ticket =>
                ticket?.plan?.phases?.some(phase => phase.id === id && phase.note?.content?.trim())
            );
        }
        return false;
    };
// Get AI guidance for a task
    const getTaskGuidance = async (task, ticket, phase) => {
        setLoadingGuidance(true);
        setShowGuidanceModal(true);
        setGuidanceTaskInfo({ task, ticket, phase });

        try {
            const response = await apiService.getTaskGuidance({
                taskTitle: task.title,
                taskId: task.id,
                projectTitle: ticket.title,
                projectDescription: ticket.description,
                phaseInfo: {
                    phaseName: phase.name,
                    phaseId: phase.id
                }
            });

            setTaskGuidance(response.guidance);
            const sections = parseGuidanceContent(response.guidance);
            setGuidanceSections(sections);
        } catch (error) {
            console.error('Error getting task guidance:', error);
            setTaskGuidance('Failed to generate guidance. Please try again.');
            setGuidanceSections([]);
            addNotification('Failed to get task guidance', 'error');
        } finally {
            setLoadingGuidance(false);
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
                deadline: formatDateForInput(newTicket.deadline),
                created: newTicket.created_at?.split('T')[0],
                status: newTicket.status,
                progress: newTicket.progress || 0,
                estimatedHours: newTicket.estimated_hours,
                plan: {
                    phases: newTicket.phases || [],
                    tasks: (newTicket.tasks || []).map(task => ({
                        ...task,
                        phase: task.phase_id || task.phase, // Handle both phase_id and phase
                        deadline: formatDateForInput(task.deadline)
                    }))
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
    // Update task deadline
    const updateTaskDeadline = async (ticketId, taskId, newDeadline) => {
        try {
            // Update local state immediately
            setTickets(prev => prev.map(ticket =>
                ticket.id === ticketId
                    ? { ...ticket, plan: { ...ticket.plan, tasks: ticket.plan.tasks.map(task =>
                                task.id === taskId ? { ...task, deadline: newDeadline } : task
                            ) } }
                    : ticket
            ));

            // Update backend
            await apiService.updateTask(taskId, { deadline: newDeadline });
            addNotification('Task deadline updated', 'success');
        } catch (error) {
            console.error('Error updating task deadline:', error);
            addNotification('Failed to update task deadline', 'error');
            // Reload to sync with backend
            await loadTickets();
        }
    };

    // Update phase name
    const updatePhaseName = async (ticketId, phaseId, newName) => {
        try {
            // Update local state immediately
            setTickets(prev => prev.map(ticket =>
                ticket.id === ticketId
                    ? { ...ticket, plan: { ...ticket.plan, phases: ticket.plan.phases.map(phase =>
                                phase.id === phaseId ? { ...phase, name: newName } : phase
                            ) } }
                    : ticket
            ));

            // Update backend
            await apiService.updatePhase(phaseId, { name: newName });
            addNotification('Phase name updated', 'success');
        } catch (error) {
            console.error('Error updating phase name:', error);
            addNotification('Failed to update phase name', 'error');
            // Reload to sync with backend
            await loadTickets();
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

        // Filter tickets based on calendar project filter
        const filteredTickets = calendarProjectFilter === 'all'
            ? tickets
            : tickets.filter(ticket => ticket.id === parseInt(calendarProjectFilter));

        const allTasks = filteredTickets.flatMap(ticket =>
            ticket.plan.tasks.map(task => ({
                ...task,
                ticketId: ticket.id,
                projectName: ticket.title,
                projectColor: getProjectColor(tickets.indexOf(tickets.find(t => t.id === ticket.id)))
            }))
        );

        const matchingTasks = allTasks.filter(task => task.deadline === dateStr);
        return matchingTasks;
    };
    const getProjectColor = (index) => {
        const projectColors = [
            { bg: 'from-purple-400 to-indigo-500', text: 'text-purple-700' },
            { bg: 'from-pink-400 to-rose-500', text: 'text-pink-700' },
            { bg: 'from-blue-400 to-cyan-500', text: 'text-blue-700' },
            { bg: 'from-green-400 to-emerald-500', text: 'text-green-700' },
            { bg: 'from-yellow-400 to-orange-500', text: 'text-yellow-700' }
        ];
        return projectColors[index % projectColors.length];
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

    // const getPriorityIcon = (priority) => {
    //     switch (priority) {
    //         case 'High': return <Flame className="w-4 h-4 text-red-500" />;
    //         case 'Medium': return <Zap className="w-4 h-4 text-yellow-500" />;
    //         case 'Low': return <Leaf className="w-4 h-4 text-green-500" />;
    //         default: return null;
    //     }
    // };

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

    // const getStatusColor = (status) => {
    //     switch (status) {
    //         case 'completed': return 'bg-green-100 text-green-800';
    //         case 'in-progress': return 'bg-blue-100 text-blue-800';
    //         case 'planned': return 'bg-gray-100 text-gray-800';
    //         default: return 'bg-gray-100 text-gray-800';
    //     }
    // };
// Task Item Component for Today's Focus
    const TaskItem = ({ task }) => {
        const [isHovered, setIsHovered] = useState(false);

        return (
            <div
                className="bg-gradient-to-br from-white/80 to-purple-50/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-md hover:shadow-lg transform hover:scale-[1.01] transition-all duration-300"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                            <button
                                onClick={() => toggleTaskComplete(task.ticketId, task.id)}
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-300 transform hover:scale-110 ${
                                    task.completed
                                        ? 'bg-gradient-to-r from-green-400 to-emerald-500 border-green-400 shadow-md'
                                        : 'border-gray-300 hover:border-purple-400 hover:shadow-sm'
                                }`}
                            >
                                {task.completed && <CheckCircle className="w-3 h-3 text-white" />}
                            </button>
                            {editingTask === `${task.ticketId}-${task.id}` ? (
                                <input
                                    type="text"
                                    value={task.title}
                                    onChange={(e) => {
                                        setTickets(prev => prev.map(ticket =>
                                            ticket.id === task.ticketId
                                                ? { ...ticket, plan: { ...ticket.plan, tasks: ticket.plan.tasks.map(t => t.id === task.id ? { ...t, title: e.target.value } : t) } }
                                                : ticket
                                        ));
                                    }}
                                    onBlur={() => setEditingTask(null)}
                                    onKeyPress={(e) => e.key === 'Enter' && setEditingTask(null)}
                                    className="font-medium text-gray-800 border-b border-purple-300 focus:outline-none bg-transparent flex-1"
                                    autoFocus
                                />
                            ) : (
                                <h3
                                    className={`font-medium cursor-pointer hover:text-purple-600 transition-colors flex-1 ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}
                                    onDoubleClick={() => setEditingTask(`${task.ticketId}-${task.id}`)}
                                    title="Double-click to edit"
                                >
                                    {task.title}
                                </h3>
                            )}
                            <NoteIcon
                                hasNote={hasNote('task', task.id)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleNoteClick('task', task.id, task.ticketId);
                                }}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-xs text-gray-600">
                            <span className="text-purple-600 font-medium bg-purple-100 px-2 py-1 rounded">
                                {task.projectName}
                            </span>
                                <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                    {task.deadline}
                            </span>
                                {timeSpent[`${task.ticketId}-${task.id}`] && (
                                    <span className="text-blue-600 flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                        {formatTime(timeSpent[`${task.ticketId}-${task.id}`])}
                                </span>
                                )}
                            </div>

                            <div className="flex items-center space-x-2">
                                {(!activeTimer || (activeTimer.taskId !== task.id || activeTimer.ticketId !== task.ticketId)) && isHovered && (
                                    <button
                                        onClick={() => startTimer(task.id, task.ticketId)}
                                        className="bg-gradient-to-r from-green-400 to-emerald-500 text-white p-2 rounded-lg hover:shadow-md transform hover:scale-110 transition-all duration-300"
                                        title="Start timer"
                                    >
                                        <Clock className="w-3 h-3" />
                                    </button>
                                )}
                                {activeTimer?.taskId === task.id && activeTimer?.ticketId === task.ticketId && (
                                    <span className="text-green-600 animate-pulse text-xs bg-green-100 px-2 py-1 rounded-full">
                                    ⏱️ Tracking
                                </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
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
    // const todaysFocusTasks = getTodaysFocusTasks();

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
                                onClick={openNotesSidebar}
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 md:px-6 py-3 rounded-2xl font-medium hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-2 hover:from-blue-600 hover:to-indigo-700"
                                title="View all notes"
                            >
                                <BookOpen className="w-5 h-5" />
                                <span className="hidden md:inline">Notes</span>
                                {notes.length > 0 && (
                                    <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                                  {notes.length}
                                </span>
                                )}
                            </button>
                            <button
                                onClick={() => setShowCreateTask(true)}
                                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 md:px-6 py-3 rounded-2xl font-medium hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-2 hover:from-purple-600 hover:to-pink-600"
                            >
                                <Plus className="w-5 h-5" />
                                <span className="hidden md:inline">Create Task</span>
                            </button>

                            <nav className="flex space-x-1 bg-white/70 backdrop-blur-sm rounded-2xl p-1 shadow-lg border border-white/30 overflow-x-auto md:overflow-visible">
                                {[
                                    { key: 'daily', label: 'Daily', icon: Clock },
                                    { key: 'calendar', label: 'Calendar', icon: Calendar },
                                    { key: 'analytics', label: 'Analytics', icon: TrendingUp }
                                ].map(({ key, label, icon: Icon }) => (
                                    <button
                                        key={key}
                                        onClick={() => setCurrentView(key)}
                                        className={`flex items-center space-x-2 px-3 md:px-4 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 whitespace-nowrap ${
                                            currentView === key
                                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                                : 'text-gray-600 hover:text-purple-600 hover:bg-white/50'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="font-medium hidden md:inline">{label}</span>
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
                    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 h-auto lg:h-[calc(100vh-200px)]">
                        {/* Left Column - Projects Overview */}
                        <div className="col-span-1 lg:col-span-7 overflow-y-auto lg:pr-2 custom-scrollbar max-h-[60vh] lg:max-h-none">
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                        Projects Overview
                                    </h2>
                                    <button
                                        onClick={() => setShowCreateTask(true)}
                                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-300 flex items-center space-x-1 text-sm"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>New Project</span>
                                    </button>
                                </div>

                                {/* Compact Project Cards */}
                                <div className="space-y-4">
                                    {tickets.map((ticket, index) => {
                                        const projectColors = [
                                            'from-purple-500 to-indigo-600',
                                            'from-pink-500 to-rose-600',
                                            'from-blue-500 to-cyan-600',
                                            'from-green-500 to-emerald-600',
                                            'from-yellow-500 to-orange-600'
                                        ];
                                        const colorClass = projectColors[index % projectColors.length];
                                        const currentPhase = ticket.plan.phases.find(phase => !phase.completed);
                                        const completedTasks = ticket.plan.tasks.filter(t => t.completed).length;
                                        const totalTasks = ticket.plan.tasks.length;

                                        return (
                                            <div key={ticket.id} className={`bg-white/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-white/50 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300`}>
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-2 mb-1">
                                                            <h3 className="font-bold text-lg text-gray-800">{ticket.title}</h3>
                                                            <div className={`px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r ${colorClass} text-white shadow-md`}>
                                                                {ticket.priority}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-600 line-clamp-1">{ticket.description}</p>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <button
                                                            onClick={() => setEditingTicket(ticket)}
                                                            className="p-2 text-gray-400 hover:text-purple-600 transform hover:scale-110 transition-all"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteTicket(ticket.id)}
                                                            className="p-2 text-gray-400 hover:text-red-600 transform hover:scale-110 transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-4">
                                                    {/* Mini Donut Chart */}
                                                    <div className="relative w-20 h-20">
                                                        <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                                                            <path
                                                                d="m18,2.0845
                                                a 15.9155,15.9155 0 0,1 0,31.831
                                                a 15.9155,15.9155 0 0,1 0,-31.831"
                                                                fill="none"
                                                                stroke="rgba(229, 231, 235, 1)"
                                                                strokeWidth="3"
                                                            />
                                                            <path
                                                                d="m18,2.0845
                                                a 15.9155,15.9155 0 0,1 0,31.831
                                                a 15.9155,15.9155 0 0,1 0,-31.831"
                                                                fill="none"
                                                                stroke={`url(#gradient-${ticket.id})`}
                                                                strokeWidth="3"
                                                                strokeDasharray={`${ticket.progress}, 100`}
                                                                strokeLinecap="round"
                                                            />
                                                            <defs>
                                                                <linearGradient id={`gradient-${ticket.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                                                    <stop offset="0%" className={`${colorClass.split(' ')[0].replace('from-', 'text-')}`} stopColor="currentColor" />
                                                                    <stop offset="100%" className={`${colorClass.split(' ')[1].replace('to-', 'text-')}`} stopColor="currentColor" />
                                                                </linearGradient>
                                                            </defs>
                                                        </svg>
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <span className="text-sm font-bold text-gray-800">{ticket.progress}%</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs text-gray-500">Current Phase</span>
                                                            <span className="text-xs text-gray-600">{completedTasks}/{totalTasks} tasks</span>
                                                        </div>
                                                        <div className="text-sm font-medium text-gray-700">
                                                            {currentPhase ? currentPhase.name : 'All phases completed'}
                                                        </div>
                                                        <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                                                            <Calendar className="w-3 h-3" />
                                                            <span>Due: {ticket.deadline}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Phases and Tasks Section */}
                                                <div className="mt-4 pt-4 border-t border-gray-200">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {/* Phases Column */}
                                                        <div>
                                                            <div className="flex items-center justify-between mb-3">
                                                                <h4 className="font-bold text-gray-800 text-sm">Phases</h4>
                                                                <button
                                                                    onClick={() => setShowAddPhase(ticket.id)}
                                                                    className="text-xs text-purple-600 hover:text-purple-700 flex items-center space-x-1"
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {ticket.plan.phases.map((phase, phaseIndex) => {
                                                                    const isCurrentPhase = !phase.completed && !ticket.plan.phases.slice(0, phaseIndex).some(p => !p.completed);
                                                                    const phaseTasks = ticket.plan.tasks.filter(task => task.phase === phase.id);
                                                                    const completedPhaseTasks = phaseTasks.filter(task => task.completed).length;
                                                                    const isSelectedPhase = selectedPhase === `${ticket.id}-${phase.id}`;

                                                                    return (
                                                                        <div key={phase.id} className="flex items-center space-x-2 text-xs group">
                                                                            <button
                                                                                onClick={() => togglePhaseComplete(ticket.id, phase.id)}
                                                                                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                                                                    phase.completed
                                                                                        ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                                                                                        : isCurrentPhase
                                                                                            ? `bg-gradient-to-r ${getPhaseColor(phase.name, phaseIndex)} animate-pulse`
                                                                                            : 'bg-gray-300'
                                                                                }`}
                                                                            />
                                                                            {editingPhase === `${ticket.id}-${phase.id}` ? (
                                                                                <input
                                                                                    type="text"
                                                                                    value={phase.name}
                                                                                    onChange={(e) => {
                                                                                        const newName = e.target.value;
                                                                                        setTickets(prev => prev.map(t =>
                                                                                            t.id === ticket.id
                                                                                                ? { ...t, plan: { ...t.plan, phases: t.plan.phases.map(p => p.id === phase.id ? { ...p, name: newName } : p) } }
                                                                                                : t
                                                                                        ));
                                                                                    }}
                                                                                    onBlur={() => {
                                                                                        updatePhaseName(ticket.id, phase.id, phase.name);
                                                                                        setEditingPhase(null);
                                                                                    }}
                                                                                    onKeyPress={(e) => e.key === 'Enter' && setEditingPhase(null)}
                                                                                    className="text-xs border-b border-purple-300 focus:outline-none bg-transparent flex-1"
                                                                                    autoFocus
                                                                                />
                                                                            ) : (
                                                                                <span
                                                                                    className={`cursor-pointer hover:text-purple-600 transition-colors flex-1 ${
                                                                                        phase.completed ? 'line-through text-gray-500' :
                                                                                            isCurrentPhase ? 'text-purple-600 font-semibold' :
                                                                                                isSelectedPhase ? 'text-purple-600 font-semibold' : 'text-gray-700'
                                                                                    }`}
                                                                                    onClick={() => {
                                                                                        const phaseKey = `${ticket.id}-${phase.id}`;
                                                                                        setSelectedPhase(selectedPhase === phaseKey ? null : phaseKey);
                                                                                    }}
                                                                                    onDoubleClick={() => setEditingPhase(`${ticket.id}-${phase.id}`)}
                                                                                    title="Click to view tasks • Double-click to edit"
                                                                                >
                                                                                    {phase.name}
                                                                                    {isCurrentPhase && <span className="ml-1 text-xs">•</span>}
                                                                                    <span className="ml-1 text-gray-400">({completedPhaseTasks}/{phaseTasks.length})</span>
                                                                                </span>
                                                                            )}
                                                                            <NoteIcon
                                                                                hasNote={hasNote('phase', phase.id)}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleNoteClick('phase', phase.id, ticket.id);
                                                                                }}
                                                                                className="opacity-0 group-hover:opacity-100"
                                                                            />
                                                                            <button
                                                                                onClick={() => removePhase(ticket.id, phase.id)}
                                                                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
                                                                                title="Remove phase"
                                                                            >
                                                                                <X className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}

                                                                {/* Add Phase Form */}
                                                                {showAddPhase === ticket.id && (
                                                                    <div className="flex items-center space-x-1 mt-2">
                                                                        <input
                                                                            type="text"
                                                                            value={newPhaseName}
                                                                            onChange={(e) => setNewPhaseName(e.target.value)}
                                                                            placeholder="Phase name..."
                                                                            className="text-xs border border-purple-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400 flex-1"
                                                                            onKeyPress={(e) => e.key === 'Enter' && addPhaseToTicket(ticket.id)}
                                                                            autoFocus
                                                                        />
                                                                        <button
                                                                            onClick={() => addPhaseToTicket(ticket.id)}
                                                                            className="text-green-600 hover:text-green-700"
                                                                        >
                                                                            <CheckCircle className="w-3 h-3" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setShowAddPhase(null);
                                                                                setNewPhaseName('');
                                                                            }}
                                                                            className="text-gray-400 hover:text-gray-600"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Tasks Column */}
                                                        <div>
                                                            <div className="flex items-center justify-between mb-3">
                                                                <h4 className="font-bold text-gray-800 text-sm">
                                                                    {selectedPhase && selectedPhase.startsWith(`${ticket.id}-`) ?
                                                                        ticket.plan.phases.find(p => p.id === parseInt(selectedPhase.split('-')[1]))?.name + ' Tasks' :
                                                                        'Current Tasks'
                                                                    }
                                                                </h4>
                                                                <button
                                                                    onClick={() => {
                                                                        const phaseId = selectedPhase ? parseInt(selectedPhase.split('-')[1]) :
                                                                            ticket.plan.phases.find(p => !p.completed)?.id || ticket.plan.phases[0]?.id;
                                                                        setShowAddTask(`${ticket.id}-${phaseId}`);
                                                                    }}
                                                                    className="text-xs text-purple-600 hover:text-purple-700 flex items-center space-x-1"
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                            <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                                                                {(() => {
                                                                    let tasksToShow = (selectedPhase && selectedPhase.startsWith(`${ticket.id}-`)) ?
                                                                        getTasksByPhase(ticket, parseInt(selectedPhase.split('-')[1])) :
                                                                        getRelevantTasks(ticket);

                                                                    return tasksToShow.length > 0 ? tasksToShow.slice(0, 5).map(task => (
                                                                        <div key={task.id} className="flex items-center space-x-2 group">
                                                                            <button
                                                                                onClick={() => toggleTaskComplete(ticket.id, task.id)}
                                                                                className={`w-3 h-3 rounded border flex items-center justify-center transition-all ${
                                                                                    task.completed
                                                                                        ? 'bg-gradient-to-r from-green-400 to-emerald-500 border-green-400'
                                                                                        : 'border-gray-300 hover:border-purple-400'
                                                                                }`}
                                                                            >
                                                                                {task.completed && <CheckCircle className="w-2 h-2 text-white" />}
                                                                            </button>
                                                                            {editingTask === `${ticket.id}-${task.id}` ? (
                                                                                <input
                                                                                    type="text"
                                                                                    value={task.title}
                                                                                    onChange={(e) => {
                                                                                        setTickets(prev => prev.map(t =>
                                                                                            t.id === ticket.id
                                                                                                ? { ...t, plan: { ...t.plan, tasks: t.plan.tasks.map(tsk => tsk.id === task.id ? { ...tsk, title: e.target.value } : tsk) } }
                                                                                                : t
                                                                                        ));
                                                                                    }}
                                                                                    onBlur={() => setEditingTask(null)}
                                                                                    onKeyPress={(e) => e.key === 'Enter' && setEditingTask(null)}
                                                                                    className="text-xs border-b border-purple-300 focus:outline-none bg-transparent flex-1"
                                                                                    autoFocus
                                                                                />
                                                                            ) : (
                                                                                <span
                                                                                    className={`text-xs cursor-pointer hover:text-purple-600 flex-1 truncate ${
                                                                                        task.completed ? 'line-through text-gray-500' : 'text-gray-700'
                                                                                    }`}
                                                                                    onDoubleClick={() => setEditingTask(`${ticket.id}-${task.id}`)}
                                                                                    title={`${task.title} - Due: ${task.deadline} • Double-click to edit`}
                                                                                >
            {task.title}
        </span>
                                                                            )}
                                                                            {editingTask === `${ticket.id}-${task.id}-deadline` ? (
                                                                                <input
                                                                                    type="date"
                                                                                    value={task.deadline}
                                                                                    onChange={(e) => {
                                                                                        const newDeadline = e.target.value;
                                                                                        updateTaskDeadline(ticket.id, task.id, newDeadline);
                                                                                    }}
                                                                                    onBlur={() => setEditingTask(null)}
                                                                                    className="text-xs border-b border-purple-300 focus:outline-none bg-transparent"
                                                                                />
                                                                            ) : (
                                                                                <span
                                                                                    className="text-xs text-gray-400 cursor-pointer hover:text-purple-600"
                                                                                    onDoubleClick={() => setEditingTask(`${ticket.id}-${task.id}-deadline`)}
                                                                                    title="Double-click to edit deadline"
                                                                                >
            {task.deadline}
        </span>
                                                                            )}
                                                                            <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1">
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const phase = ticket.plan.phases.find(p => p.id === task.phase);
                                                                                        getTaskGuidance(task, ticket, phase);
                                                                                    }}
                                                                                    className="text-purple-600 hover:text-purple-700 bg-purple-100 hover:bg-purple-200 px-2 py-1 rounded text-xs font-medium transition-all duration-200"
                                                                                    title="Get AI guidance for this task"
                                                                                >
                                                                                <span className="flex items-center space-x-1">
                                                                                    <Brain className="w-3 h-3" />
                                                                                    <span>Guide Me</span>
                                                                                </span>
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => removeTask(ticket.id, task.id)}
                                                                                    className="text-red-400 hover:text-red-600"
                                                                                >
                                                                                    <X className="w-3 h-3" />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )) : (
                                                                        <div className="text-xs text-gray-500 italic">
                                                                            {selectedPhase ? 'No tasks in this phase' : 'No active tasks'}
                                                                        </div>
                                                                    );
                                                                })()}

                                                                {/* Add Task Form */}
                                                                {showAddTask && showAddTask.startsWith(`${ticket.id}-`) && (
                                                                    <div className="flex items-center space-x-1 mt-2">
                                                                        <input
                                                                            type="text"
                                                                            value={newTaskTitle}
                                                                            onChange={(e) => setNewTaskTitle(e.target.value)}
                                                                            placeholder="Task..."
                                                                            className="text-xs border border-purple-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400 flex-1"
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
                                                                        >
                                                                            <CheckCircle className="w-3 h-3" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setShowAddTask(null);
                                                                                setNewTaskTitle('');
                                                                            }}
                                                                            className="text-gray-400 hover:text-gray-600"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/*/!* Quick Actions Bar *!/*/}
                                                {/*<div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">*/}
                                                {/*    <button*/}
                                                {/*        onClick={() => {*/}
                                                {/*            const phaseKey = currentPhase ? `${ticket.id}-${currentPhase.id}` : null;*/}
                                                {/*            setSelectedPhase(phaseKey);*/}
                                                {/*        }}*/}
                                                {/*        className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center space-x-1"*/}
                                                {/*    >*/}
                                                {/*        <Target className="w-3 h-3" />*/}
                                                {/*        <span>View Tasks</span>*/}
                                                {/*    </button>*/}
                                                {/*    <div className="flex items-center space-x-3 text-xs text-gray-500">*/}
                                                {/*        <span className={`flex items-center space-x-1 ${ticket.status === 'completed' ? 'text-green-600' : ticket.status === 'in-progress' ? 'text-blue-600' : 'text-gray-600'}`}>*/}
                                                {/*            <div className={`w-2 h-2 rounded-full ${ticket.status === 'completed' ? 'bg-green-500' : ticket.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-400'}`}></div>*/}
                                                {/*            <span>{ticket.status}</span>*/}
                                                {/*        </span>*/}
                                                {/*    </div>*/}
                                                {/*</div>*/}
                                            </div>
                                        );
                                    })}

                                    {tickets.length === 0 && (
                                        <div className="text-center py-12">
                                            <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                                                <Brain className="w-12 h-12 text-white animate-pulse" />
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-700 mb-2">No projects yet</h3>
                                            <p className="text-gray-500 text-sm">Create your first research project to get started!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Today's Focus */}
                        <div className="col-span-1 lg:col-span-3 space-y-6 overflow-y-auto custom-scrollbar mt-6 lg:mt-0">
                            {/* Today's Focus Header */}
                            <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-6 shadow-xl border border-white/30">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                        Today's Focus
                                    </h2>
                                    <div className="text-sm text-gray-600 bg-white/50 px-4 py-2 rounded-xl">
                                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </div>
                                </div>

                                {/* Today's Progress Summary */}
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                            <span className="text-xs font-medium text-green-800">Completed Today</span>
                                        </div>
                                        <div className="text-2xl font-bold text-green-700">
                                            {tickets.flatMap(t => t.plan.tasks).filter(task => task.completed).length}
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <Clock className="w-4 h-4 text-blue-600" />
                                            <span className="text-xs font-medium text-blue-800">Time Tracked</span>
                                        </div>
                                        <div className="text-2xl font-bold text-blue-700">
                                            {formatTime(getTotalTimeSpent())}
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <Flame className="w-4 h-4 text-purple-600" />
                                            <span className="text-xs font-medium text-purple-800">Daily Streak</span>
                                        </div>
                                        <div className="text-2xl font-bold text-purple-700">
                                            3 days
                                        </div>
                                    </div>
                                </div>
                                {/* Today's Tasks */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-orange-600 mb-3 flex items-center">
                                        <Calendar className="w-4 h-4 mr-2" />
                                        Due Today
                                    </h3>

                                    {(() => {
                                        const todayTasks = tickets.flatMap(ticket =>
                                            ticket.plan.tasks
                                                .filter(task => !task.completed && task.deadline === new Date().toISOString().split('T')[0])
                                                .map(task => ({ ...task, ticketId: ticket.id, projectName: ticket.title, ticketPriority: ticket.priority }))
                                        );

                                        return todayTasks.length > 0 ? (
                                            <div className="space-y-2">
                                                {todayTasks.map(task => (
                                                    <TaskItem key={`${task.ticketId}-${task.id}`} task={task} />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <div className="bg-gradient-to-r from-green-400 to-emerald-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xl">
                                                    <CheckCircle className="w-8 h-8 text-white" />
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-700 mb-1">No tasks due today!</h3>
                                                <p className="text-gray-500 text-sm">Check your calendar for upcoming tasks</p>
                                            </div>
                                        );
                                    })()}
                                </div>

                            </div>

                            {/* Time Tracking Summary */}
                            {activeTimer && (
                                <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-3xl p-6 shadow-xl border border-green-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-bold text-green-800 text-lg">Currently Tracking</h3>
                                            <p className="text-green-600">
                                                {(() => {
                                                    const ticket = tickets.find(t => t.id === activeTimer.ticketId);
                                                    const task = ticket?.plan.tasks.find(task => task.id === activeTimer.taskId);
                                                    return task?.title || 'Unknown task';
                                                })()}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-3xl font-bold text-green-700">
                                                {formatTime(Math.floor((Date.now() - activeTimer.startTime) / 1000))}
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
                        </div>
                    </div>
                )}

                {currentView === 'calendar' && (
                    <div className="space-y-8">
                        <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 shadow-xl border border-white/30">
                            <div className="space-y-4 mb-8">
                                <div className="flex items-center justify-between">
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

                                {/* Project Filter */}
                                <div className="flex items-center space-x-3">
                                    <span className="text-sm font-medium text-gray-600">Filter by project:</span>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setCalendarProjectFilter('all')}
                                            className={`px-4 py-2 text-sm rounded-xl font-medium transition-all duration-300 ${
                                                calendarProjectFilter === 'all'
                                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                                    : 'bg-white/50 text-gray-600 hover:bg-white/70 border border-gray-300'
                                            }`}
                                        >
                                            All Projects
                                        </button>
                                        {tickets.map((ticket, index) => {
                                            const projectColor = getProjectColor(index);
                                            return (
                                                <button
                                                    key={ticket.id}
                                                    onClick={() => setCalendarProjectFilter(ticket.id.toString())}
                                                    className={`px-4 py-2 text-sm rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 ${
                                                        calendarProjectFilter === ticket.id.toString()
                                                            ? `bg-gradient-to-r ${projectColor.bg} text-white shadow-lg`
                                                            : 'bg-white/50 text-gray-600 hover:bg-white/70 border border-gray-300'
                                                    }`}
                                                >
                                                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${projectColor.bg}`}></div>
                                                    <span>{ticket.title}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-2 mb-4">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="p-4 text-center text-sm font-bold text-gray-600 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-1 md:gap-2 calendar-grid">
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
                                                                        : `bg-gradient-to-r ${dateTask.projectColor.bg} text-white shadow-lg`
                                                                }`}
                                                                title={`${dateTask.projectName}: ${dateTask.title}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleTaskComplete(dateTask.ticketId, dateTask.id);
                                                                }}
                                                            >
                                                                <div className="flex items-center space-x-1">
                                                                    <div className="w-2 h-2 bg-white/30 rounded-full flex-shrink-0"></div>
                                                                    <span className="truncate">{dateTask.title}</span>
                                                                </div>
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

                {/*{currentView === 'projects' && (*/}
                {/*    <div className="space-y-8">*/}
                {/*        /!* Enhanced Gantt Chart *!/*/}
                {/*        <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 shadow-xl border border-white/30">*/}
                {/*            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-8">*/}
                {/*                Project Timeline (Gantt Chart)*/}
                {/*            </h3>*/}
                {/*            {tickets.length > 0 ? (*/}
                {/*                <div className="overflow-x-auto">*/}
                {/*                    <div className="min-w-full">*/}
                {/*                        {tickets.map(ticket => {*/}
                {/*                            const startDate = new Date(ticket.created);*/}
                {/*                            const endDate = new Date(ticket.deadline);*/}
                {/*                            // const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));*/}

                {/*                            return (*/}
                {/*                                <div key={ticket.id} className="flex items-center mb-6 group">*/}
                {/*                                    <div className="w-64 flex-shrink-0 pr-6">*/}
                {/*                                        <h4 className="font-bold text-gray-800 text-lg mb-2">{ticket.title}</h4>*/}
                {/*                                        <div className="flex items-center space-x-2">*/}
                {/*                                            <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${getPriorityColor(ticket.priority)} shadow-lg`}></div>*/}
                {/*                                            <p className="text-sm text-gray-600">{ticket.progress}% complete</p>*/}
                {/*                                        </div>*/}
                {/*                                    </div>*/}
                {/*                                    <div className="flex-1 relative h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden">*/}
                {/*                                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300">*/}
                {/*                                            <LiquidProgressBar*/}
                {/*                                                progress={ticket.progress}*/}
                {/*                                                className="h-full rounded-xl"*/}
                {/*                                                colors="from-purple-600 via-pink-600 to-purple-700"*/}
                {/*                                            />*/}
                {/*                                        </div>*/}
                {/*                                        <div className="absolute inset-0 flex items-center justify-center">*/}
                {/*                                            <span className="text-sm text-white font-bold bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">*/}
                {/*                                                {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}*/}
                {/*                                            </span>*/}
                {/*                                        </div>*/}
                {/*                                        /!* Deadline indicator *!/*/}
                {/*                                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">*/}
                {/*                                            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce shadow-lg"></div>*/}
                {/*                                        </div>*/}
                {/*                                    </div>*/}
                {/*                                </div>*/}
                {/*                            );*/}
                {/*                        })}*/}
                {/*                    </div>*/}
                {/*                </div>*/}
                {/*            ) : (*/}
                {/*                <div className="text-center py-12 text-gray-500">*/}
                {/*                    <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />*/}
                {/*                    <p className="text-lg">No projects to display in timeline</p>*/}
                {/*                </div>*/}
                {/*            )}*/}
                {/*        </div>*/}

                {/*        /!* Enhanced Project Cards *!/*/}
                {/*        <div className="grid md:grid-cols-2 gap-8">*/}
                {/*            {tickets.map(ticket => (*/}
                {/*                <div key={ticket.id} className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 border border-white/30 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 group">*/}
                {/*                    <div className="flex items-center justify-between mb-6">*/}
                {/*                        <h3 className="text-2xl font-bold text-gray-800">{ticket.title}</h3>*/}
                {/*                        <div className="flex items-center space-x-3">*/}
                {/*                            <span className="text-sm text-gray-600 bg-white/50 px-3 py-1 rounded-xl">*/}
                {/*                                Due: {ticket.deadline}*/}
                {/*                            </span>*/}
                {/*                            {getPriorityIcon(ticket.priority)}*/}
                {/*                        </div>*/}
                {/*                    </div>*/}

                {/*                    /!* Radial Progress *!/*/}
                {/*                    <div className="flex items-center justify-center mb-6">*/}
                {/*                        <div className="relative w-32 h-32">*/}
                {/*                            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">*/}
                {/*                                <path*/}
                {/*                                    d="m18,2.0845*/}
                {/*                                    a 15.9155,15.9155 0 0,1 0,31.831*/}
                {/*                                    a 15.9155,15.9155 0 0,1 0,-31.831"*/}
                {/*                                    fill="none"*/}
                {/*                                    stroke="rgba(156, 163, 175, 0.3)"*/}
                {/*                                    strokeWidth="3"*/}
                {/*                                />*/}
                {/*                                <path*/}
                {/*                                    d="m18,2.0845*/}
                {/*                                    a 15.9155,15.9155 0 0,1 0,31.831*/}
                {/*                                    a 15.9155,15.9155 0 0,1 0,-31.831"*/}
                {/*                                    fill="none"*/}
                {/*                                    stroke="url(#gradient)"*/}
                {/*                                    strokeWidth="3"*/}
                {/*                                    strokeDasharray={`${ticket.progress}, 100`}*/}
                {/*                                    strokeDashoffset="0"*/}
                {/*                                    strokeLinecap="round"*/}
                {/*                                    className="transition-all duration-1000 ease-out"*/}
                {/*                                />*/}
                {/*                                <defs>*/}
                {/*                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">*/}
                {/*                                        <stop offset="0%" stopColor="#8b5cf6" />*/}
                {/*                                        <stop offset="100%" stopColor="#ec4899" />*/}
                {/*                                    </linearGradient>*/}
                {/*                                </defs>*/}
                {/*                            </svg>*/}
                {/*                            <div className="absolute inset-0 flex items-center justify-center">*/}
                {/*                                <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">*/}
                {/*                                    {ticket.progress}%*/}
                {/*                                </span>*/}
                {/*                            </div>*/}
                {/*                        </div>*/}
                {/*                    </div>*/}

                {/*                    /!* Phase Progress *!/*/}
                {/*                    <div className="space-y-4">*/}
                {/*                        {ticket.plan.phases.slice(0, 3).map((phase, index) => {*/}
                {/*                            const isCurrentPhase = !phase.completed && !ticket.plan.phases.slice(0, index).some(p => !p.completed);*/}
                {/*                            return (*/}
                {/*                                <div key={phase.id} className="flex items-center space-x-4">*/}
                {/*                                    <div className={`w-4 h-4 rounded-full transition-all duration-300 shadow-lg ${*/}
                {/*                                        phase.completed*/}
                {/*                                            ? 'bg-gradient-to-r from-green-400 to-emerald-500'*/}
                {/*                                            : isCurrentPhase*/}
                {/*                                                ? `bg-gradient-to-r ${getPhaseColor(phase.name, index)} animate-pulse`*/}
                {/*                                                : 'bg-gray-400'*/}
                {/*                                    }`}></div>*/}
                {/*                                    <div className="flex-1">*/}
                {/*                                        <span className={`text-sm font-medium ${*/}
                {/*                                            phase.completed*/}
                {/*                                                ? 'line-through text-gray-500'*/}
                {/*                                                : isCurrentPhase*/}
                {/*                                                    ? 'text-purple-600 font-bold'*/}
                {/*                                                    : 'text-gray-700'*/}
                {/*                                        }`}>*/}
                {/*                                            {phase.name}*/}
                {/*                                            {isCurrentPhase && <span className="ml-2 text-xs animate-bounce">← Active</span>}*/}
                {/*                                        </span>*/}
                {/*                                        <div className="mt-1">*/}
                {/*                                            <LiquidProgressBar*/}
                {/*                                                progress={phase.completed ? 100 : (isCurrentPhase ? 50 : 0)}*/}
                {/*                                                className="h-1"*/}
                {/*                                                colors={getPhaseColor(phase.name, index)}*/}
                {/*                                            />*/}
                {/*                                        </div>*/}
                {/*                                    </div>*/}
                {/*                                </div>*/}
                {/*                            );*/}
                {/*                        })}*/}
                {/*                    </div>*/}
                {/*                </div>*/}
                {/*            ))}*/}
                {/*        </div>*/}
                {/*    </div>*/}
                {/*)}*/}

                {currentView === 'analytics' && (
                    <div className="space-y-8">
                        {/* Enhanced Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
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
                        {/* Gantt Chart - Moved from Projects */}
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

                        {/* Deadline Risk Analysis */}
                        <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 shadow-xl border border-white/30 mb-8">
                            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-8">
                                Deadline Risk Analysis
                            </h3>

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                {tickets.map(ticket => {
                                    const risk = riskAnalysis[ticket.id] || calculateDeadlineRisk(ticket);
                                    const riskColors = {
                                        low: 'from-green-500 to-emerald-600',
                                        medium: 'from-yellow-500 to-orange-600',
                                        high: 'from-red-500 to-pink-600'
                                    };

                                    return (
                                        <div
                                            key={ticket.id}
                                            className={`bg-gradient-to-br from-white/80 to-gray-50/80 backdrop-blur-sm rounded-2xl p-6 border-2 hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 cursor-pointer ${
                                                selectedRiskProject === ticket.id ? 'ring-4 ring-purple-400' : 'border-white/50'
                                            }`}
                                            onClick={() => setSelectedRiskProject(selectedRiskProject === ticket.id ? null : ticket.id)}
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-gray-800 text-lg mb-1">{ticket.title}</h4>
                                                    <p className="text-sm text-gray-600">Due: {ticket.deadline}</p>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${riskColors[risk.level]} shadow-lg`}>
                                                    {risk.score}% Risk
                                                </div>
                                            </div>

                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Days Remaining:</span>
                                                    <span className={`font-medium ${risk.daysRemaining < 7 ? 'text-red-600' : 'text-gray-800'}`}>
                                {Math.round(risk.daysRemaining)}
                            </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Progress Gap:</span>
                                                    <span className={`font-medium ${risk.progressDiscrepancy > 20 ? 'text-orange-600' : 'text-gray-800'}`}>
                                {risk.progressDiscrepancy > 0 ? `-${risk.progressDiscrepancy}%` : `+${Math.abs(risk.progressDiscrepancy)}%`}
                            </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Open Tasks:</span>
                                                    <span className="font-medium text-gray-800">{risk.incompleteTasks}</span>
                                                </div>
                                                {risk.phaseSlippage > 0 && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Overdue Phases:</span>
                                                        <span className="font-medium text-red-600">{risk.phaseSlippage}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Mini progress bar */}
                                            <div className="mt-4">
                                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full bg-gradient-to-r ${riskColors[risk.level]} transition-all duration-500`}
                                                        style={{ width: `${ticket.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* What-If Analysis */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
                                <h4 className="font-bold text-blue-800 text-lg mb-4">What-If Analysis</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm text-blue-700 mb-2 block">
                                            If I work <span className="font-bold text-lg">{whatIfHours}</span> extra hours per day:
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="8"
                                            step="0.5"
                                            value={whatIfHours}
                                            onChange={(e) => setWhatIfHours(parseFloat(e.target.value))}
                                            className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="flex justify-between text-xs text-blue-600 mt-1">
                                            <span>0h</span>
                                            <span>2h</span>
                                            <span>4h</span>
                                            <span>6h</span>
                                            <span>8h</span>
                                        </div>
                                    </div>

                                    {selectedRiskProject && (() => {
                                        const ticket = tickets.find(t => t.id === selectedRiskProject);
                                        const risk = riskAnalysis[selectedRiskProject];

                                        // Calculate based on actual productivity data
                                        const metrics = calculateProductivityMetrics();
                                        const avgTasksPerHour = metrics.totalTimeSeconds > 0
                                            ? (tickets.flatMap(t => t.plan.tasks.filter(task => task.completed)).length / (metrics.totalTimeSeconds / 3600))
                                            : 0.5;

                                        // Use actual completion rate or fallback
                                        const actualTasksPerHour = avgTasksPerHour || 0.5;
                                        const extraTasksCompleted = whatIfHours * risk.daysRemaining * actualTasksPerHour;
                                        const newProgress = Math.min(100, ticket.progress + (extraTasksCompleted / ticket.plan.tasks.length * 100));

                                        // More accurate risk reduction based on progress improvement
                                        const progressImprovement = newProgress - ticket.progress;
                                        const riskReduction = progressImprovement * 0.8; // 80% of progress improvement reduces risk
                                        const improvedRisk = Math.max(0, risk.score - riskReduction);

                                        return (
                                            <div className="bg-white/70 rounded-xl p-4">
                                                <p className="text-sm text-gray-700 mb-2">
                                                    Impact on <span className="font-bold">{ticket.title}</span>:
                                                </p>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-gray-600">Current Risk:</span>
                                                        <span className="font-bold text-red-600 ml-2">{risk.score}%</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600">New Risk:</span>
                                                        <span className="font-bold text-green-600 ml-2">{Math.round(improvedRisk)}%</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600">Progress Gain:</span>
                                                        <span className="font-bold text-blue-600 ml-2">+{Math.round(newProgress - ticket.progress)}%</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600">Tasks Completed:</span>
                                                        <span className="font-bold text-purple-600 ml-2">~{Math.round(extraTasksCompleted)}</span>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    Based on your avg: {actualTasksPerHour.toFixed(1)} tasks/hour
                                                </p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Time Analytics */}
                        <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 shadow-xl border border-white/30">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                    Time Analytics
                                </h3>
                                <button
                                    onClick={loadTimeAnalytics}
                                    className="text-sm text-purple-600 hover:text-purple-700 flex items-center space-x-1"
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    <span>Refresh Data</span>
                                </button>
                            </div>

                            {(() => {
                                const metrics = calculateProductivityMetrics();

                                return (
                                    <div className="space-y-8">
                                        {/* Focus Ratio */}
                                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6">
                                            <h4 className="font-bold text-purple-800 text-lg mb-4">Focus Ratio</h4>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-4xl font-bold text-purple-700">{metrics.focusRatio}%</div>
                                                    <p className="text-sm text-purple-600 mt-1">Time on high-priority tasks</p>
                                                </div>
                                                <div className="w-32 h-32 relative">
                                                    <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                                                        <path
                                                            d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                                                            fill="none"
                                                            stroke="rgba(229, 231, 235, 1)"
                                                            strokeWidth="3"
                                                        />
                                                        <path
                                                            d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                                                            fill="none"
                                                            stroke="url(#focus-gradient)"
                                                            strokeWidth="3"
                                                            strokeDasharray={`${metrics.focusRatio}, 100`}
                                                            strokeLinecap="round"
                                                        />
                                                        <defs>
                                                            <linearGradient id="focus-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                                <stop offset="0%" stopColor="#a855f7" />
                                                                <stop offset="100%" stopColor="#ec4899" />
                                                            </linearGradient>
                                                        </defs>
                                                    </svg>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Flame className="w-8 h-8 text-purple-600" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Time by Project (Pie Chart Alternative) */}
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-lg mb-4">Time Distribution by Project</h4>
                                            <div className="space-y-3">
                                                {Object.entries(metrics.timeByProject).map(([projectName, data], index) => {
                                                    const percentage = metrics.totalTimeSeconds > 0
                                                        ? (data.seconds / metrics.totalTimeSeconds * 100).toFixed(1)
                                                        : 0;
                                                    const projectColor = getProjectColor(index);

                                                    return (
                                                        <div key={projectName} className="flex items-center space-x-4">
                                                            <div className="flex-1">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-sm font-medium text-gray-700">{projectName}</span>
                                                                    <span className="text-sm text-gray-600">
                                                {formatTime(data.seconds)} ({percentage}%)
                                            </span>
                                                                </div>
                                                                <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full bg-gradient-to-r ${projectColor.bg} transition-all duration-1000 ease-out`}
                                                                        style={{ width: `${percentage}%` }}
                                                                    >
                                                                        <div className="h-full bg-gradient-to-r from-white/20 to-transparent" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {Object.keys(metrics.timeByProject).length === 0 && (
                                                    <p className="text-gray-500 text-center py-4">No time tracked yet</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Daily Intensity Chart */}
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-lg mb-4">Daily Activity (Last 7 Days)</h4>
                                            <div className="flex items-end justify-between h-40 space-x-2">
                                                {metrics.dailyIntensity.map((day, index) => {
                                                    const maxHours = Math.max(...metrics.dailyIntensity.map(d => d.hours), 0.5);
                                                    const heightPercent = maxHours > 0 ? (day.hours / maxHours) * 100 : 0;
                                                    const isToday = day.date === new Date().toISOString().split('T')[0];

                                                    return (
                                                        <div key={day.date} className="flex-1 flex flex-col items-center">
                                                            <div className="relative w-full flex items-end justify-center h-32">
                                                                <div
                                                                    className={`w-full rounded-t-lg transition-all duration-1000 ease-out cursor-pointer ${
                                                                        day.hours === 0
                                                                            ? 'bg-gray-300'
                                                                            : isToday
                                                                                ? 'bg-gradient-to-t from-purple-500 to-pink-400 animate-pulse'
                                                                                : 'bg-gradient-to-t from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500'
                                                                    }`}
                                                                    style={{ height: `${Math.max(heightPercent, 2)}%` }}
                                                                    title={`${day.hours.toFixed(1)} hours`}
                                                                >
                                                                    {day.hours > 0 && (
                                                                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-600">
                                                                            {day.hours.toFixed(1)}h
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <span className={`text-xs mt-2 ${isToday ? 'text-purple-600 font-bold' : 'text-gray-600'}`}>
                        {day.day}
                    </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Summary Stats */}
                                            <div className="grid grid-cols-3 gap-4 mt-6">
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-blue-600">{metrics.avgDailyHours}h</div>
                                                    <div className="text-xs text-gray-600">Avg Daily</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-green-600">
                                                        {formatTime(metrics.totalTimeSeconds)}
                                                    </div>
                                                    <div className="text-xs text-gray-600">Total (7 days)</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-purple-600">
                                                        {metrics.dailyIntensity.filter(d => d.hours > 0).length}
                                                    </div>
                                                    <div className="text-xs text-gray-600">Active Days</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Phase Productivity Analysis */}
                                        {metrics.phaseProductivity.length > 0 && (
                                            <div>
                                                <h4 className="font-bold text-gray-800 text-lg mb-4">Most Time-Consuming Phases</h4>
                                                <div className="space-y-2">
                                                    {metrics.phaseProductivity.map(([phaseName, data]) => (
                                                        <div key={phaseName} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                                            <span className="text-sm font-medium text-gray-700">{phaseName}</span>
                                                            <div className="flex items-center space-x-3">
                                                                <span className="text-sm text-gray-600">{formatTime(data.seconds)}</span>
                                                                <span className={`text-xs px-2 py-1 rounded-full ${
                                                                    data.priority === 'High'
                                                                        ? 'bg-red-100 text-red-700'
                                                                        : data.priority === 'Medium'
                                                                            ? 'bg-yellow-100 text-yellow-700'
                                                                            : 'bg-green-100 text-green-700'
                                                                }`}>
                                                                    {data.priority}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
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
                                        value={formatDateForInput(editingTicket.deadline)}
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
                    <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-white/30">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowAddTaskToDate(false);
                                    setSelectedDate(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 transform hover:scale-110 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tasks for Selected Date */}
                        <div className="space-y-6">
                            {(() => {
                                const tasksForSelectedDate = getTasksForDate(selectedDate);
                                const groupedTasks = {};

                                // Group tasks by project
                                tasksForSelectedDate.forEach(task => {
                                    if (!groupedTasks[task.projectName]) {
                                        groupedTasks[task.projectName] = {
                                            tasks: [],
                                            ticketId: task.ticketId,
                                            projectColor: task.projectColor
                                        };
                                    }
                                    groupedTasks[task.projectName].tasks.push(task);
                                });

                                return Object.keys(groupedTasks).length > 0 ? (
                                    Object.entries(groupedTasks).map(([projectName, data]) => (
                                        <div key={data.ticketId} className="space-y-3">
                                            <div className="flex items-center space-x-2">
                                                <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${data.projectColor.bg}`}></div>
                                                <h4 className="font-bold text-gray-800">{projectName}</h4>
                                            </div>
                                            <div className="space-y-2 ml-6">
                                                {data.tasks.map(task => (
                                                    <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                                        <div className="flex items-center space-x-3">
                                                            <button
                                                                onClick={() => toggleTaskComplete(task.ticketId, task.id)}
                                                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-300 ${
                                                                    task.completed
                                                                        ? 'bg-gradient-to-r from-green-400 to-emerald-500 border-green-400'
                                                                        : 'border-gray-300 hover:border-purple-400'
                                                                }`}
                                                            >
                                                                {task.completed && <CheckCircle className="w-3 h-3 text-white" />}
                                                            </button>
                                                            <span className={`${task.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                                                    {task.title}
                                                </span>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            {!activeTimer || (activeTimer.taskId !== task.id || activeTimer.ticketId !== task.ticketId) ? (
                                                                <button
                                                                    onClick={() => startTimer(task.id, task.ticketId)}
                                                                    className="text-gray-400 hover:text-green-600 transition-colors"
                                                                >
                                                                    <Clock className="w-4 h-4" />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={stopTimer}
                                                                    className="text-green-600 hover:text-red-600 transition-colors"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No tasks scheduled for this date</p>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Add New Task */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h4 className="font-medium text-gray-700 mb-3">Add task for this date</h4>
                            <div className="flex space-x-3">
                                <select
                                    className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    value=""
                                    onChange={(e) => {
                                        const ticketId = parseInt(e.target.value);
                                        if (ticketId) {
                                            const ticket = tickets.find(t => t.id === ticketId);
                                            const currentPhase = ticket.plan.phases.find(p => !p.completed);
                                            if (currentPhase) {
                                                const newTask = {
                                                    id: Date.now(),
                                                    title: newDateTask || 'New Task',
                                                    phase: currentPhase.id,
                                                    completed: false,
                                                    deadline: selectedDate.toISOString().split('T')[0]
                                                };

                                                setTickets(prev => prev.map(t =>
                                                    t.id === ticketId
                                                        ? { ...t, plan: { ...t.plan, tasks: [...t.plan.tasks, newTask] } }
                                                        : t
                                                ));

                                                setNewDateTask('');
                                                addNotification('Task added successfully', 'success');
                                            }
                                        }
                                    }}
                                >
                                    <option value="">Select project...</option>
                                    {tickets.map(ticket => (
                                        <option key={ticket.id} value={ticket.id}>{ticket.title}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    value={newDateTask}
                                    onChange={(e) => setNewDateTask(e.target.value)}
                                    placeholder="Task description..."
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Chat Widget */}
            <div className="fixed bottom-6 right-6 z-50">
                {showChat && (
                    <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/50 w-96 h-96 mb-4 flex flex-col animate-slide-up chat-widget">
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
            {/* Note Editor */}
            {editingNote && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-2xl">
                        <NoteEditor
                            note={(() => {
                                // Safety check: ensure tickets exists and is an array
                                if (!tickets || !Array.isArray(tickets)) {
                                    return null;
                                }

                                if (editingNote.type === 'task') {
                                    const task = tickets
                                        .filter(t => t && t.tasks && Array.isArray(t.tasks))
                                        .flatMap(t => t.tasks)
                                        .find(task => task && task.id === editingNote.id);
                                    return task?.note || null;
                                } else if (editingNote.type === 'phase') {
                                    const phase = tickets
                                        .filter(t => t && t.plan && t.plan.phases && Array.isArray(t.plan.phases))
                                        .flatMap(t => t.plan.phases)
                                        .find(phase => phase && phase.id === editingNote.id);
                                    return phase?.note || null;
                                }
                                return null;
                            })()}
                            onSave={handleNoteSave}
                            onClose={handleNoteClose}
                            onDelete={handleNoteDelete}
                            type={editingNote.type}
                            itemId={editingNote.id}
                            ticketId={editingNote.ticketId}
                            placeholder={`Add your ${editingNote.type} notes here...`}
                        />
                    </div>
                </div>
            )}
            {/* Task Guidance Modal */}
            {/* Task Guidance Modal */}
            {showGuidanceModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-6 md:p-8 w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-white/30 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-3">
                                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-2xl shadow-lg">
                                        <Brain className="w-6 h-6 text-white" />
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                        Task Guidance
                                    </h2>
                                </div>
                                {guidanceTaskInfo && (
                                    <div className="flex flex-wrap gap-3 text-sm">
                            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
                                {guidanceTaskInfo.ticket.title}
                            </span>
                                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                                {guidanceTaskInfo.phase.name}
                            </span>
                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">
                                {guidanceTaskInfo.task.title}
                            </span>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setShowGuidanceModal(false);
                                    setTaskGuidance(null);
                                    setGuidanceTaskInfo(null);
                                    setGuidanceSections([]);
                                }}
                                className="text-gray-400 hover:text-gray-600 transform hover:scale-110 transition-all p-2"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            {loadingGuidance ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <DNALoader />
                                    <p className="text-gray-600 mt-4 animate-pulse">Generating personalized guidance...</p>
                                </div>
                            ) : guidanceSections.length > 0 ? (
                                <div className="space-y-4">
                                    {guidanceSections.map((section, index) => (
                                        <div
                                            key={index}
                                            className={`bg-gradient-to-r ${
                                                index === 0 ? 'from-purple-50 to-pink-50 border-purple-200' :
                                                    index === 1 ? 'from-green-50 to-emerald-50 border-green-200' :
                                                        index === 2 ? 'from-blue-50 to-indigo-50 border-blue-200' :
                                                            index === 3 ? 'from-yellow-50 to-orange-50 border-yellow-200' :
                                                                index === 4 ? 'from-cyan-50 to-teal-50 border-cyan-200' :
                                                                    index === 5 ? 'from-red-50 to-pink-50 border-red-200' :
                                                                        'from-gray-50 to-slate-50 border-gray-200'
                                            } border rounded-2xl overflow-hidden transition-all duration-300`}
                                        >
                                            <button
                                                onClick={() => {
                                                    setGuidanceSections(prev => prev.map((s, i) =>
                                                        i === index ? { ...s, isExpanded: !s.isExpanded } : s
                                                    ));
                                                }}
                                                className="w-full p-4 flex items-center justify-between hover:bg-white/30 transition-colors"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <span className="text-2xl">{section.emoji}</span>
                                                    <h3 className="font-bold text-gray-800 text-lg">{section.title}</h3>
                                                </div>
                                                <div className={`transform transition-transform duration-200 ${section.isExpanded ? 'rotate-180' : ''}`}>
                                                    <ChevronDown className="w-5 h-5 text-gray-500" />
                                                </div>
                                            </button>

                                            {section.isExpanded && (
                                                <div className="px-4 pb-4">
                                                    <div className="bg-white/50 rounded-xl p-4">
                                                        <div
                                                            className="guidance-section-content"
                                                            dangerouslySetInnerHTML={{ __html: section.content }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
                            <button
                                onClick={() => {
                                    const allExpanded = guidanceSections.every(s => s.isExpanded);
                                    setGuidanceSections(prev => prev.map(s => ({ ...s, isExpanded: !allExpanded })));
                                }}
                                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                            >
                                {guidanceSections.every(s => s.isExpanded) ? 'Collapse All' : 'Expand All'}
                            </button>

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => {
                                        // Copy plain text version
                                        const plainText = guidanceSections.map(section =>
                                            `## ${section.emoji} ${section.title}\n${section.rawContent}`
                                        ).join('\n\n');
                                        navigator.clipboard.writeText(plainText);
                                        addNotification('Guidance copied to clipboard!', 'success');
                                    }}
                                    disabled={!taskGuidance || loadingGuidance}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <span>Copy</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setShowGuidanceModal(false);
                                        setTaskGuidance(null);
                                        setGuidanceTaskInfo(null);
                                        setGuidanceSections([]);
                                    }}
                                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Notes Sidebar */}
            <NotesSidebar
                isOpen={showNotesSidebar}
                onClose={() => setShowNotesSidebar(false)}
                notes={notes || []}
                onNoteClick={(note) => {
                    if (note && note.task_id) {
                        handleNoteClick('task', note.task_id, note.ticket_id);
                    } else if (note && note.phase_id) {
                        handleNoteClick('phase', note.phase_id, note.ticket_id);
                    }
                    setShowNotesSidebar(false);
                }}
                onExport={handleNoteExport}
            />
            <style>{`
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
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.05);
                    border-radius: 3px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(147, 51, 234, 0.3);
                    border-radius: 3px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(147, 51, 234, 0.5);
                }
                
                .line-clamp-1 {
                    overflow: hidden;
                    display: -webkit-box;
                    -webkit-line-clamp: 1;
                    -webkit-box-orient: vertical;
                }
                  /* Mobile Responsive Styles */
              @media (max-width: 768px) {
                /* Stack grid columns on mobile */
                .md\\:grid-cols-2 {
                  grid-template-columns: 1fr !important;
                }
                
                .md\\:grid-cols-3 {
                  grid-template-columns: 1fr !important;
                }
                
                .md\\:grid-cols-4 {
                  grid-template-columns: 1fr !important;
                }
                
                /* Hide text on mobile, show only icons */
                .mobile-hide {
                  display: none !important;
                }
                
                /* Adjust modal widths */
                .max-w-2xl {
                  max-width: calc(100vw - 2rem) !important;
                }
                
                .max-w-4xl {
                  max-width: calc(100vw - 2rem) !important;
                }
                
                /* Adjust chat widget */
                .chat-widget {
                  width: calc(100vw - 2rem) !important;
                  right: 1rem !important;
                  bottom: 5rem !important;
                }
                
                /* Make calendar scrollable */
                .calendar-grid {
                  overflow-x: auto;
                  -webkit-overflow-scrolling: touch;
                }
                
                /* Adjust font sizes */
                .text-3xl {
                  font-size: 1.5rem !important;
                }
                
                .text-2xl {
                  font-size: 1.25rem !important;
                }
                
                .text-4xl {
                  font-size: 1.875rem !important;
                }
                /* Guidance content formatting */
                .guidance-content {
                    line-height: 1.8;
                }
                
                .guidance-content h1,
                .guidance-content h2,
                .guidance-content h3,
                .guidance-content h4 {
                    font-weight: bold;
                    margin-top: 1.5rem;
                    margin-bottom: 0.5rem;
                }
                
                .guidance-content ul,
                .guidance-content ol {
                    margin-left: 1.5rem;
                    margin-top: 0.5rem;
                    margin-bottom: 0.5rem;
                }
                
                .guidance-content li {
                    margin-bottom: 0.25rem;
                }
                
                .guidance-content strong {
                    font-weight: bold;
                    color: #4c1d95;
                }
                /* Guidance content formatting */
                .guidance-section-content {
                    line-height: 1.8;
                    color: #374151;
                }
                
                .guidance-section-content strong {
                    font-weight: 600;
                    color: #1f2937;
                }
                
                /* Numbered items */
                .numbered-item {
                    display: flex;
                    margin-bottom: 1rem;
                    align-items: flex-start;
                }
                
                .numbered-item::before {
                    content: attr(data-number);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 24px;
                    height: 24px;
                    background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
                    color: white;
                    border-radius: 50%;
                    font-size: 14px;
                    font-weight: bold;
                    margin-right: 12px;
                    flex-shrink: 0;
                }
                
                .numbered-item .item-title {
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 4px;
                }
                
                .numbered-item .item-desc {
                    color: #6b7280;
                    font-size: 14px;
                    margin-left: 36px;
                }
                
                /* Bullet items */
                .bullet-item {
                    position: relative;
                    padding-left: 20px;
                    margin-bottom: 8px;
                    font-size: 14px;
                    color: #4b5563;
                }
                
                .bullet-item::before {
                    content: "•";
                    position: absolute;
                    left: 0;
                    color: #a855f7;
                    font-weight: bold;
                }
                
                .bullet-item .bullet-bold {
                    font-weight: 600;
                    color: #1f2937;
                }
                
                /* Sub-items */
                .sub-item {
                    margin-left: 24px;
                    padding-left: 16px;
                    position: relative;
                    font-size: 13px;
                    color: #6b7280;
                    margin-bottom: 4px;
                }
                
                .sub-item::before {
                    content: "–";
                    position: absolute;
                    left: 0;
                    color: #9ca3af;
                }
                
                /* Fix line breaks */
                .guidance-section-content br {
                    display: block;
                    margin: 4px 0;
                }
                
                /* Responsive adjustments */
                @media (max-width: 768px) {
                    .numbered-item {
                        flex-direction: column;
                    }
                    
                    .numbered-item::before {
                        margin-bottom: 8px;
                    }
                    
                    .numbered-item .item-desc {
                        margin-left: 0;
                    }
                }
              }
            `}</style>
        </div>
    );
};

export default ResearchTodoApp;
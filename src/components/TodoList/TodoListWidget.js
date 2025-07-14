import React, { useState, useEffect } from 'react';
import { 
    CheckCircle, 
    Circle, 
    Plus, 
    Trash2, 
    Clock, 
    Brain, 
    X, 
    Target,
    Zap,
    AlertTriangle,
    FileText
} from 'lucide-react';
import apiService from '../../services/api';
import './TodoListWidget.css';

const TodoListWidget = () => {
    const [todoLists, setTodoLists] = useState([]);
    const [currentList, setCurrentList] = useState(null);
    const [showCreateList, setShowCreateList] = useState(false);
    const [optimizationData, setOptimizationData] = useState(null);
    const [loadingOptimization, setLoadingOptimization] = useState(false);
    const [showOptimizationModal, setShowOptimizationModal] = useState(false);
    const [journalEntries, setJournalEntries] = useState([]);
    const [showJournal, setShowJournal] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form states
    const [newListTitle, setNewListTitle] = useState('');
    const [newListDescription, setNewListDescription] = useState('');
    const [newListPriority, setNewListPriority] = useState('Medium');
    const [newItemContent, setNewItemContent] = useState('');
    const [newItemType, setNewItemType] = useState('bullet');
    const [newItemTime, setNewItemTime] = useState(0);
    const [journalTitle, setJournalTitle] = useState('');
    const [journalContent, setJournalContent] = useState('');

    useEffect(() => {
        loadTodoLists();
        loadJournalEntries();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const loadTodoLists = async () => {
        try {
            setLoading(true);
            const lists = await apiService.getTodoLists();
            setTodoLists(lists);
            if (lists.length > 0 && !currentList) {
                setCurrentList(lists[0]);
            }
        } catch (error) {
            console.error('Error loading todo lists:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadJournalEntries = async () => {
        try {
            const entries = await apiService.getJournalEntries();
            setJournalEntries(entries);
        } catch (error) {
            console.error('Error loading journal entries:', error);
        }
    };

    const createTodoList = async () => {
        if (!newListTitle.trim()) return;

        try {
            const newList = await apiService.createTodoList({
                title: newListTitle,
                description: newListDescription,
                priority: newListPriority,
                items: []
            });

            setTodoLists(prev => [newList, ...prev]);
            setCurrentList(newList);
            setNewListTitle('');
            setNewListDescription('');
            setNewListPriority('Medium');
            setShowCreateList(false);
        } catch (error) {
            console.error('Error creating todo list:', error);
        }
    };

    const addTodoItem = async () => {
        if (!newItemContent.trim() || !currentList) return;

        try {
            const newItem = await apiService.createTodoItem(currentList.id, {
                content: newItemContent,
                item_type: newItemType,
                estimated_time: newItemTime
            });

            setTodoLists(prev => prev.map(list => 
                list.id === currentList.id 
                    ? { ...list, items: [...(list.items || []), newItem] }
                    : list
            ));
            setCurrentList(prev => ({
                ...prev,
                items: [...(prev.items || []), newItem]
            }));

            setNewItemContent('');
            setNewItemType('bullet');
            setNewItemTime(0);
        } catch (error) {
            console.error('Error adding todo item:', error);
        }
    };

    const toggleTodoItem = async (itemId) => {
        if (!currentList) return;

        try {
            const updatedItem = await apiService.updateTodoItem(itemId, {
                completed: !currentList.items.find(item => item.id === itemId)?.completed
            });

            setTodoLists(prev => prev.map(list => 
                list.id === currentList.id 
                    ? { ...list, items: list.items.map(item => 
                        item.id === itemId ? updatedItem : item
                    )}
                    : list
            ));
            setCurrentList(prev => ({
                ...prev,
                items: prev.items.map(item => 
                    item.id === itemId ? updatedItem : item
                )
            }));
        } catch (error) {
            console.error('Error toggling todo item:', error);
        }
    };

    const deleteTodoItem = async (itemId) => {
        if (!currentList) return;

        try {
            await apiService.deleteTodoItem(itemId);
            setTodoLists(prev => prev.map(list => 
                list.id === currentList.id 
                    ? { ...list, items: list.items.filter(item => item.id !== itemId) }
                    : list
            ));
            setCurrentList(prev => ({
                ...prev,
                items: prev.items.filter(item => item.id !== itemId)
            }));
        } catch (error) {
            console.error('Error deleting todo item:', error);
        }
    };

    const deleteTodoList = async (listId) => {
        try {
            await apiService.deleteTodoList(listId);
            setTodoLists(prev => prev.filter(list => list.id !== listId));
            if (currentList?.id === listId) {
                setCurrentList(todoLists.find(list => list.id !== listId) || null);
            }
        } catch (error) {
            console.error('Error deleting todo list:', error);
        }
    };

    const getOptimization = async () => {
        if (!currentList) return;

        try {
            setLoadingOptimization(true);
            const optimization = await apiService.getTodoOptimization(
                currentList,
                `User has ${todoLists.length} todo lists with various priorities and time estimates.`
            );
            setOptimizationData(optimization);
            setShowOptimizationModal(true);
        } catch (error) {
            console.error('Error getting optimization:', error);
        } finally {
            setLoadingOptimization(false);
        }
    };

    const applyOptimization = async () => {
        if (!optimizationData || !currentList) return;

        try {
            // Get the optimized order from the AI response
            const optimizedItemIds = optimizationData.priorityOptimization.reorderedTasks;
            
            // Create a new list with items in the optimized order
            const optimizedItems = optimizedItemIds.map(itemId => 
                currentList.items.find(item => item.id === itemId)
            ).filter(Boolean);

            // Update the current list with the optimized order
            const updatedList = {
                ...currentList,
                items: optimizedItems
            };

            // Update the state to reflect the new order
            setTodoLists(prev => prev.map(list => 
                list.id === currentList.id ? updatedList : list
            ));
            setCurrentList(updatedList);

            // Close the modal and clear optimization data
            setShowOptimizationModal(false);
            setOptimizationData(null);
            
            console.log('Optimization applied successfully! Items reordered based on AI suggestions.');
        } catch (error) {
            console.error('Error applying optimization:', error);
        }
    };

    const createJournalEntry = async () => {
        if (!journalTitle.trim() || !journalContent.trim()) return;

        try {
            const newEntry = await apiService.createJournalEntry({
                title: journalTitle,
                content: journalContent,
                entry_date: new Date().toISOString().split('T')[0]
            });

            setJournalEntries(prev => [newEntry, ...prev]);
            setJournalTitle('');
            setJournalContent('');
            setShowJournal(false);
        } catch (error) {
            console.error('Error creating journal entry:', error);
        }
    };

    const formatTime = (minutes) => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High': return 'text-red-600 bg-red-100';
            case 'Medium': return 'text-yellow-600 bg-yellow-100';
            case 'Low': return 'text-green-600 bg-green-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-6 shadow-xl border border-white/30">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-2xl shadow-lg">
                        <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            Todo Lists
                        </h2>
                        <p className="text-sm text-gray-600">Organize tasks and track your progress</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setShowCreateList(true)}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-300 flex items-center space-x-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New List</span>
                    </button>
                </div>
            </div>

            {/* Todo Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lists Sidebar */}
                <div className="lg:col-span-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Your Lists</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {todoLists.map(list => (
                            <div
                                key={list.id}
                                className={`p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                                    currentList?.id === list.id
                                        ? 'bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300 shadow-lg'
                                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                                }`}
                                onClick={() => setCurrentList(list)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-800 truncate">{list.title}</h4>
                                        <p className="text-sm text-gray-600 truncate">{list.description}</p>
                                        <div className="flex items-center space-x-2 mt-2">
                                            <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(list.priority)}`}>
                                                {list.priority}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {list.items?.filter(item => item.completed).length || 0}/{list.items?.length || 0}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteTodoList(list.id);
                                        }}
                                        className="text-red-400 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Current List */}
                <div className="lg:col-span-2">
                    {currentList ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">{currentList.title}</h3>
                                    <p className="text-gray-600">{currentList.description}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={getOptimization}
                                        disabled={loadingOptimization}
                                        className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-300 flex items-center space-x-2 disabled:opacity-50"
                                    >
                                        <Brain className="w-4 h-4" />
                                        <span>{loadingOptimization ? 'Analyzing...' : 'Optimize'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Add New Item */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="flex items-center space-x-4 mb-3">
                                    <input
                                        type="text"
                                        value={newItemContent}
                                        onChange={(e) => setNewItemContent(e.target.value)}
                                        placeholder="Add a new task..."
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
                                        onKeyPress={(e) => e.key === 'Enter' && addTodoItem()}
                                    />
                                    <select
                                        value={newItemType}
                                        onChange={(e) => setNewItemType(e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    >
                                        <option value="bullet">• Bullet</option>
                                        <option value="numbered">1. Numbered</option>
                                    </select>
                                    <input
                                        type="number"
                                        value={newItemTime}
                                        onChange={(e) => setNewItemTime(parseInt(e.target.value) || 0)}
                                        placeholder="Time (min)"
                                        className="w-20 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    />
                                    <button
                                        onClick={addTodoItem}
                                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Todo Items */}
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {currentList.items?.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className={`flex items-center space-x-3 p-4 rounded-xl transition-all duration-300 ${
                                            item.completed
                                                ? 'bg-green-50 border border-green-200'
                                                : 'bg-white border border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        <button
                                            onClick={() => toggleTodoItem(item.id)}
                                            className="flex-shrink-0"
                                        >
                                            {item.completed ? (
                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                            ) : (
                                                <Circle className="w-5 h-5 text-gray-400 hover:text-purple-500" />
                                            )}
                                        </button>
                                        <div className="flex-1">
                                            <span
                                                className={`${
                                                    item.completed ? 'line-through text-gray-500' : 'text-gray-800'
                                                }`}
                                            >
                                                {item.item_type === 'numbered' ? `${index + 1}. ` : '• '}
                                                {item.content}
                                            </span>
                                            {item.estimated_time > 0 && (
                                                <div className="flex items-center space-x-1 mt-1">
                                                    <Clock className="w-3 h-3 text-gray-400" />
                                                    <span className="text-xs text-gray-500">
                                                        {formatTime(item.estimated_time)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => deleteTodoItem(item.id)}
                                            className="text-red-400 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">No todo list selected</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create List Modal */}
            {showCreateList && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl border border-white/30">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-gray-800">Create New Todo List</h3>
                            <button
                                onClick={() => setShowCreateList(false)}
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
                                    value={newListTitle}
                                    onChange={(e) => setNewListTitle(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    placeholder="Enter list title..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={newListDescription}
                                    onChange={(e) => setNewListDescription(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    rows={3}
                                    placeholder="Enter description..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                                <select
                                    value={newListPriority}
                                    onChange={(e) => setNewListPriority(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>

                            <div className="flex space-x-4 pt-4">
                                <button
                                    onClick={createTodoList}
                                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                                >
                                    Create List
                                </button>
                                <button
                                    onClick={() => setShowCreateList(false)}
                                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Journal Modal */}
            {showJournal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-white/30">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-gray-800">Journal Entries</h3>
                            <button
                                onClick={() => setShowJournal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Journal Entries List */}
                            <div>
                                <h4 className="text-lg font-bold text-gray-800 mb-4">Recent Entries</h4>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {journalEntries.map(entry => (
                                        <div
                                            key={entry.id}
                                            className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-300"
                                        >
                                            <h5 className="font-medium text-gray-800">{entry.title}</h5>
                                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                {entry.content}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-2">
                                                {new Date(entry.entry_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* New Entry Form */}
                            <div>
                                <h4 className="text-lg font-bold text-gray-800 mb-4">New Entry</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                                        <input
                                            type="text"
                                            value={journalTitle}
                                            onChange={(e) => setJournalTitle(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
                                            placeholder="Entry title..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                                        <textarea
                                            value={journalContent}
                                            onChange={(e) => setJournalContent(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
                                            rows={8}
                                            placeholder="Write your thoughts, goals, or reflections..."
                                        />
                                    </div>
                                    <button
                                        onClick={createJournalEntry}
                                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                                    >
                                        Save Entry
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Optimization Modal */}
            {showOptimizationModal && optimizationData && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-white/30">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-3">
                                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 rounded-2xl">
                                    <Brain className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800">AI Optimization Suggestions</h3>
                            </div>
                            <button
                                onClick={() => setShowOptimizationModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Goal Summary */}
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6">
                                <h4 className="font-bold text-purple-800 text-lg mb-3 flex items-center">
                                    <Target className="w-5 h-5 mr-2" />
                                    Goal Summary
                                </h4>
                                <p className="text-purple-700">{optimizationData.goalSummary}</p>
                            </div>

                            {/* Time Management */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
                                <h4 className="font-bold text-blue-800 text-lg mb-3 flex items-center">
                                    <Clock className="w-5 h-5 mr-2" />
                                    Time Management
                                </h4>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm font-medium text-blue-700">Estimated Total Time:</p>
                                        <p className="text-blue-800 font-bold">{optimizationData.timeManagement.estimatedTotalTime}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-blue-700">Recommended Schedule:</p>
                                        <p className="text-blue-800">{optimizationData.timeManagement.recommendedSchedule}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-blue-700">Suggestions:</p>
                                        <ul className="list-disc list-inside text-blue-700 space-y-1">
                                            {optimizationData.timeManagement.suggestions.map((suggestion, index) => (
                                                <li key={index} className="text-sm">{suggestion}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Priority Optimization */}
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
                                <h4 className="font-bold text-green-800 text-lg mb-3 flex items-center">
                                    <Zap className="w-5 h-5 mr-2" />
                                    Priority Optimization
                                </h4>
                                <p className="text-green-700 mb-3">{optimizationData.priorityOptimization.reasoning}</p>
                                <div className="bg-white/50 rounded-xl p-4">
                                    <p className="text-sm font-medium text-green-700 mb-2">Recommended Order:</p>
                                    <div className="space-y-2">
                                        {optimizationData.priorityOptimization.reorderedTasks.map((itemId, index) => {
                                            const item = currentList?.items.find(item => item.id === itemId);
                                            return item ? (
                                                <div key={itemId} className="flex items-center space-x-2">
                                                    <span className="text-sm font-medium text-green-600">{index + 1}.</span>
                                                    <span className="text-sm text-green-700">{item.content}</span>
                                                </div>
                                            ) : null;
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Efficiency Tips */}
                            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6">
                                <h4 className="font-bold text-yellow-800 text-lg mb-3 flex items-center">
                                    <AlertTriangle className="w-5 h-5 mr-2" />
                                    Efficiency Tips
                                </h4>
                                <ul className="list-disc list-inside text-yellow-700 space-y-1">
                                    {optimizationData.efficiencyTips.map((tip, index) => (
                                        <li key={index} className="text-sm">{tip}</li>
                                    ))}
                                </ul>
                            </div>

                            {/* Improvements */}
                            <div className="bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200 rounded-2xl p-6">
                                <h4 className="font-bold text-cyan-800 text-lg mb-3 flex items-center">
                                    <FileText className="w-5 h-5 mr-2" />
                                    Potential Improvements
                                </h4>
                                <ul className="list-disc list-inside text-cyan-700 space-y-1">
                                    {optimizationData.improvements.map((improvement, index) => (
                                        <li key={index} className="text-sm">{improvement}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="flex space-x-4 pt-6">
                            <button
                                onClick={applyOptimization}
                                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                            >
                                Apply Changes
                            </button>
                            <button
                                onClick={() => setShowOptimizationModal(false)}
                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-300"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TodoListWidget; 